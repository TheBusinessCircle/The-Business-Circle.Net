import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { logServerError, logServerInfo, logServerWarning } from "@/lib/security/logging";
import { getBaseUrl } from "@/lib/utils";

export const runtime = "nodejs";

function toRedirectUrl(status: "success" | "invalid") {
  const loginUrl = new URL("/login", getBaseUrl());

  if (status === "success") {
    loginUrl.searchParams.set("verified", "1");
  } else {
    loginUrl.searchParams.set("error", "invalid-verification");
  }

  return loginUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const userId = requestUrl.searchParams.get("uid")?.trim() || "";
  const token = requestUrl.searchParams.get("token")?.trim() || "";

  logServerInfo("verify-email-route-token-received", {
    userId,
    hasToken: Boolean(token)
  });

  if (!userId || !token) {
    logServerWarning("verify-email-route-rejected", {
      reason: "missing-parameters"
    });
    const redirectUrl = toRedirectUrl("invalid");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const verified = await verifyEmailToken({
      userId,
      token
    });

    logServerInfo("verify-email-route-completed", {
      userId,
      verified
    });
    const redirectUrl = toRedirectUrl(verified ? "success" : "invalid");

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logServerWarning("verify-email-route-failed", {
      userId
    });
    logServerError("email-verification-route-failed", error);
    const redirectUrl = toRedirectUrl("invalid");
    return NextResponse.redirect(redirectUrl);
  }
}
