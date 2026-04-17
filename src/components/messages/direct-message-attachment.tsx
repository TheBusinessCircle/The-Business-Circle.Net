import Link from "next/link";
import { Download, FileText } from "lucide-react";
import type { DirectMessageAttachmentModel, WinAttachmentModel } from "@/types";
import { formatBytes } from "@/lib/messages/format";

type DirectMessageAttachmentViewProps = {
  attachment: DirectMessageAttachmentModel | WinAttachmentModel;
};

export function DirectMessageAttachmentView({ attachment }: DirectMessageAttachmentViewProps) {
  if (attachment.kind === "IMAGE") {
    return (
      <Link
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-2xl border border-silver/14 bg-background/22"
      >
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="max-h-80 w-full object-cover"
        />
      </Link>
    );
  }

  return (
    <Link
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-background/22 px-4 py-3 transition-colors hover:border-silver/24 hover:bg-background/32"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-silver/14 bg-silver/10 text-silver">
          <FileText size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{attachment.fileName}</p>
          <p className="text-xs text-muted">
            {attachment.mimeType || "File"} · {formatBytes(attachment.sizeBytes)}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-2 text-sm text-silver">
        <Download size={14} />
        Open
      </span>
    </Link>
  );
}
