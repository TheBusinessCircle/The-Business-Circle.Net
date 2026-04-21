import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { logServerError } from "@/lib/security/logging";

export const runtime = "nodejs";

function toRedirectUrl(requestUrl: URL, status: "success" | "invalid") {
  const loginUrl = new URL("/login", requestUrl);

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

  if (!userId || !token) {
    console.warn("[verify-email] verification route rejected", {
      reason: "missing-parameters"
    });
    return NextResponse.redirect(toRedirectUrl(requestUrl, "invalid"));
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

    return NextResponse.redirect(toRedirectUrl(requestUrl, verified ? "success" : "invalid"));
  } catch (error) {
    logServerError("email-verification-route-failed", error);
    return NextResponse.redirect(toRedirectUrl(requestUrl, "invalid"));
  }
}
