import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { updateFoundingOfferSettings } from "@/server/founding";

export const runtime = "nodejs";

const updateFoundingSettingsSchema = z.object({
  enabled: z.boolean(),
  foundationEnabled: z.boolean(),
  innerCircleEnabled: z.boolean(),
  coreEnabled: z.boolean(),
  foundationLimit: z.number().int().min(0).max(5000),
  innerCircleLimit: z.number().int().min(0).max(5000),
  coreLimit: z.number().int().min(0).max(5000)
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(path: string | undefined, fallback = "/admin/founding") {
  return safeRedirectPath(path, fallback);
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), {
    status: 303
  });
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const authResult = await requireApiUser({ adminOnly: true, allowUnentitled: true });
  if ("response" in authResult) {
    if (authResult.response.status === 401) {
      return redirectTo(request, "/login?from=%2Fadmin%2Ffounding");
    }

    return redirectTo(request, "/dashboard");
  }

  const formData = await request.formData();
  const returnPath = resolveReturnPath(String(formData.get("returnPath") || ""));
  const parsed = updateFoundingSettingsSchema.safeParse({
    enabled: Boolean(formData.get("enabled")),
    foundationEnabled: Boolean(formData.get("foundationEnabled")),
    innerCircleEnabled: Boolean(formData.get("innerCircleEnabled")),
    coreEnabled: Boolean(formData.get("coreEnabled")),
    foundationLimit: Number(formData.get("foundationLimit") || 0),
    innerCircleLimit: Number(formData.get("innerCircleLimit") || 0),
    coreLimit: Number(formData.get("coreLimit") || 0)
  });

  if (!parsed.success) {
    return redirectTo(request, appendQueryParam(returnPath, "error", "invalid"));
  }

  try {
    await updateFoundingOfferSettings(parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message === "founding-limit-below-claimed") {
      return redirectTo(request, appendQueryParam(returnPath, "error", "limit-below-claimed"));
    }

    throw error;
  }

  revalidatePath("/admin/founding");
  revalidatePath("/membership");
  revalidatePath("/join");
  revalidatePath("/");

  return redirectTo(
    request,
    appendQueryParam(returnPath, "notice", "founding-settings-updated")
  );
}
