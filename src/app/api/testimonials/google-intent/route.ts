import { NextResponse } from "next/server";
import { z } from "zod";
import {
  markGoogleReviewIntent,
  markTestimonialCopiedToGoogle
} from "@/server/testimonials";
import { db } from "@/lib/db";

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
    await db.siteEvent.create({
      data: {
        eventName: "review_text_copied",
        path: "/testimonial",
        metadata: {
          testimonialId: parsed.data.testimonialId,
          surface: "google_review_cta"
        }
      }
    }).catch(() => null);
  } else {
    await markGoogleReviewIntent(parsed.data.testimonialId);
    await db.siteEvent.create({
      data: {
        eventName: "google_review_clicked",
        path: "/testimonial",
        metadata: {
          testimonialId: parsed.data.testimonialId
        }
      }
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
