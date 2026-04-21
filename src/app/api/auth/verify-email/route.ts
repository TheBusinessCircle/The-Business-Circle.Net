import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { logServerError } from "@/lib/security/logging";
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

  console.info("[verify-email] token received", {
    userId,
    hasToken: Boolean(token)
  });

  if (!userId || !token) {
    console.warn("[verify-email] verification route rejected", {
      reason: "missing-parameters"
    });
    const redirectUrl = toRedirectUrl("invalid");
    console.info("[verify-email] redirect target", {
      userId,
      status: "invalid",
      redirectUrl: redirectUrl.toString()
    });
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const verified = await verifyEmailToken({
      userId,
      token
    });

    console.info("[verify-email] verification route completed", {
      userId,
      verified
    });
    console.info("[verify-email] redirecting", {
      userId,
      status: verified ? "success" : "invalid"
    });
    const redirectUrl = toRedirectUrl(verified ? "success" : "invalid");
    console.info("[verify-email] redirect target", {
      userId,
      status: verified ? "success" : "invalid",
      redirectUrl: redirectUrl.toString()
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.warn("[verify-email] verification failed", {
      userId
    });
    logServerError("email-verification-route-failed", error);
    const redirectUrl = toRedirectUrl("invalid");
    console.info("[verify-email] redirect target", {
      userId,
      status: "invalid",
      redirectUrl: redirectUrl.toString()
    });
    return NextResponse.redirect(redirectUrl);
  }
}
