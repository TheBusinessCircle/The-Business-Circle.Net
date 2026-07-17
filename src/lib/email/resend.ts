import { Resend } from "resend";
import type { ReactNode } from "react";
import {
  EmailBrandConfigurationError,
  resolveEmailBrandIdentity,
  type EmailBrandKey
} from "@/lib/email/brand";

export type SendTransactionalEmailInput = {
  brand: EmailBrandKey;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: ReactNode;
  tags?: Array<{ name: string; value: string }>;
};

export type SendTransactionalEmailResult = {
  sent: boolean;
  skipped: boolean;
  id?: string | null;
  reason?: string;
};

export class TransactionalEmailError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TransactionalEmailError";
    this.code = code;
  }
}

type ResendClientCacheEntry = {
  apiKey: string;
  client: Resend;
};

const resendClients: Partial<Record<EmailBrandKey, ResendClientCacheEntry>> = {};

const RESEND_API_KEY_ENVIRONMENT_VARIABLES = {
  bcn: "RESEND_API_KEY",
  "circle-card": "CIRCLE_CARD_RESEND_API_KEY"
} as const satisfies Record<EmailBrandKey, string>;

export function getResendClient(brand: EmailBrandKey = "bcn"): Resend | null {
  if (!Object.prototype.hasOwnProperty.call(RESEND_API_KEY_ENVIRONMENT_VARIABLES, brand)) {
    return null;
  }

  const variableName = RESEND_API_KEY_ENVIRONMENT_VARIABLES[brand];
  const apiKey = process.env[variableName]?.trim();

  if (!apiKey) {
    return null;
  }

  const cached = resendClients[brand];
  if (cached?.apiKey === apiKey) {
    return cached.client;
  }

  const client = new Resend(apiKey);
  resendClients[brand] = { apiKey, client };
  return client;
}

function validateEmailSubject(subject: string) {
  if (!subject.trim() || subject.length > 998 || /[\u0000-\u001f\u007f]/.test(subject)) {
    throw new TransactionalEmailError(
      "EMAIL_SUBJECT_INVALID",
      "Email subject must be non-empty and must not contain control characters."
    );
  }
}

function assertProductionApiKeyIsolation() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const bcnApiKey = process.env.RESEND_API_KEY?.trim();
  const circleCardApiKey = process.env.CIRCLE_CARD_RESEND_API_KEY?.trim();

  if (bcnApiKey && circleCardApiKey && bcnApiKey === circleCardApiKey) {
    throw new TransactionalEmailError(
      "EMAIL_BRAND_API_KEY_REUSED",
      "Circle Card and BCN must use separate Resend API keys in production."
    );
  }
}

export function resolveTransactionalFromAddress() {
  try {
    return {
      value: resolveEmailBrandIdentity("bcn").sender,
      reason: null
    };
  } catch (error) {
    return {
      value: null,
      reason:
        error instanceof Error
          ? error.message
          : "RESEND_FROM_EMAIL is not configured."
    };
  }
}

export async function sendTransactionalEmailOrThrow(
  input: SendTransactionalEmailInput
) {
  let identity;
  try {
    identity = resolveEmailBrandIdentity(input.brand);
  } catch (error) {
    if (error instanceof EmailBrandConfigurationError) {
      throw new TransactionalEmailError(error.code, error.message);
    }
    throw error;
  }

  validateEmailSubject(input.subject);
  assertProductionApiKeyIsolation();
  const client = getResendClient(input.brand);
  const hasRenderableContent = Boolean(input.html || input.text);

  if (!client) {
    if (input.brand === "circle-card") {
      throw new TransactionalEmailError(
        "EMAIL_BRAND_API_KEY_MISSING",
        "CIRCLE_CARD_RESEND_API_KEY is not configured."
      );
    }

    throw new TransactionalEmailError(
      "RESEND_API_KEY_MISSING",
      "RESEND_API_KEY is not configured."
    );
  }

  if (!hasRenderableContent) {
    throw new TransactionalEmailError(
      "EMAIL_BODY_MISSING",
      "Email body is required (react, html, or text)."
    );
  }

  const basePayload = {
    from: identity.sender,
    to: input.to,
    subject: input.subject,
    replyTo: identity.replyTo,
    tags: input.tags
  };

  const result = await client.emails.send(
    input.html
      ? {
          ...basePayload,
          html: input.html,
          ...(input.text ? { text: input.text } : {})
        }
      : {
          ...basePayload,
          text: input.text ?? ""
        }
  );

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
