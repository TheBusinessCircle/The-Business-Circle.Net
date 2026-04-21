import { createHash, randomBytes } from "node:crypto";
import { createElement } from "react";
import { PasswordChangedEmail, PasswordResetEmail } from "@/emails";
import { renderEmailHtml } from "@/emails/render";
import { buildBrandedEmailText } from "@/emails/text";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logServerWarning } from "@/lib/security/logging";
import { getBaseUrl } from "@/lib/utils";

const DEFAULT_RESET_TOKEN_TTL_MINUTES = 60;
const MIN_RESET_TOKEN_TTL_MINUTES = 15;
const MAX_RESET_TOKEN_TTL_MINUTES = 180;

type RequestPasswordResetInput = {
  email: string;
  requestedIp?: string | null;
};

type ConfirmPasswordResetInput = {
  email: string;
  token: string;
  password: string;
};

function resolveResetTokenTtlMinutes() {
  const configured = Number(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? DEFAULT_RESET_TOKEN_TTL_MINUTES
  );
  if (!Number.isFinite(configured)) {
    return DEFAULT_RESET_TOKEN_TTL_MINUTES;
  }

  const bounded = Math.max(
    MIN_RESET_TOKEN_TTL_MINUTES,
    Math.min(MAX_RESET_TOKEN_TTL_MINUTES, Math.floor(configured))
  );
  return bounded;
}

function createRawResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetTokenPair(now = new Date()) {
  const token = createRawResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const ttlMinutes = resolveResetTokenTtlMinutes();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  return {
    token,
    tokenHash,
    expiresAt,
    ttlMinutes
  };
}

function buildResetUrl(email: string, token: string) {
  const url = new URL("/reset-password", getBaseUrl());
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

function genericPasswordResetEmailNotice() {
  return {
    ok: true as const,
    message: "If an account exists with that email, a password reset link has been sent."
  };
}

export async function requestPasswordReset(input: RequestPasswordResetInput) {
  const email = normalizeEmail(input.email);
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      suspended: true,
      passwordHash: true
    }
  });

  if (!user || !user.passwordHash || user.suspended) {
    return genericPasswordResetEmailNotice();
  }

  const tokenPair = createPasswordResetTokenPair();

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenPair.tokenHash,
        expiresAt: tokenPair.expiresAt,
        requestedIp: input.requestedIp?.trim().slice(0, 64) || null
      }
    });
  });

  const resetUrl = buildResetUrl(user.email, tokenPair.token);
  const recipientName = user.name?.trim() || "Member";
  const emailTemplate = createElement(PasswordResetEmail, {
    firstName: recipientName,
    resetUrl,
    ttlMinutes: tokenPair.ttlMinutes
  });
  const html = await renderEmailHtml(emailTemplate);

  const sendResult = await sendTransactionalEmail({
    to: user.email,
    subject: "Reset your Business Circle password",
    text: buildBrandedEmailText({
      greeting: `Hi ${recipientName},`,
      eyebrow: "Password reset",
      heading: "Reset your password",
      bodyLines: [
        "We received a request to reset your password.",
        "Use the secure link below to set a new password and return to the platform."
      ],
      ctaLabel: "Reset your password",
      ctaUrl: resetUrl,
      fallbackNotice: "If the button does not work, copy and paste the link above into your browser.",
      noteLines: [
        `This reset link expires in ${tokenPair.ttlMinutes} minutes.`,
        "If you did not request this, you can safely ignore this email."
      ]
    }),
    html,
    react: emailTemplate,
    tags: [
      { name: "type", value: "password-reset" },
      { name: "source", value: "auth" }
    ]
  });

  if (!sendResult.sent && !sendResult.skipped) {
    logServerWarning("password-reset-email-delivery-failed");
  }

  return genericPasswordResetEmailNotice();
}

export async function confirmPasswordReset(input: ConfirmPasswordResetInput) {
  const email = normalizeEmail(input.email);
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true }
  });

  if (!user) {
    return { ok: false as const, error: "Reset link is invalid or has expired." };
  }

  const tokenHash = hashPasswordResetToken(input.token);
  const now = new Date();
  const token = await db.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now }
    },
    select: {
      id: true
    }
  });

  if (!token) {
    return { ok: false as const, error: "Reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(input.password);
  const usedAt = new Date();

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt }
    });

    await tx.session.deleteMany({
      where: { userId: user.id }
    });
  });

  const recipientName = user.name?.trim() || "Member";
  const loginUrl = new URL("/login", getBaseUrl()).toString();
  const emailTemplate = createElement(PasswordChangedEmail, {
    firstName: recipientName,
    loginUrl
  });
  const html = await renderEmailHtml(emailTemplate);

  const sendResult = await sendTransactionalEmail({
    to: user.email,
    subject: "Your password was changed",
    text: buildBrandedEmailText({
      greeting: `Hi ${recipientName},`,
      eyebrow: "Security update",
      heading: "Your password was changed",
      bodyLines: [
        "Your password was changed successfully.",
        "You can now sign back in to The Business Circle Network."
      ],
      ctaLabel: "Sign in",
      ctaUrl: loginUrl,
      fallbackNotice: "If the button does not work, copy and paste the link above into your browser.",
      noteLines: ["If this was not you, contact support immediately."]
    }),
    html,
    react: emailTemplate,
    tags: [
      { name: "type", value: "password-reset-confirmed" },
      { name: "source", value: "auth" }
    ]
  });

  if (!sendResult.sent && !sendResult.skipped) {
    logServerWarning("password-reset-confirmation-email-delivery-failed");
  }

  return { ok: true as const };
}
