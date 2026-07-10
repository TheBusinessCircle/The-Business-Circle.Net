import { NextResponse } from "next/server";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { createCircleCardBillingPortalSession } from "@/server/circle-card";

export const runtime = "nodejs";

const portalPayloadSchema = z.object({
  returnPath: z.string().optional()
});

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }

    const authResult = await requireApiUser({ allowUnentitled: true });
    if ("response" in authResult) {
      return authResult.response;
    }

    if (!authResult.user.email) {
      return NextResponse.json(
        { error: "Email is required to open Circle Card billing." },
        { status: 400 }
      );
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsedPayload = portalPayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid Circle Card billing portal payload." }, { status: 400 });
    }

    const returnPath = safeRedirectPath(
      parsedPayload.data.returnPath,
      "/dashboard/circle-card?billing=portal-return"
    );
    const portalSession = await createCircleCardBillingPortalSession({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      returnPath
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    logServerError("circle-card-portal-route-failed", error);
    return NextResponse.json(
      { error: "Unable to create Circle Card billing portal session." },
      { status: 500 }
    );
  }
}
