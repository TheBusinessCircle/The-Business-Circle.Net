"use server";

import { redirect } from "next/navigation";
import { resendVerificationEmail } from "@/lib/auth/email-verification";
import { safeRedirectPath } from "@/lib/auth/utils";
import { prisma } from "@/lib/prisma";
import { logServerWarning } from "@/lib/security/logging";
import { requireUser } from "@/lib/session";

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

export async function resendEmailVerificationAction(formData: FormData) {
  const session = await requireUser();
  const returnPath = safeRedirectPath(String(formData.get("returnPath") || ""), "/dashboard");

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      role: true
    }
  });

  if (!user) {
    redirectWithError(returnPath, "verification-email-unavailable");
  }

  if (user.role === "ADMIN" || user.emailVerified) {
    redirectWithNotice(returnPath, "verification-already-complete");
  }

  const result = await resendVerificationEmail(user.id);

  if (!result.sent) {
    logServerWarning("verification-email-resend-failed", {
      userId: user.id,
      skipped: result.skipped,
      reason: result.reason
    });
    redirectWithError(returnPath, "verification-email-unavailable");
  }

  redirectWithNotice(returnPath, "verification-email-sent");
}
