import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildCircleCardVCard,
  circleCardVCardFilename,
  getPublicCircleCard,
  readCircleCardVisitorIdFromCookieHeader,
  trackCircleCardEvent
} from "@/server/circle-card";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const card = await getPublicCircleCard(slug);

  if (!card) {
    return NextResponse.json({ error: "Circle Card not found." }, { status: 404 });
  }

  const filename = encodeURIComponent(circleCardVCardFilename(card));
  const session = await auth().catch(() => null);

  await trackCircleCardEvent({
    cardId: card.id,
    eventType: "VCARD_DOWNLOAD",
    visitorId: readCircleCardVisitorIdFromCookieHeader(request.headers.get("cookie")),
    userId: session?.user?.id ?? null,
    metadata: {
      source: "public_card",
      slug: card.slug
    }
  });

  return new NextResponse(buildCircleCardVCard(card), {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store"
    }
  });
}
