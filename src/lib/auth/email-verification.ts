import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { createElement } from "react";
import { VerifyEmailAddressEmail } from "@/emails";
import { renderEmailHtml } from "@/emails/render";
import { buildBrandedEmailText } from "@/emails/text";
import type { RuntimeBrandKey } from "@/config/runtime-brand";
import {
  buildAuthenticationUrl,
  requireAuthenticationBrand
} from "@/lib/auth/brand";
import { db } from "@/lib/db";
import { sendTransactionalEmailOrThrow } from "@/lib/email/resend";
import { logServerError, logServerInfo, logServerWarning } from "@/lib/security/logging";

const DEFAULT_VERIFICATION_TOKEN_TTL_HOURS = 48;
const SERIALIZABLE_RETRY_ATTEMPTS = 3;

type SendVerificationEmailInput = {
  brand: RuntimeBrandKey;
  userId: string;
  email: string;
  firstName?: string | null;
};

type VerifyEmailTokenInput = {
  brand: RuntimeBrandKey;
  userId: string;
  token: string;
};

type ResendVerificationEmailResult = {
  sent: boolean;
  skipped: boolean;
  reason?: string;
  messageId?: string | null;
};

function verificationIdentifier(userId: string, brand: RuntimeBrandKey) {
  requireAuthenticationBrand(brand);
  return brand === "bcn"
    ? `verify-email:${userId}`
    : `verify-email:${brand}:${userId}`;
}

function resolveVerificationTokenTtlHours() {
  const configured = Number(
    process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS ??
      DEFAULT_VERIFICATION_TOKEN_TTL_HOURS
  );
  if (!Number.isFinite(configured)) {
    return DEFAULT_VERIFICATION_TOKEN_TTL_HOURS;
  }

  return Math.max(6, Math.min(168, Math.floor(configured)));
}

function createVerificationToken() {
  return randomBytes(32).toString("hex");
}

function isSerializableConflictError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function runSerializableVerificationTokenTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (!isSerializableConflictError(error) || attempt === SERIALIZABLE_RETRY_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error("Unable to replace the email verification token.");
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildEmailVerificationUrl(
  brand: RuntimeBrandKey,
  userId: string,
  token: string
) {
  return buildAuthenticationUrl(brand, "/api/auth/verify-email", {
    uid: userId,
    token
  }).toString();
}

function buildVerificationEmailText(
  brand: RuntimeBrandKey,
  firstName: string,
  verificationUrl: string,
  ttlHours: number
) {
  const productName = requireAuthenticationBrand(brand).displayName;
  return buildBrandedEmailText({
    greeting: `Hi ${firstName},`,
    eyebrow: "Email verification",
    heading: "Confirm your email address",
    bodyLines: [
      brand === "circle-card"
        ? "You are one step away from completing your Circle Card account."
        : "You are one step away from full access to The Business Circle Network.",
      brand === "circle-card"
        ? "Confirm your email address to continue to your card, wallet and relationship tools."
        : "Confirm your email address to unlock your member access and continue inside the platform."
    ],
    ctaLabel: "Verify your email",
    ctaUrl: verificationUrl,
    fallbackNotice: "If the button does not work, copy and paste the link above into your browser.",
    noteLines: [
      `This verification link expires in ${ttlHours} hours.`,
      "For security, only the most recent verification email remains valid. Older links expire automatically."
    ],
    footerName: productName
  });
}

async function sendVerificationEmailMessage(input: {
  userId: string;
  brand: RuntimeBrandKey;
  email: string;
  firstName: string;
  verificationUrl: string;
  ttlHours: number;
}): Promise<ResendVerificationEmailResult> {
  const brand = requireAuthenticationBrand(input.brand);
  const text = buildVerificationEmailText(
    brand.key,
    input.firstName,
    input.verificationUrl,
    input.ttlHours
  );
  const emailTemplate = createElement(VerifyEmailAddressEmail, {
    brand: brand.key,
    firstName: input.firstName,
    verificationUrl: input.verificationUrl,
    ttlHours: input.ttlHours
  });
  const html = await renderEmailHtml(emailTemplate);

  logServerInfo("verify-email-send-started", { userId: input.userId });

  try {
    const result = await sendTransactionalEmailOrThrow({
      to: input.email,
      subject:
        brand.key === "circle-card"
          ? "Verify your Circle Card email"
          : "Verify your Business Circle email",
      text,
      html,
      react: emailTemplate,
      tags: [
        { name: "type", value: "email-verification" },
        { name: "source", value: "auth" }
      ]
    });

    return {
      sent: true,
      skipped: false,
      messageId: result.id
    };
  } catch (error) {
    logServerError("verify-email-send-react-failed", error, {
      userId: input.userId,
      stage: "react"
    });
    logServerInfo("verify-email-send-fallback-started", { userId: input.userId });

    try {
      const fallbackResult = await sendTransactionalEmailOrThrow({
        to: input.email,
        subject:
          brand.key === "circle-card"
            ? "Verify your Circle Card email"
            : "Verify your Business Circle email",
        text,
        html,
        tags: [
          { name: "type", value: "email-verification" },
          { name: "source", value: "auth" },
          { name: "fallback", value: "html-text" }
        ]
      });

      return {
        sent: true,
        skipped: false,
        messageId: fallbackResult.id
      };
    } catch (fallbackError) {
      logServerError("verify-email-send-fallback-failed", fallbackError, {
        userId: input.userId,
        stage: "fallback"
      });

      return {
        sent: false,
        skipped: false,
        reason: "Email delivery is temporarily unavailable."
      };
    }
  }
}

export async function sendEmailVerificationForUser(
  input: SendVerificationEmailInput
) {
  const brand = requireAuthenticationBrand(input.brand);
  const ttlHours = resolveVerificationTokenTtlHours();
  const identifier = verificationIdentifier(input.userId, brand.key);
  const firstName = input.firstName?.trim() || "Member";

  logServerInfo("verify-email-token-generation-started", { userId: input.userId });

  let rawToken: string;
  let tokenHash: string;
  let expires: Date;

  try {
    rawToken = createVerificationToken();
    tokenHash = hashEmailVerificationToken(rawToken);
    expires = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await runSerializableVerificationTokenTransaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: {
          identifier
        }
      });

      await tx.verificationToken.create({
        data: {
          identifier,
          token: tokenHash,
          expires
        }
      });
    });
  } catch (error) {
    logServerError("verify-email-token-create-failed", error, {
      userId: input.userId
    });
    throw error;
  }

  logServerInfo("verify-email-token-created", {
    userId: input.userId,
    expiresAt: expires.toISOString()
  });

  const verificationUrl = buildEmailVerificationUrl(
    brand.key,
    input.userId,
    rawToken
  );
  logServerInfo("verify-email-url-created", { userId: input.userId });

  const sendResult = await sendVerificationEmailMessage({
    userId: input.userId,
    brand: brand.key,
    email: input.email,
    firstName,
    verificationUrl,
    ttlHours
  });

  if (!sendResult.sent) {
    logServerWarning("verification-email-delivery-failed", {
      userId: input.userId,
      skipped: sendResult.skipped,
      reason: sendResult.reason
    });
  } else {
    await db.user.update({
      where: {
        id: input.userId
      },
      data: {
        verificationEmailLastSentAt: new Date(),
        verificationEmailSendCount: {
          increment: 1
        }
      }
    });
    logServerInfo("verify-email-send-succeeded", {
      userId: input.userId,
      hasMessageId: Boolean(sendResult.messageId)
    });
  }

  return sendResult;
}

export async function resendVerificationEmail(
  userId: string,
  brand: RuntimeBrandKey
): Promise<ResendVerificationEmailResult> {
  requireAuthenticationBrand(brand);
  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true
    }
  });

  if (!user) {
    logServerWarning("verify-email-resend-skipped", {
      userId,
      reason: "user-not-found"
    });
    return {
      sent: false,
      skipped: true,
      reason: "User not found."
    };
  }

  if (user.emailVerified) {
    logServerInfo("verify-email-resend-skipped", {
      userId: user.id,
      reason: "already-verified"
    });
    return {
      sent: true,
      skipped: true,
      reason: "User already verified."
    };
  }

  return sendEmailVerificationForUser({
    brand,
    userId: user.id,
    email: user.email,
    firstName: user.name?.trim().split(/\s+/)[0] || "Member"
  });
}

export async function verifyEmailToken(input: VerifyEmailTokenInput) {
  const brand = requireAuthenticationBrand(input.brand);
  logServerInfo("verify-email-token-received", { userId: input.userId });

  const tokenHash = hashEmailVerificationToken(input.token);
  const identifier = verificationIdentifier(input.userId, brand.key);
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      emailVerified: true
    }
  });

  if (!user) {
    logServerWarning("verify-email-verification-failed", {
      userId: input.userId,
      reason: "user-not-found"
    });
    return false;
  }

  if (user.emailVerified) {
    await db.verificationToken.deleteMany({
      where: {
        identifier
      }
    });
    logServerInfo("verify-email-verification-already-complete", {
      userId: input.userId
    });
    return false;
  }

  const verified = await db.$transaction(async (tx) => {
    const consumed = await tx.verificationToken.deleteMany({
      where: {
        identifier,
        token: tokenHash,
        expires: { gt: new Date() }
      }
    });
    if (consumed.count !== 1) return false;

    await tx.user.update({
      where: { id: input.userId },
      data: {
        emailVerified: new Date()
      }
    });

    await tx.verificationToken.deleteMany({
      where: {
        identifier
      }
    });
    return true;
  });

  if (!verified) {
    logServerWarning("verify-email-verification-failed", {
      userId: input.userId,
      reason: "token-invalid-expired-or-consumed"
    });
    return false;
  }

  logServerInfo("verify-email-user-verified", { userId: input.userId });
  return verified;
}
