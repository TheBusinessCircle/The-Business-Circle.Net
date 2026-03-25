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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendContactSubmissionEmails(input: CreateContactSubmissionInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const notifyRecipient = process.env.CONTACT_NOTIFY_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  const sourcePath = toNullableText(input.sourcePath) ?? "/contact";
  const company = toNullableText(input.company);
  const subject = toNullableText(input.subject) ?? "General enquiry";
  const safeMessage = escapeHtml(input.message.trim());
  const safeName = escapeHtml(input.name.trim());
  const safeEmail = escapeHtml(normalizedEmail);
  const safeCompany = company ? escapeHtml(company) : "N/A";

  if (notifyRecipient) {
    const notifyResult = await sendTransactionalEmail({
      to: notifyRecipient,
      replyTo: normalizedEmail,
      subject: `New contact enquiry: ${subject}`,
      text: [
        "New contact submission",
        "",
        `Name: ${input.name.trim()}`,
        `Email: ${normalizedEmail}`,
        `Company: ${company ?? "N/A"}`,
        `Subject: ${subject}`,
        `Source: ${sourcePath}`,
        "",
        "Message:",
        input.message.trim()
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2>New contact submission</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Company:</strong> ${safeCompany}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Source:</strong> ${escapeHtml(sourcePath)}</p>
          <p><strong>Message:</strong></p>
          <pre style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border-radius: 8px;">${safeMessage}</pre>
        </div>
      `,
      tags: [
        { name: "type", value: "contact-notification" },
        { name: "source", value: "website" }
      ]
    });

    if (!notifyResult.sent && !notifyResult.skipped) {
      logServerWarning("contact-admin-notification-email-failed");
    }
  }

  const receiptResult = await sendTransactionalEmail({
    to: normalizedEmail,
    replyTo: notifyRecipient ?? undefined,
    subject: "We received your message",
    text: [
      `Hi ${input.name.trim()},`,
      "",
      "Thanks for contacting The Business Circle Network.",
      "We have received your message and a member of our team will get back to you shortly.",
      "",
      "Submitted details:",
      `Subject: ${subject}`,
      `Source: ${sourcePath}`,
      "",
      "Best regards,",
      "The Business Circle Network"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>Thanks for contacting us</h2>
        <p>Hi ${safeName},</p>
        <p>We have received your message and will get back to you shortly.</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Source:</strong> ${escapeHtml(sourcePath)}</p>
        <p>Best regards,<br/>The Business Circle Network</p>
      </div>
    `,
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

  // Email delivery should not block form persistence.
  void sendContactSubmissionEmails(input).catch((error) => {
    logServerError("contact-email-dispatch-failed", error);
  });

  return saved;
}
