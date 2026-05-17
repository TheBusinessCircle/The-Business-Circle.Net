import { NextResponse, type NextRequest } from "next/server";
import {
  processResendInboundWebhookEvent,
  verifyResendWebhookEvent
} from "@/server/inbound-email";

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
  } catch (error) {
    console.error("[resend-inbound-webhook-verification-failed]", {
      message: error instanceof Error ? error.message : "Invalid Resend webhook signature."
    });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const result = await processResendInboundWebhookEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("[resend-inbound-webhook-processing-failed]", {
      message: error instanceof Error ? error.message : "Unable to process inbound email."
    });
    return NextResponse.json({ error: "Unable to process inbound email." }, { status: 500 });
  }
}
