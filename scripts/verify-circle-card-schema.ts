import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const requiredColumns = [
  "cardType",
  "profileImageUrl",
  "businessLogoUrl",
  "profileImagePositionX",
  "profileImagePositionY",
  "profileImageScale",
  "businessLogoPositionX",
  "businessLogoPositionY",
  "businessLogoScale",
  "isPublished",
  "archivedAt"
] as const;

async function verifyCircleCardSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'CircleCard'
    `;
    const available = new Set(columns.map((column) => column.column_name));
    const missing = requiredColumns.filter((column) => !available.has(column));

    if (missing.length) {
      throw new Error(`CircleCard database schema is missing required columns: ${missing.join(", ")}`);
    }

    const cardTypes = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      INNER JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'CircleCardType'
    `;
    const availableCardTypes = new Set(cardTypes.map((entry) => entry.enumlabel));
    const missingCardTypes = ["PERSONAL", "BUSINESS", "CREATOR"].filter(
      (cardType) => !availableCardTypes.has(cardType)
    );

    if (missingCardTypes.length) {
      throw new Error(`CircleCardType is missing values: ${missingCardTypes.join(", ")}`);
    }

    console.info("Circle Card database schema verified.");
  } finally {
    await prisma.$disconnect();
  }
}

function safeErrorMessage(error: unknown) {
  const errorName = error instanceof Error ? error.name : "Error";
  const rawMessage = error instanceof Error ? error.message : "Unknown verification error.";
  const databaseUrl = process.env.DATABASE_URL;
  const withoutConfiguredUrl = databaseUrl ? rawMessage.replaceAll(databaseUrl, "[redacted database URL]") : rawMessage;
  const safeMessage = withoutConfiguredUrl
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database URL]")
    .replace(/:\/\/[^\s/:@]+:[^\s/@]+@/g, "://[redacted credentials]@");

  return `${errorName}: ${safeMessage}`;
}

void verifyCircleCardSchema().catch((error: unknown) => {
  console.error(`Circle Card database schema verification failed. ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});
