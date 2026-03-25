import { sendTransactionalEmail } from "../src/lib/email/resend";

async function main() {
  const cliRecipient = process.argv[2]?.trim();
  const recipient = cliRecipient || process.env.RESEND_TEST_TO?.trim();

  if (!recipient) {
    throw new Error(
      "No recipient provided. Use `npm run email:test -- you@example.com` or set RESEND_TEST_TO in .env."
    );
  }

  const result = await sendTransactionalEmail({
    to: recipient,
    subject: "The Business Circle Network | Resend test",
    text: [
      "This is a test email from The Business Circle Network.",
      `Sent at: ${new Date().toISOString()}`
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0a1024; line-height: 1.5;">
        <h2>Resend test successful</h2>
        <p>This is a test email from The Business Circle Network.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      </div>
    `
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
