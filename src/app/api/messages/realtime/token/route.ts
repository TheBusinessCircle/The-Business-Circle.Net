import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { getAblyRestClient } from "@/lib/community/ably-server";
import { messagesThreadChannelName, messagesUserChannelName } from "@/lib/messages/realtime";
import { db } from "@/lib/db";
import { bcnRulesRequiredResponse, hasAcceptedBcnRules } from "@/lib/rules-acceptance";
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
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
  if ("response" in authResult) {
    return authResult.response;
  }

  if (!(await hasAcceptedBcnRules(authResult.user.id))) {
    return bcnRulesRequiredResponse();
  }

  const rateLimit = await consumeRateLimit({
    key: `api:messages:ably-token:${authResult.user.id}:${clientIpFromHeaders(request.headers)}`,
    ...TOKEN_REQUEST_RATE_LIMIT
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many realtime auth requests. Please try again shortly." },
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
    return NextResponse.json({ error: "Realtime is not configured." }, { status: 503, headers });
  }

  const threadParticipants = await db.directMessageParticipant.findMany({
    where: {
      userId: authResult.user.id
    },
    select: {
      threadId: true
    }
  });

  const capability: Record<string, string[]> = {
    [messagesUserChannelName(authResult.user.id)]: ["subscribe"]
  };

  threadParticipants.forEach((participant) => {
    capability[messagesThreadChannelName(participant.threadId)] = ["subscribe"];
  });

  const tokenRequest = await ablyClient.auth.createTokenRequest({
    clientId: authResult.user.id,
    ttl: 60 * 60 * 1000,
    capability: JSON.stringify(capability)
  });

  return NextResponse.json(tokenRequest, { headers });
}
