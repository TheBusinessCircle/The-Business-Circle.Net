import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { MembershipTier, PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const DEFAULT_EMAIL = "test-rules@thebusinesscircle.net";
const DEFAULT_PASSWORD = "RulesTest!2026";
const DEFAULT_TIER = MembershipTier.FOUNDATION;

type Options = {
  email: string;
  password: string;
  tier: Extract<MembershipTier, "FOUNDATION" | "INNER_CIRCLE">;
  deleteAccount: boolean;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    email: DEFAULT_EMAIL,
    password: process.env.BCN_RULES_TEST_PASSWORD?.trim() || DEFAULT_PASSWORD,
    tier: parseTier(process.env.BCN_RULES_TEST_TIER) ?? DEFAULT_TIER,
    deleteAccount: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--delete") {
      options.deleteAccount = true;
      continue;
    }

    if (arg === "--email") {
      options.email = requireValue(argv[index + 1], "--email").toLowerCase();
      index += 1;
      continue;
    }

    if (arg === "--password") {
      options.password = requireValue(argv[index + 1], "--password");
      index += 1;
      continue;
    }

    if (arg === "--tier") {
      const tier = parseTier(requireValue(argv[index + 1], "--tier"));

      if (!tier) {
        throw new Error("--tier must be foundation or inner-circle.");
      }

      options.tier = tier;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(value: string | undefined, flag: string) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value.trim();
}

function parseTier(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "foundation") {
    return MembershipTier.FOUNDATION;
  }

  if (normalized === "inner-circle" || normalized === "inner_circle") {
    return MembershipTier.INNER_CIRCLE;
  }

  return null;
}

function assertSafeTestEmail(email: string) {
  if (email !== DEFAULT_EMAIL && !/^test[-+_.a-z0-9]*@thebusinesscircle\.net$/i.test(email)) {
    throw new Error(
      `Refusing to touch ${email}. Use ${DEFAULT_EMAIL} or another obvious test*@thebusinesscircle.net address.`
    );
  }
}

function assertSafeEnvironment() {
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  const explicitAllow = process.env.ALLOW_BCN_TEST_MEMBER_SCRIPT === "true";
  const looksLikeProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    appUrl === "https://thebusinesscircle.net" ||
    nextAuthUrl === "https://thebusinesscircle.net";

  if (looksLikeProduction && !explicitAllow) {
    throw new Error(
      "Refusing to run against a production-looking environment. Set ALLOW_BCN_TEST_MEMBER_SCRIPT=true only for an intentional admin/staging run."
    );
  }
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl })
  });
}

function tierLabel(tier: MembershipTier) {
  return tier === MembershipTier.INNER_CIRCLE ? "Inner Circle" : "Foundation";
}

function roleForTier(tier: MembershipTier) {
  return tier === MembershipTier.INNER_CIRCLE ? Role.INNER_CIRCLE : Role.MEMBER;
}

function printHelp() {
  console.info(`Usage:
  npx tsx scripts/reset-rules-test-member.ts
  npx tsx scripts/reset-rules-test-member.ts --tier inner-circle
  npx tsx scripts/reset-rules-test-member.ts --delete

Options:
  --email <email>       Defaults to ${DEFAULT_EMAIL}. Must be an obvious test*@thebusinesscircle.net address.
  --password <value>    Defaults to ${DEFAULT_PASSWORD}, or BCN_RULES_TEST_PASSWORD if set.
  --tier <tier>         foundation or inner-circle. Defaults to foundation.
  --delete              Delete only the configured test account.
`);
}

async function resetTestMember(db: PrismaClient, options: Options) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const passwordHash = await hashPassword(options.password);
  const stripeIdSuffix = options.email.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const userId = "rules_test_member";
  const subscriptionId = "rules_test_subscription";
  const role = roleForTier(options.tier);

  return db.$transaction(async (tx) => {
    const users = await tx.$queryRaw<
      Array<{
        id: string;
        email: string;
        membershipTier: MembershipTier;
        acceptedRulesAt: Date | null;
        acceptedRulesVersion: string | null;
      }>
    >`
      INSERT INTO "User" (
        "id",
        "email",
        "name",
        "emailVerified",
        "passwordHash",
        "role",
        "membershipTier",
        "foundingMember",
        "foundingTier",
        "foundingPrice",
        "foundingClaimedAt",
        "acceptedTermsAt",
        "acceptedTermsVersion",
        "acceptedRulesAt",
        "acceptedRulesVersion",
        "suspended",
        "suspendedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${userId},
        ${options.email},
        'BCN Rules Test Member',
        ${now},
        ${passwordHash},
        ${role}::"Role",
        ${options.tier}::"MembershipTier",
        false,
        null,
        null,
        null,
        ${now},
        'dev-test',
        null,
        null,
        false,
        null,
        ${now},
        ${now}
      )
      ON CONFLICT ("email") DO UPDATE SET
        "name" = 'BCN Rules Test Member',
        "emailVerified" = ${now},
        "passwordHash" = ${passwordHash},
        "role" = ${role}::"Role",
        "membershipTier" = ${options.tier}::"MembershipTier",
        "foundingMember" = false,
        "foundingTier" = null,
        "foundingPrice" = null,
        "foundingClaimedAt" = null,
        "acceptedTermsAt" = ${now},
        "acceptedTermsVersion" = 'dev-test',
        "acceptedRulesAt" = null,
        "acceptedRulesVersion" = null,
        "suspended" = false,
        "suspendedAt" = null,
        "updatedAt" = ${now}
      RETURNING "id", "email", "membershipTier", "acceptedRulesAt", "acceptedRulesVersion"
    `;

    const user = users[0];

    if (!user) {
      throw new Error("Failed to create or update the rules test user.");
    }

    const subscriptions = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        tier: MembershipTier;
      }>
    >`
      INSERT INTO "Subscription" (
        "id",
        "userId",
        "stripeCustomerId",
        "stripeSubscriptionId",
        "stripeProductId",
        "stripePriceId",
        "status",
        "tier",
        "currentPeriodStart",
        "currentPeriodEnd",
        "trialStart",
        "trialEnd",
        "cancelAtPeriodEnd",
        "canceledAt",
        "metadata",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${subscriptionId},
        ${user.id},
        ${`cus_bcn_rules_test_${stripeIdSuffix}`},
        ${`sub_bcn_rules_test_${stripeIdSuffix}`},
        ${`prod_bcn_rules_test_${options.tier.toLowerCase()}`},
        ${`price_bcn_rules_test_${options.tier.toLowerCase()}`},
        'ACTIVE'::"SubscriptionStatus",
        ${options.tier}::"MembershipTier",
        ${now},
        ${periodEnd},
        null,
        null,
        false,
        null,
        '{"source":"scripts/reset-rules-test-member.ts","purpose":"local/staging/admin Rules welcome overlay testing only","rulesAccepted":false}'::jsonb,
        ${now},
        ${now}
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "stripeCustomerId" = ${`cus_bcn_rules_test_${stripeIdSuffix}`},
        "stripeSubscriptionId" = ${`sub_bcn_rules_test_${stripeIdSuffix}`},
        "stripeProductId" = ${`prod_bcn_rules_test_${options.tier.toLowerCase()}`},
        "stripePriceId" = ${`price_bcn_rules_test_${options.tier.toLowerCase()}`},
        "status" = 'ACTIVE'::"SubscriptionStatus",
        "tier" = ${options.tier}::"MembershipTier",
        "currentPeriodStart" = ${now},
        "currentPeriodEnd" = ${periodEnd},
        "trialStart" = null,
        "trialEnd" = null,
        "cancelAtPeriodEnd" = false,
        "canceledAt" = null,
        "metadata" = '{"source":"scripts/reset-rules-test-member.ts","purpose":"local/staging/admin Rules welcome overlay testing only","rulesAccepted":false}'::jsonb,
        "updatedAt" = ${now}
      RETURNING "id", "status", "tier"
    `;

    const subscription = subscriptions[0];

    if (!subscription) {
      throw new Error("Failed to create or update the rules test subscription.");
    }

    return {
      user,
      subscription
    };
  });
}

async function deleteTestMember(db: PrismaClient, email: string) {
  const deleted = await db.$executeRaw`
    DELETE FROM "User"
    WHERE "email" = ${email}
  `;

  return deleted;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  assertSafeEnvironment();
  assertSafeTestEmail(options.email);

  const db = createPrismaClient();

  try {
    if (options.deleteAccount) {
      const count = await deleteTestMember(db, options.email);
      console.info(`Deleted ${count} BCN rules test account(s) for ${options.email}.`);
      return;
    }

    const result = await resetTestMember(db, options);

    console.info(`---
BCN TEST ACCOUNT CREATED
Email: ${result.user.email}
Password: ${options.password}
Tier: ${tierLabel(result.user.membershipTier)}
Rules Accepted: NO
---`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    "[reset-rules-test-member] Failed:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
