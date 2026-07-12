import { NextResponse } from "next/server";
import { readCircleCardDocumentItems } from "@/lib/circle-card/content-blocks";
import { CIRCLE_CARD_LAUNCH_FILE_LINKS_ENABLED } from "@/lib/circle-card/plans";
import { prisma } from "@/lib/prisma";
import { buildCircleCardFileResponse } from "@/server/circle-card/file-response.service";
import {
  isCircleCardLinkFileName,
  readCircleCardLinkFile
} from "@/server/circle-card/upload.service";

type RouteProps = {
  params: Promise<{ filename: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: RouteProps) {
  if (!CIRCLE_CARD_LAUNCH_FILE_LINKS_ENABLED) {
    return NextResponse.json({ error: "Circle Card file not found." }, { status: 404 });
  }

  const { filename } = await params;

  if (!isCircleCardLinkFileName(filename)) {
    return NextResponse.json({ error: "Circle Card file not found." }, { status: 404 });
  }

  const fileUrl = `/api/circle-card/link-file/${filename}`;
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

  const documentCard = publicLink
    ? null
    : await prisma.circleCard.findFirst({
        where: {
          cardType: "BUSINESS",
          isPublished: true,
          archivedAt: null,
          user: { suspended: false },
          contentBlocks: {
            path: ["business", "DOWNLOADS_DOCUMENTS", "items"],
            array_contains: [{ fileUrl }]
          }
        },
        select: { contentBlocks: true }
      });
  const publicDocument = documentCard
    ? readCircleCardDocumentItems(documentCard.contentBlocks).find(
        (document) => document.fileUrl === fileUrl && document.isActive
      ) ?? null
    : null;

  if (!publicLink && !publicDocument) {
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

    return NextResponse.json({ error: "Circle Card file not found." }, { status: 404 });
  }

  const file = await readCircleCardLinkFile(filename);

  if (!file) {
    return NextResponse.json({ error: "Circle Card file not found." }, { status: 404 });
  }

  return buildCircleCardFileResponse({
    bytes: file.bytes,
    mimeType: file.mimeType,
    fallbackFilename: file.originalFilename,
    fileName: publicLink?.fileName ?? publicDocument?.fileName,
    fileMimeType: publicLink?.fileMimeType ?? publicDocument?.fileType,
    fileUrl,
    actionMode: publicLink?.actionMode,
    cacheControl: "public, max-age=31536000, immutable"
  }).response;
}
