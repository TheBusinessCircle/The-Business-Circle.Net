import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { resolveWinAttachmentAbsolutePath } from "@/server/messages";
import { getWinAttachmentAccess } from "@/server/wins";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ attachmentId: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const authResult = await requireApiUser({ allowUnentitled: true });
  if ("response" in authResult) {
    return authResult.response;
  }

  const { attachmentId } = await params;
  const attachment = await getWinAttachmentAccess({
    attachmentId,
    userId: authResult.user.id,
    admin: authResult.user.role === "ADMIN"
  });

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const absolutePath = resolveWinAttachmentAbsolutePath(attachment.storageKey);

  try {
    const buffer = await readFile(absolutePath);
    const encodedName = encodeURIComponent(attachment.fileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Attachment file is missing." }, { status: 404 });
  }
}
