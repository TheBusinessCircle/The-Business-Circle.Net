import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readCircleCardLinkFile } from "@/server/circle-card/upload.service";

type RouteProps = {
  params: Promise<{ filename: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: RouteProps) {
  const { filename } = await params;
  const fileUrl = `/api/circle-card/link-file/${filename}`;
  const privateLink = await prisma.circleCardLink.findFirst({
    where: {
      fileUrl,
      isActive: true,
      visibility: "PRIVATE_CODE",
      card: {
        isPublished: true,
        user: {
          suspended: false
        }
      }
    },
    select: {
      id: true
    }
  });

  if (privateLink) {
    return NextResponse.json({ error: "Access code required." }, { status: 403 });
  }

  const file = await readCircleCardLinkFile(filename);

  if (!file) {
    return NextResponse.json({ error: "Circle Card file not found." }, { status: 404 });
  }

  const disposition = file.forceDownload ? "attachment" : "inline";
  const safeFilename = encodeURIComponent(file.originalFilename);

  return new NextResponse(file.bytes, {
    status: 200,
    headers: {
      "Content-Type": file.forceDownload ? "application/octet-stream" : file.mimeType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${safeFilename}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
