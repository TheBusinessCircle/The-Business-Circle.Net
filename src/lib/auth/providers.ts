import { SubscriptionStatus } from "@prisma/client";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { isRecoverableDatabaseError } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { verifyPasswordWithTimingSafeFallback } from "@/lib/auth/password";
import { credentialsSignInSchema } from "@/lib/auth/schemas";
import { normalizeEmail } from "@/lib/auth/utils";
import { clientIpFromHeaders, consumeRateLimit } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);
const AUTH_IP_LIMIT = {
  limit: 40,
  windowMs: 15 * 60 * 1000
} as const;
const AUTH_CREDENTIAL_LIMIT = {
  limit: 8,
  windowMs: 15 * 60 * 1000
} as const;

class DatabaseUnavailableCredentialsError extends CredentialsSignin {
  code = "database_unavailable";
}

function credentialsProvider() {
  return Credentials({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(rawCredentials, request) {
      const clientIp = clientIpFromHeaders(request?.headers);
      const ipRateLimit = await consumeRateLimit({
        key: `auth:credentials:ip:${clientIp}`,
        ...AUTH_IP_LIMIT
      });

      if (!ipRateLimit.allowed) {
        return null;
      }

      const parsed = credentialsSignInSchema.safeParse(rawCredentials);

      if (!parsed.success) {
        return null;
      }

      const email = normalizeEmail(parsed.data.email);
      const credentialRateLimit = await consumeRateLimit({
        key: `auth:credentials:email:${email}:${clientIp}`,
        ...AUTH_CREDENTIAL_LIMIT
      });

      if (!credentialRateLimit.allowed) {
        return null;
      }

      try {
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            membershipTier: true,
            foundingMember: true,
            foundingTier: true,
            foundingPrice: true,
            foundingClaimedAt: true,
            emailVerified: true,
            suspended: true,
            subscription: {
              select: {
                status: true
              }
            },
            passwordHash: true
          }
        });

        const passwordMatches = await verifyPasswordWithTimingSafeFallback(
          parsed.data.password,
          user?.passwordHash
        );

        if (!user || user.suspended || !user.passwordHash || !passwordMatches) {
          return null;
        }

        const subscriptionStatus = user.subscription?.status ?? null;
        const hasActiveSubscription =
          user.role === "ADMIN"
            ? true
            : Boolean(
                subscriptionStatus &&
                  ENTITLED_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
              );

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          membershipTier: user.membershipTier,
          foundingMember: user.foundingMember,
          foundingTier: user.foundingTier,
          foundingPrice: user.foundingPrice,
          foundingClaimedAt: user.foundingClaimedAt ?? null,
          subscriptionStatus,
          hasActiveSubscription,
          suspended: user.suspended,
          emailVerified: user.emailVerified ?? null
        };
      } catch (error) {
        logServerError("auth-credentials-db-lookup-failed", error);
        if (isRecoverableDatabaseError(error)) {
          throw new DatabaseUnavailableCredentialsError();
        }

        return null;
      }
    }
  });
}

function isMagicLinkFeatureFlagEnabled(): boolean {
  return process.env.AUTH_MAGIC_LINK_ENABLED === "true";
}

export function buildAuthProviders() {
  const providers = [credentialsProvider()];

  // Future-ready switch. Add an Email provider here once SMTP/transactional email is configured.
  if (isMagicLinkFeatureFlagEnabled() && process.env.NODE_ENV !== "production") {
    console.warn("Magic link flag enabled, but no email provider is configured yet.");
  }

  return providers;
}
