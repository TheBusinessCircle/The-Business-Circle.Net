import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { resolveFounderUploadAbsolutePath } from "@/server/founder";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ uploadId: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const authResult = await requireApiUser({ adminOnly: true, allowUnentitled: true });
  if ("response" in authResult) {
    return authResult.response;
  }

  const { uploadId } = await params;
  const upload = await db.founderServiceUpload.findUnique({
    where: { id: uploadId },
    select: {
      fileUrl: true,
      fileName: true,
      mimeType: true
    }
  });

  if (!upload) {
    return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  }

  const absolutePath = resolveFounderUploadAbsolutePath(upload.fileUrl);

  try {
    const buffer = await readFile(absolutePath);
    const encodedName = encodeURIComponent(upload.fileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": upload.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Upload file is missing." }, { status: 404 });
  }
}
