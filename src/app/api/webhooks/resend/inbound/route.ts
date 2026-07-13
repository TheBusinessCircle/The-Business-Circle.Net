import { NextResponse, type NextRequest } from "next/server";
import {
  processResendInboundWebhookEvent,
  verifyResendWebhookEvent
} from "@/server/inbound-email";
import { logServerError } from "@/lib/security/logging";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.text();

  let event: unknown;
  try {
    event = verifyResendWebhookEvent(payload, {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature")
    });
  } catch {
    logServerError(
      "resend-inbound-webhook-verification-failed",
      new Error("Inbound webhook signature verification failed.")
    );
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const result = await processResendInboundWebhookEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch {
    logServerError(
      "resend-inbound-webhook-processing-failed",
      new Error("Inbound email processing failed.")
    );
    return NextResponse.json({ error: "Unable to process inbound email." }, { status: 500 });
  }
}
