import { NextResponse } from "next/server";
import { z } from "zod";
import {
  markGoogleReviewIntent,
  markTestimonialCopiedToGoogle
} from "@/server/testimonials";

const payloadSchema = z.object({
  testimonialId: z.string().cuid(),
  kind: z.enum(["intent", "copy"])
});

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (parsed.data.kind === "copy") {
    await markTestimonialCopiedToGoogle(parsed.data.testimonialId);
  } else {
    await markGoogleReviewIntent(parsed.data.testimonialId);
  }

  return NextResponse.json({ ok: true });
}
