import { db } from "../src/lib/db";
import { resendVerificationEmail } from "../src/lib/auth/email-verification";
import { logServerError, logServerInfo } from "../src/lib/security/logging";

const loadEnvFile = (process as typeof process & {
  loadEnvFile?: (path?: string) => void;
}).loadEnvFile;

if (typeof loadEnvFile === "function") {
  loadEnvFile(".env");
  loadEnvFile(".env.production");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This script is for development or manual server diagnostics only.");
  }

  const reference = process.argv[2]?.trim();
  if (!reference) {
    throw new Error("Provide a user id or email. Example: npm run email:test:verification -- member@example.com");
  }

  const user = await db.user.findFirst({
    where: reference.includes("@")
      ? {
          email: reference.toLowerCase()
        }
      : {
          id: reference
        },
    select: {
      id: true,
      email: true,
      emailVerified: true
    }
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const result = await resendVerificationEmail(user.id);
  logServerInfo("verification-email-test-completed", {
    userId: user.id,
    alreadyVerified: Boolean(user.emailVerified),
    sent: result.sent,
    skipped: result.skipped,
    hasMessageId: Boolean(result.messageId)
  });
}

main().catch((error) => {
  logServerError("verification-email-test-failed", error);
  process.exit(1);
});
