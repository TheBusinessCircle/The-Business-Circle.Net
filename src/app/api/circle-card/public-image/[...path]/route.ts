import { NextResponse } from "next/server";
import {
  isCircleCardImageFileName,
  readCircleCardImage
} from "@/server/circle-card/upload.service";

type RouteProps = {
  params: Promise<{ path: string[] }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: RouteProps) {
  const { path } = await params;
  const filename = path.length === 1 ? path[0] : "";

  if (!isCircleCardImageFileName(filename)) {
    return NextResponse.json({ error: "Circle Card image not found." }, { status: 404 });
  }

  const image = await readCircleCardImage(filename);
  if (!image) {
    return NextResponse.json({ error: "Circle Card image not found." }, { status: 404 });
  }

  return new Response(new Uint8Array(image.bytes), {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": image.mimeType,
      "Content-Length": String(image.bytes.length),
      "X-Content-Type-Options": "nosniff"
    }
  });
}
