import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCircleCardFileResponse } from "@/server/circle-card/file-response.service";
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

  const publicLink = await prisma.circleCardLink.findFirst({
    where: {
      fileUrl,
      isActive: true,
      visibility: "PUBLIC",
      card: {
        isPublished: true,
        user: {
          suspended: false
        }
      }
    },
    select: {
      actionMode: true,
      fileName: true,
      fileMimeType: true
    }
  });
  const file = await readCircleCardLinkFile(filename);

  if (!file) {
    return NextResponse.json({ error: "Circle Card file not found." }, { status: 404 });
  }

  return buildCircleCardFileResponse({
    bytes: file.bytes,
    mimeType: file.mimeType,
    fallbackFilename: file.originalFilename,
    fileName: publicLink?.fileName,
    fileMimeType: publicLink?.fileMimeType,
    fileUrl,
    actionMode: publicLink?.actionMode,
    cacheControl: "public, max-age=31536000, immutable"
  }).response;
}
