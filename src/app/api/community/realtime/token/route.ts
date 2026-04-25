import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { getAblyRestClient } from "@/lib/community/ably-server";
import { bcnRulesRequiredResponse, hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const TOKEN_REQUEST_RATE_LIMIT = {
  limit: 120,
  windowMs: 10 * 60 * 1000
} as const;

export async function GET(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      {
        error: "Untrusted request origin."
      },
      { status: 403 }
    );
  }

  const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
  if ("response" in authResult) {
    return authResult.response;
  }

  if (!(await hasAcceptedBcnRules(authResult.user.id))) {
    return bcnRulesRequiredResponse();
  }

  const rateLimit = await consumeRateLimit({
    key: `api:community:ably-token:${authResult.user.id}:${clientIpFromHeaders(request.headers)}`,
    ...TOKEN_REQUEST_RATE_LIMIT
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many realtime auth requests. Please try again shortly."
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const ablyClient = getAblyRestClient();
  if (!ablyClient) {
    return NextResponse.json(
      {
        error: "Realtime is not configured."
      },
      { status: 503, headers }
    );
  }

  try {
    const tokenRequest = await ablyClient.auth.createTokenRequest({
      clientId: authResult.user.id,
      ttl: 60 * 60 * 1000,
      capability: JSON.stringify({
        "community:*": ["subscribe"]
      })
    });

    return NextResponse.json(tokenRequest, { headers });
  } catch (error) {
    logServerError("community-realtime-token-request-failed", error);
    return NextResponse.json(
      {
        error: "Unable to initialize realtime connection."
      },
      { status: 500, headers }
    );
  }
}
