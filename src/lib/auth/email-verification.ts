import { createHash, randomBytes } from "node:crypto";
import { createElement } from "react";
import { VerifyEmailAddressEmail } from "@/emails";
import { db } from "@/lib/db";
import { sendTransactionalEmailOrThrow } from "@/lib/email/resend";
import { logServerError, logServerWarning } from "@/lib/security/logging";
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

type ResendVerificationEmailResult = {
  sent: boolean;
  skipped: boolean;
  reason?: string;
  messageId?: string | null;
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

function buildVerificationEmailText(firstName: string, verificationUrl: string, ttlHours: number) {
  return [
    `Hi ${firstName},`,
    "",
    "EMAIL VERIFICATION",
    "Confirm your email address",
    "",
    "You are one step away from full access to The Business Circle Network.",
    "Confirm your email address to unlock your member access and continue inside the platform.",
    "",
    `Verification link: ${verificationUrl}`,
    "",
    "If the button does not work, copy and paste the link above into your browser.",
    "",
    `This verification link expires in ${ttlHours} hours.`,
    "For security, only the most recent verification email remains valid. Older links expire automatically.",
    "",
    "The Business Circle Network"
  ].join("\n");
}

function buildVerificationEmailHtml(
  firstName: string,
  verificationUrl: string,
  ttlHours: number,
  logoUrl: string
) {
  return `
    <div style="margin:0;padding:32px 16px;background-color:#07111f;color:#f8fafc;font-family:Arial,sans-serif;">
      <div style="margin:0 auto;max-width:560px;">
        <div style="margin-bottom:20px;text-align:center;">
          <img
            src="${logoUrl}"
            alt="The Business Circle Network"
            width="84"
            height="84"
            style="display:inline-block;width:84px;height:84px;border-radius:9999px;border:1px solid rgba(209,168,97,0.45);background-color:#020817;object-fit:contain;"
          />
        </div>
        <div style="border-radius:28px;border:1px solid rgba(209,168,97,0.22);background:linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(7,17,31,0.98) 100%);box-shadow:0 24px 60px rgba(2,6,23,0.45);padding:36px 28px;">
          <p style="margin:0 0 14px;color:#d1a861;font-size:12px;font-weight:700;letter-spacing:0.18em;text-align:center;">
            EMAIL VERIFICATION
          </p>
          <h1 style="margin:0 0 14px;color:#f8fafc;font-size:32px;font-weight:700;line-height:1.15;text-align:center;">
            Confirm your email address
          </h1>
          <p style="margin:0 0 28px;color:#94a3b8;font-size:16px;line-height:1.65;text-align:center;">
            Hi ${firstName}, you are one step away from full access to The Business Circle Network.
            Confirm your email address to unlock your member access and continue inside the platform.
          </p>
          <div style="margin-bottom:28px;text-align:center;">
            <a
              href="${verificationUrl}"
              target="_blank"
              rel="noopener noreferrer"
              style="display:inline-block;border-radius:9999px;background-color:#d1a861;color:#07111f;font-size:16px;font-weight:700;line-height:1;padding:16px 28px;text-decoration:none;"
            >
              Verify your email
            </a>
          </div>
          <div style="border-radius:20px;border:1px solid rgba(148,163,184,0.18);background-color:rgba(15,23,42,0.7);padding:18px 18px 16px;margin-bottom:18px;">
            <p style="margin:0 0 10px;color:#e2e8f0;font-size:13px;font-weight:700;letter-spacing:0.08em;">
              If the button does not work
            </p>
            <p style="margin:0 0 10px;color:#94a3b8;font-size:14px;line-height:1.6;">
              Copy and paste the link below into your browser.
            </p>
            <p style="margin:0;word-break:break-all;">
              <a
                href="${verificationUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="color:#d1a861;font-size:13px;line-height:1.6;text-decoration:underline;"
              >
                ${verificationUrl}
              </a>
            </p>
          </div>
          <p style="margin:0 0 6px;color:#cbd5e1;font-size:13px;line-height:1.6;text-align:center;">
            This verification link expires in ${ttlHours} hours.
          </p>
          <p style="margin:0 0 6px;color:#cbd5e1;font-size:13px;line-height:1.6;text-align:center;">
            For security, only the most recent verification email remains valid. Older links expire automatically.
          </p>
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">
            The Business Circle Network
          </p>
        </div>
      </div>
    </div>
  `.trim();
}

async function sendVerificationEmailMessage(input: {
  userId: string;
  email: string;
  firstName: string;
  verificationUrl: string;
  ttlHours: number;
}): Promise<ResendVerificationEmailResult> {
  const logoUrl = new URL("/branding/the-business-circle-logo.png", getBaseUrl()).toString();
  const text = buildVerificationEmailText(input.firstName, input.verificationUrl, input.ttlHours);
  const html = buildVerificationEmailHtml(
    input.firstName,
    input.verificationUrl,
    input.ttlHours,
    logoUrl
  );

  console.info("[verify-email] starting send", {
    userId: input.userId,
    email: input.email
  });

  try {
    const result = await sendTransactionalEmailOrThrow({
      to: input.email,
      subject: "Verify your Business Circle email",
      text,
      html,
      react: createElement(VerifyEmailAddressEmail, {
        firstName: input.firstName,
        verificationUrl: input.verificationUrl,
        logoUrl
      }),
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
    const reactErrorMessage = error instanceof Error ? error.message : "Unknown verification email error.";
    console.error("[verify-email] send failed", {
      userId: input.userId,
      email: input.email,
      stage: "react",
      error: reactErrorMessage
    });
    logServerError("verify-email-send-react-failed", error, {
      userId: input.userId,
      email: input.email
    });
    console.info("[verify-email] retrying send with html/text fallback", {
      userId: input.userId,
      email: input.email
    });

    try {
      const fallbackResult = await sendTransactionalEmailOrThrow({
        to: input.email,
        subject: "Verify your Business Circle email",
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
      const fallbackErrorMessage =
        fallbackError instanceof Error ? fallbackError.message : "Unknown fallback email error.";
      console.error("[verify-email] send failed", {
        userId: input.userId,
        email: input.email,
        stage: "fallback",
        error: fallbackErrorMessage
      });
      logServerError("verify-email-send-fallback-failed", fallbackError, {
        userId: input.userId,
        email: input.email
      });

      return {
        sent: false,
        skipped: false,
        reason: fallbackErrorMessage
      };
    }
  }
}

export async function sendEmailVerificationForUser(
  input: SendVerificationEmailInput
) {
  const ttlHours = resolveVerificationTokenTtlHours();
  const identifier = verificationIdentifier(input.userId);
  const firstName = input.firstName?.trim() || "Member";

  console.info("[verify-email] generating token", {
    userId: input.userId,
    email: input.email
  });

  let rawToken: string;
  let tokenHash: string;
  let expires: Date;

  try {
    rawToken = createVerificationToken();
    tokenHash = hashEmailVerificationToken(rawToken);
    expires = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

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
  } catch (error) {
    console.error("[verify-email] token creation failed", {
      userId: input.userId,
      email: input.email,
      error: error instanceof Error ? error.message : "Unknown token generation error."
    });
    logServerError("verify-email-token-create-failed", error, {
      userId: input.userId,
      email: input.email
    });
    throw error;
  }

  console.info("[verify-email] token created", {
    userId: input.userId,
    email: input.email,
    expiresAt: expires.toISOString()
  });

  const verificationUrl = buildVerificationUrl(input.userId, rawToken);
  console.info("[verify-email] verification url ready", {
    userId: input.userId,
    email: input.email,
    verificationUrl
  });

  const sendResult = await sendVerificationEmailMessage({
    userId: input.userId,
    email: input.email,
    firstName,
    verificationUrl,
    ttlHours
  });

  if (!sendResult.sent) {
    logServerWarning("verification-email-delivery-failed", {
      userId: input.userId,
      email: input.email,
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
    console.info("[verify-email] send success", {
      userId: input.userId,
      email: input.email,
      messageId: sendResult.messageId ?? null
    });
  }

  return sendResult;
}

export async function resendVerificationEmail(userId: string): Promise<ResendVerificationEmailResult> {
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
    console.warn("[verify-email] resend skipped", {
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
    console.info("[verify-email] resend skipped", {
      userId: user.id,
      email: user.email,
      reason: "already-verified"
    });
    return {
      sent: true,
      skipped: true,
      reason: "User already verified."
    };
  }

  return sendEmailVerificationForUser({
    userId: user.id,
    email: user.email,
    firstName: user.name?.trim().split(/\s+/)[0] || "Member"
  });
}

export async function verifyEmailToken(input: VerifyEmailTokenInput) {
  console.info("[verify-email] token received", {
    userId: input.userId
  });

  const tokenHash = hashEmailVerificationToken(input.token);
  const identifier = verificationIdentifier(input.userId);
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      emailVerified: true
    }
  });

  if (!user) {
    console.warn("[verify-email] verification failed", {
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
    console.info("[verify-email] verification already complete", {
      userId: input.userId,
      email: user.email
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
    console.warn("[verify-email] verification failed", {
      userId: input.userId,
      email: user.email,
      reason: "token-invalid-or-expired"
    });
    return false;
  }

  console.info("[verify-email] token valid", {
    userId: input.userId,
    email: user.email
  });
  console.info("[verify-email] marking user verified", {
    userId: input.userId,
    email: user.email
  });

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

  console.info("[verify-email] user verified", {
    userId: input.userId,
    email: user.email
  });
  return true;
}
