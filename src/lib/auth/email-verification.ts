import { createHash, randomBytes } from "node:crypto";
import { createElement } from "react";
import { VerifyEmailAddressEmail } from "@/emails";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logServerWarning } from "@/lib/security/logging";
import { getBaseUrl } from "@/lib/utils";

const DEFAULT_VERIFICATION_TOKEN_TTL_HOURS = 48;

type SendVerificationEmailInput = {
  userId: string;
  email: string;
  firstName?: string | null;
};

type VerifyEmailTokenInput = {
  userId: string;
  token: string;
};

function verificationIdentifier(userId: string) {
  return `verify-email:${userId}`;
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

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildVerificationUrl(userId: string, token: string) {
  const url = new URL("/api/auth/verify-email", getBaseUrl());
  url.searchParams.set("uid", userId);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendEmailVerificationForUser(
  input: SendVerificationEmailInput
) {
  const rawToken = createVerificationToken();
  const tokenHash = hashEmailVerificationToken(rawToken);
  const ttlHours = resolveVerificationTokenTtlHours();
  const expires = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const identifier = verificationIdentifier(input.userId);

  await db.$transaction(async (tx) => {
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

  const firstName = input.firstName?.trim() || "Member";
  const verificationUrl = buildVerificationUrl(input.userId, rawToken);

  const sendResult = await sendTransactionalEmail({
    to: input.email,
    subject: "Verify your Business Circle email",
    text: [
      `Hi ${firstName},`,
      "",
      "Please verify your email address to complete your account setup:",
      verificationUrl,
      "",
      `This link expires in ${ttlHours} hours.`
    ].join("\n"),
    react: createElement(VerifyEmailAddressEmail, {
      firstName,
      verificationUrl
    }),
    tags: [
      { name: "type", value: "email-verification" },
      { name: "source", value: "auth" }
    ]
  });

  if (!sendResult.sent && !sendResult.skipped) {
    logServerWarning("verification-email-delivery-failed");
  }

  return sendResult;
}

export async function verifyEmailToken(input: VerifyEmailTokenInput) {
  const tokenHash = hashEmailVerificationToken(input.token);
  const identifier = verificationIdentifier(input.userId);
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      emailVerified: true
    }
  });

  if (!user) {
    return false;
  }

  if (user.emailVerified) {
    await db.verificationToken.deleteMany({
      where: {
        identifier
      }
    });
    return true;
  }

  const token = await db.verificationToken.findFirst({
    where: {
      identifier,
      token: tokenHash,
      expires: {
        gt: new Date()
      }
    },
    select: {
      token: true
    }
  });

  if (!token) {
    return false;
  }

  await db.$transaction(async (tx) => {
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
  });

  return true;
}
