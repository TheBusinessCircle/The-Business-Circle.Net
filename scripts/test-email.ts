import { createElement } from "react";
import { BcnEmailLayout, EmailNote } from "../src/emails";
import { renderEmailHtml } from "../src/emails/render";
import { buildBrandedEmailText } from "../src/emails/text";
import { sendTransactionalEmail } from "../src/lib/email/resend";

const loadEnvFile = (process as typeof process & {
  loadEnvFile?: (path?: string) => void;
}).loadEnvFile;

if (typeof loadEnvFile === "function") {
  loadEnvFile(".env");
  loadEnvFile(".env.production");
}

async function main() {
  const cliRecipient = process.argv[2]?.trim();
  const recipient = cliRecipient || process.env.RESEND_TEST_TO?.trim();

  if (!recipient) {
    throw new Error(
      "No recipient provided. Use `npm run email:test -- you@example.com` or set RESEND_TEST_TO in .env."
    );
  }

  const sentAt = new Date().toISOString();
  const emailTemplate = createElement(BcnEmailLayout, {
    previewText: "This is a BCN transactional email test.",
    eyebrow: "EMAIL TEST",
    heading: "Resend test successful",
    lead: "This is a test email from The Business Circle Network.",
    note: createElement(EmailNote, null, `Sent at: ${sentAt}`)
  });
  const html = await renderEmailHtml(emailTemplate);

  const result = await sendTransactionalEmail({
    to: recipient,
    subject: "The Business Circle Network | Resend test",
    text: buildBrandedEmailText({
      eyebrow: "Email test",
      heading: "Resend test successful",
      bodyLines: ["This is a test email from The Business Circle Network."],
      noteLines: [`Sent at: ${sentAt}`]
    }),
    html,
    react: emailTemplate
  });

  if (!result.sent) {
    throw new Error(result.reason || "Email send failed.");
  }

  console.info(`[email:test] Sent successfully to ${recipient}. Message ID: ${result.id ?? "unknown"}`);
}

main().catch((error) => {
  console.error("[email:test] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
