import { Resend } from "resend";
import type { ReactNode } from "react";

export type SendTransactionalEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: ReactNode;
  from?: string;
  replyTo?: string | string[];
  tags?: Array<{ name: string; value: string }>;
};

export type SendTransactionalEmailResult = {
  sent: boolean;
  skipped: boolean;
  id?: string | null;
  reason?: string;
};

export type ResolvedTransactionalRecipients = {
  to: string | string[];
  redirected: boolean;
  originalTo: string[];
  redirectTo: string[];
};

export class TransactionalEmailError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TransactionalEmailError";
    this.code = code;
  }
}

let resendClient: Resend | null | undefined;

export function getResendClient(): Resend | null {
  if (resendClient !== undefined) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    resendClient = null;
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function isResendDevAddress(value: string) {
  return /@resend\.dev>/i.test(value) || /@resend\.dev$/i.test(value);
}

function normalizeRecipients(value: string | string[]) {
  return (Array.isArray(value) ? value : [value]).map((recipient) => recipient.trim()).filter(Boolean);
}

function asResendRecipientValue(recipients: string[]) {
  return recipients.length === 1 ? recipients[0] : recipients;
}

export function resolveTransactionalRecipients(
  to: string | string[]
): ResolvedTransactionalRecipients {
  const originalTo = normalizeRecipients(to);
  const redirectTo = process.env.RESEND_REDIRECT_TO?.trim();

  if (!redirectTo) {
    return {
      to,
      redirected: false,
      originalTo,
      redirectTo: []
    };
  }

  const redirectRecipients = normalizeRecipients(redirectTo.split(","));
  if (!redirectRecipients.length) {
    throw new TransactionalEmailError(
      "EMAIL_REDIRECT_INVALID",
      "RESEND_REDIRECT_TO is configured but empty."
    );
  }

  return {
    to: asResendRecipientValue(redirectRecipients),
    redirected: true,
    originalTo,
    redirectTo: redirectRecipients
  };
}

export function resolveTransactionalFromAddress(overrideFrom?: string) {
  const from = overrideFrom?.trim() || process.env.RESEND_FROM_EMAIL?.trim();

  if (from) {
    if (process.env.NODE_ENV === "production" && isResendDevAddress(from)) {
      return {
        value: null,
        reason: "RESEND_FROM_EMAIL must use your verified domain in production."
      };
    }

    return {
      value: from,
      reason: null
    };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      value: null,
      reason: "RESEND_FROM_EMAIL is not configured."
    };
  }

  return {
    value: "The Business Circle Network <onboarding@resend.dev>",
    reason: null
  };
}

export async function sendTransactionalEmailOrThrow(
  input: SendTransactionalEmailInput
) {
  const client = getResendClient();
  const hasRenderableContent = Boolean(input.react || input.html || input.text);
  const fromAddress = resolveTransactionalFromAddress(input.from);
  const recipients = resolveTransactionalRecipients(input.to);

  if (!client) {
    throw new TransactionalEmailError("RESEND_API_KEY_MISSING", "RESEND_API_KEY is not configured.");
  }

  if (!hasRenderableContent) {
    throw new TransactionalEmailError(
      "EMAIL_BODY_MISSING",
      "Email body is required (react, html, or text)."
    );
  }

  if (!fromAddress.value) {
    throw new TransactionalEmailError(
      "EMAIL_FROM_INVALID",
      fromAddress.reason || "RESEND_FROM_EMAIL is not configured."
    );
  }

  const result = await client.emails.send({
    from: fromAddress.value,
    to: recipients.to,
    subject: input.subject,
    react: input.react,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    tags: input.tags
  });

  if (result.error) {
    throw new TransactionalEmailError("RESEND_SEND_FAILED", result.error.message);
  }

  return {
    id: result.data?.id ?? null
  };
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
  try {
    const result = await sendTransactionalEmailOrThrow(input);

    return {
      sent: true,
      skipped: false,
      id: result.id
    };
  } catch (error) {
    if (error instanceof TransactionalEmailError) {
      return {
        sent: false,
        skipped: error.code === "RESEND_API_KEY_MISSING",
        reason: error.message
      };
    }

    return {
      sent: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Unknown email delivery error."
    };
  }
}
