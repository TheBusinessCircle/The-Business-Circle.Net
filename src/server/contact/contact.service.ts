import { createElement } from "react";
import { ContactNotificationEmail, ContactReceiptEmail } from "@/emails";
import { renderEmailHtml } from "@/emails/render";
import { buildBrandedEmailText } from "@/emails/text";
import { normalizeEmail } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logServerError, logServerWarning } from "@/lib/security/logging";
import type { ContactFormInput } from "@/lib/validators";

export type CreateContactSubmissionInput = ContactFormInput & {
  userId?: string | null;
  sourcePath?: string | null;
  subject?: string | null;
};

type SavedContactSubmission = {
  id: string;
  createdAt: Date;
};

function toNullableText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function sendContactSubmissionEmails(input: CreateContactSubmissionInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const notifyRecipient = process.env.CONTACT_NOTIFY_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  const sourcePath = toNullableText(input.sourcePath) ?? "/contact";
  const company = toNullableText(input.company) ?? "N/A";
  const subject = toNullableText(input.subject) ?? "General enquiry";
  const trimmedMessage = input.message.trim();
  const trimmedName = input.name.trim();

  if (notifyRecipient) {
    const adminNotificationTemplate = createElement(ContactNotificationEmail, {
      name: trimmedName,
      email: normalizedEmail,
      company,
      subject,
      sourcePath,
      message: trimmedMessage
    });
    const adminNotificationHtml = await renderEmailHtml(adminNotificationTemplate);

    const notifyResult = await sendTransactionalEmail({
      to: notifyRecipient,
      replyTo: normalizedEmail,
      subject: `New contact enquiry: ${subject}`,
      text: buildBrandedEmailText({
        eyebrow: "Contact enquiry",
        heading: "A new enquiry has been received",
        bodyLines: [
          "A new website contact submission has come into The Business Circle Network.",
          `Name: ${trimmedName}`,
          `Email: ${normalizedEmail}`,
          `Company: ${company}`,
          `Subject: ${subject}`,
          `Source: ${sourcePath}`,
          "",
          "Message:",
          trimmedMessage
        ]
      }),
      html: adminNotificationHtml,
      react: adminNotificationTemplate,
      tags: [
        { name: "type", value: "contact-notification" },
        { name: "source", value: "website" }
      ]
    });

    if (!notifyResult.sent && !notifyResult.skipped) {
      logServerWarning("contact-admin-notification-email-failed");
    }
  }

  const receiptTemplate = createElement(ContactReceiptEmail, {
    firstName: trimmedName,
    subject,
    sourcePath
  });
  const receiptHtml = await renderEmailHtml(receiptTemplate);

  const receiptResult = await sendTransactionalEmail({
    to: normalizedEmail,
    replyTo: notifyRecipient ?? undefined,
    subject: "We received your message",
    text: buildBrandedEmailText({
      greeting: `Hi ${trimmedName},`,
      eyebrow: "Message received",
      heading: "We have received your message",
      bodyLines: [
        "Thank you for contacting The Business Circle Network.",
        "We have received your message and a member of our team will come back to you shortly."
      ],
      noteLines: [`Subject: ${subject}`, `Source: ${sourcePath}`]
    }),
    html: receiptHtml,
    react: receiptTemplate,
    tags: [
      { name: "type", value: "contact-auto-reply" },
      { name: "source", value: "website" }
    ]
  });

  if (!receiptResult.sent && !receiptResult.skipped) {
    logServerWarning("contact-auto-reply-email-failed");
  }
}

export async function createContactSubmission(
  input: CreateContactSubmissionInput
): Promise<SavedContactSubmission> {
  const saved = await db.contactSubmission.create({
    data: {
      userId: input.userId ?? undefined,
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      company: toNullableText(input.company),
      subject: toNullableText(input.subject),
      message: input.message.trim(),
      sourcePath: toNullableText(input.sourcePath)
    },
    select: {
      id: true,
      createdAt: true
    }
  });

  void sendContactSubmissionEmails(input).catch((error) => {
    logServerError("contact-email-dispatch-failed", error);
  });

  return saved;
}
