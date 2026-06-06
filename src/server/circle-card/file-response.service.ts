import "server-only";

import { NextResponse } from "next/server";
import { resolveCircleCardFileAction } from "@/lib/circle-card/file-actions";

type CircleCardFileResponseInput = {
  bytes: Buffer;
  mimeType: string;
  fallbackFilename: string;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileUrl?: string | null;
  actionMode?: string | null;
  cacheControl: string;
};

const HTML_VIEW_CSP = [
  "sandbox allow-popups",
  "default-src 'none'",
  "img-src 'self' data: https:",
  "style-src 'unsafe-inline'",
  "font-src data: https:",
  "script-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join("; ");

export function buildCircleCardFileResponse(input: CircleCardFileResponseInput) {
  const action = resolveCircleCardFileAction({
    actionMode: input.actionMode,
    fileMimeType: input.fileMimeType || input.mimeType,
    fileName: input.fileName || input.fallbackFilename,
    fileUrl: input.fileUrl
  });
  const safeFilename = encodeURIComponent(input.fileName || input.fallbackFilename);
  const headers: Record<string, string> = {
    "Content-Type": action === "DOWNLOAD" ? "application/octet-stream" : input.mimeType,
    "Content-Disposition": `${action === "DOWNLOAD" ? "attachment" : "inline"}; filename*=UTF-8''${safeFilename}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": input.cacheControl
  };

  if (action === "VIEW" && input.mimeType === "text/html") {
    headers["Content-Security-Policy"] = HTML_VIEW_CSP;
  }

  return {
    action,
    response: new NextResponse(new Uint8Array(input.bytes), {
      status: 200,
      headers
    })
  };
}
