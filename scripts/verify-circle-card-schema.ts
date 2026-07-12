import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

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
