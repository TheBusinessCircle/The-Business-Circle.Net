import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/auth/utils";
import { logServerWarning } from "@/lib/security/logging";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveAppUrl() {
  return process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
}

function resolveResetTokenTtlMinutes() {
  const configured = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? DEFAULT_RESET_TOKEN_TTL_MINUTES);
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
  const url = new URL("/reset-password", resolveAppUrl());
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

function genericPasswordResetEmailNotice() {
  return {
    ok: true as const,
    message:
      "If an account exists with that email, a password reset link has been sent."
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

  // Do not reveal whether this email exists.
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
  const safeName = escapeHtml(recipientName);
  const safeResetUrl = escapeHtml(resetUrl);

  const sendResult = await sendTransactionalEmail({
    to: user.email,
    subject: "Reset your Business Circle password",
    text: [
      `Hi ${recipientName},`,
      "",
      "We received a request to reset your password.",
      `Use this link to set a new password (expires in ${tokenPair.ttlMinutes} minutes):`,
      resetUrl,
      "",
      "If you did not request this, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2>Password reset request</h2>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your password.</p>
        <p>
          Use this secure link to set a new password (expires in ${tokenPair.ttlMinutes} minutes):
        </p>
        <p>
          <a href="${safeResetUrl}" target="_blank" rel="noopener noreferrer">${safeResetUrl}</a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
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

    // Session strategy is JWT today, but clear DB sessions as a defense-in-depth step.
    await tx.session.deleteMany({
      where: { userId: user.id }
    });
  });

  const recipientName = user.name?.trim() || "Member";
  const safeName = escapeHtml(recipientName);
  const loginUrl = new URL("/login", resolveAppUrl()).toString();

  const sendResult = await sendTransactionalEmail({
    to: user.email,
    subject: "Your password was changed",
    text: [
      `Hi ${recipientName},`,
      "",
      "Your password was changed successfully.",
      `You can now sign in here: ${loginUrl}`,
      "",
      "If this was not you, contact support immediately."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2>Password changed</h2>
        <p>Hi ${safeName},</p>
        <p>Your password was changed successfully.</p>
        <p>
          You can sign in here:
          <a href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(loginUrl)}</a>
        </p>
        <p>If this was not you, contact support immediately.</p>
      </div>
    `,
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
