import { NextResponse } from "next/server";
import { getPendingRegistrationStatusByCheckoutSessionId } from "@/lib/auth/register";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id")?.trim() ?? "";

  if (!sessionId) {
    return NextResponse.json(
      { error: "Checkout session is required." },
      { status: 400 }
    );
  }

  const pendingRegistration =
    await getPendingRegistrationStatusByCheckoutSessionId(sessionId);

  if (!pendingRegistration) {
    return NextResponse.json(
      { error: "Registration could not be found." },
      { status: 404 }
    );
  }

  return NextResponse.json(pendingRegistration);
}
