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

let resendClient: Resend | null | undefined;

function getResendClient(): Resend | null {
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

function resolveFromAddress(overrideFrom?: string) {
  const from = overrideFrom?.trim() || process.env.RESEND_FROM_EMAIL?.trim();
  return from || "The Business Circle Network <onboarding@resend.dev>";
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
  const client = getResendClient();
  const hasRenderableContent = Boolean(input.react || input.html || input.text);

  if (!client) {
    return {
      sent: false,
      skipped: true,
      reason: "RESEND_API_KEY is not configured."
    };
  }

  if (!hasRenderableContent) {
    return {
      sent: false,
      skipped: false,
      reason: "Email body is required (react, html, or text)."
    };
  }

  try {
    const result = await client.emails.send({
      from: resolveFromAddress(input.from),
      to: input.to,
      subject: input.subject,
      react: input.react,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      tags: input.tags
    });

    if (result.error) {
      return {
        sent: false,
        skipped: false,
        reason: result.error.message
      };
    }

    return {
      sent: true,
      skipped: false,
      id: result.data?.id ?? null
    };
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Unknown email delivery error."
    };
  }
}
