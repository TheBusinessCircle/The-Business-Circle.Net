import { InboundEmailStatus, Prisma } from "@prisma/client";
import { getResendClient, resolveTransactionalFromAddress } from "@/lib/email/resend";
import { db } from "@/lib/db";

export type ResendWebhookHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export type ResendInboundWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string | null;
    message_id?: string | null;
    attachments?: unknown;
  };
};

type ReceivedEmail = {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string | null;
  bcc: string[] | null;
  cc: string[] | null;
  html: string | null;
  text: string | null;
  message_id: string | null;
  attachments?: unknown;
};

export type InboundEmailListFilters = {
  query?: string;
  status?: InboundEmailStatus | "ALL";
};

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function emailBodyToPlainText(input: { textBody?: string | null; htmlBody?: string | null }) {
  if (input.textBody?.trim()) {
    return input.textBody.trim();
  }

  if (input.htmlBody?.trim()) {
    return stripHtml(input.htmlBody);
  }

  return "";
}

function makeSnippet(input: { textBody?: string | null; htmlBody?: string | null; subject?: string | null }) {
  const body = emailBodyToPlainText(input);
  return truncate(body || input.subject || "No preview available", 240);
}

function toJsonArray(value: unknown): Prisma.InputJsonValue {
  return Array.isArray(value) ? value : [];
}

function extractReceivedAt(value: string | undefined, fallback?: string) {
  const parsed = new Date(value || fallback || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function extractSenderEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

export function parseInboundEmailStatus(value: string | undefined): InboundEmailStatus | "ALL" {
  if (!value || value === "ALL") {
    return "ALL";
  }

  return Object.values(InboundEmailStatus).includes(value as InboundEmailStatus)
    ? (value as InboundEmailStatus)
    : "ALL";
}

export function verifyResendWebhookEvent(
  payload: string,
  headers: ResendWebhookHeaders,
  webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim()
) {
  const resend = getResendClient();

  if (!webhookSecret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured.");
  }

  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!headers.id || !headers.timestamp || !headers.signature) {
    throw new Error("Resend webhook signature headers are missing.");
  }

  return resend.webhooks.verify({
    payload,
    headers: {
      id: headers.id,
      timestamp: headers.timestamp,
      signature: headers.signature
    },
    webhookSecret
  }) as ResendInboundWebhookEvent;
}

export function isEmailReceivedEvent(event: unknown): event is ResendInboundWebhookEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    (event as ResendInboundWebhookEvent).type === "email.received" &&
    typeof (event as ResendInboundWebhookEvent).data?.email_id === "string"
  );
}

export async function retrieveReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const resend = getResendClient();

  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const result = await resend.emails.receiving.get(emailId);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || "Unable to retrieve received email.");
  }

  return result.data as ReceivedEmail;
}

export async function storeInboundEmailFromResend(event: ResendInboundWebhookEvent) {
  if (!isEmailReceivedEvent(event)) {
    throw new Error("Expected an email.received event.");
  }

  const data = event.data;
  if (!data?.email_id) {
    throw new Error("Expected an email.received event with an email_id.");
  }

  const resendEmailId = data.email_id;
  const existing = await db.inboundEmail.findUnique({
    where: { resendEmailId }
  });

  if (existing) {
    return { email: existing, created: false };
  }

  const receivedEmail = await retrieveReceivedEmail(resendEmailId);
  const subject = receivedEmail.subject || data.subject || null;
  const textBody = receivedEmail.text || null;
  const htmlBody = receivedEmail.html || null;

  try {
    const email = await db.inboundEmail.create({
      data: {
        resendEmailId,
        messageId: receivedEmail.message_id || data.message_id || null,
        from: receivedEmail.from || data.from || "Unknown sender",
        to: toJsonArray(receivedEmail.to || data.to),
        cc: toJsonArray(receivedEmail.cc || data.cc),
        bcc: toJsonArray(receivedEmail.bcc || data.bcc),
        subject,
        textBody,
        htmlBody,
        snippet: makeSnippet({ textBody, htmlBody, subject }),
        attachments: (receivedEmail.attachments || data.attachments || []) as Prisma.InputJsonValue,
        receivedAt: extractReceivedAt(receivedEmail.created_at, data.created_at)
      }
    });

    return { email, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const email = await db.inboundEmail.findUniqueOrThrow({
        where: { resendEmailId }
      });

      return { email, created: false };
    }

    throw error;
  }
}

export async function forwardInboundEmail(resendEmailId: string, inboundEmailId: string) {
  const resend = getResendClient();
  const forwardTo = process.env.INBOUND_EMAIL_FORWARD_TO?.trim();
  const fromAddress = resolveTransactionalFromAddress();

  if (!forwardTo) {
    await db.inboundEmail.update({
      where: { id: inboundEmailId },
      data: { forwardError: "INBOUND_EMAIL_FORWARD_TO is not configured." }
    });
    return { forwarded: false, error: "INBOUND_EMAIL_FORWARD_TO is not configured." };
  }

  if (!resend) {
    await db.inboundEmail.update({
      where: { id: inboundEmailId },
      data: { forwardedTo: forwardTo, forwardError: "RESEND_API_KEY is not configured." }
    });
    return { forwarded: false, error: "RESEND_API_KEY is not configured." };
  }

  if (!fromAddress.value) {
    await db.inboundEmail.update({
      where: { id: inboundEmailId },
      data: { forwardedTo: forwardTo, forwardError: fromAddress.reason || "Sender address is not configured." }
    });
    return { forwarded: false, error: fromAddress.reason || "Sender address is not configured." };
  }

  const result = await resend.emails.receiving.forward({
    emailId: resendEmailId,
    to: forwardTo,
    from: fromAddress.value
  });

  if (result.error) {
    const message = truncate(result.error.message || "Inbound email forwarding failed.", 1000);
    await db.inboundEmail.update({
      where: { id: inboundEmailId },
      data: { forwardedTo: forwardTo, forwardError: message }
    });
    return { forwarded: false, error: message };
  }

  await db.inboundEmail.update({
    where: { id: inboundEmailId },
    data: {
      forwardedTo: forwardTo,
      forwardedAt: new Date(),
      forwardError: null
    }
  });

  return { forwarded: true, error: null };
}

export async function processResendInboundWebhookEvent(event: unknown) {
  if (!isEmailReceivedEvent(event)) {
    return { ignored: true, created: false, forwarded: false };
  }

  const { email, created } = await storeInboundEmailFromResend(event);

  if (!created || email.forwardedAt) {
    return { ignored: false, created, forwarded: Boolean(email.forwardedAt) };
  }

  try {
    const forwardResult = await forwardInboundEmail(email.resendEmailId, email.id);
    return { ignored: false, created, forwarded: forwardResult.forwarded };
  } catch (error) {
    const message = truncate(error instanceof Error ? error.message : "Inbound email forwarding failed.", 1000);
    await db.inboundEmail.update({
      where: { id: email.id },
      data: {
        forwardedTo: process.env.INBOUND_EMAIL_FORWARD_TO?.trim() || null,
        forwardError: message
      }
    });
    console.error("[resend-inbound-forward-failed]", {
      inboundEmailId: email.id,
      resendEmailId: email.resendEmailId,
      message
    });
    return { ignored: false, created, forwarded: false };
  }
}

export async function listInboundEmailsForAdmin(filters: InboundEmailListFilters = {}) {
  const query = filters.query?.trim();
  const status = filters.status && filters.status !== "ALL" ? filters.status : undefined;

  return db.inboundEmail.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { from: { contains: query, mode: "insensitive" } },
              { subject: { contains: query, mode: "insensitive" } },
              { textBody: { contains: query, mode: "insensitive" } },
              { htmlBody: { contains: query, mode: "insensitive" } },
              { snippet: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { receivedAt: "desc" },
    take: 100
  });
}

export async function getInboundEmailForAdmin(emailId: string) {
  return db.inboundEmail.findUnique({
    where: { id: emailId }
  });
}

export async function getInboundEmailAdminStats() {
  const [total, unread, archived] = await Promise.all([
    db.inboundEmail.count(),
    db.inboundEmail.count({ where: { status: InboundEmailStatus.UNREAD } }),
    db.inboundEmail.count({ where: { status: InboundEmailStatus.ARCHIVED } })
  ]);

  return { total, unread, archived };
}

export async function updateInboundEmailStatusForAdmin(emailId: string, status: InboundEmailStatus) {
  return db.inboundEmail.update({
    where: { id: emailId },
    data: { status }
  });
}

export function formatEmailRecipients(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
