import { NextResponse } from "next/server";
import {
  buildCircleCardVCard,
  circleCardVCardFilename,
  getPublicCircleCard
} from "@/server/circle-card";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const card = await getPublicCircleCard(slug);

  if (!card) {
    return NextResponse.json({ error: "Circle Card not found." }, { status: 404 });
  }

  const filename = encodeURIComponent(circleCardVCardFilename(card));

  return new NextResponse(buildCircleCardVCard(card), {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "public, max-age=300"
    }
  });
}
