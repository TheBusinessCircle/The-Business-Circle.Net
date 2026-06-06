"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CIRCLE_CARD_SUPPORTED_LINK_FILE_MIME_TYPES } from "@/lib/circle-card/file-actions";
import { cn } from "@/lib/utils";

type UploadResponse = {
  ok?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  error?: string;
};

type CircleCardLinkFileUploadFieldProps = {
  defaultFileUrl?: string | null;
  defaultFileName?: string | null;
  defaultFileMimeType?: string | null;
  onFileMetadataChange?: (metadata: {
    fileUrl: string;
    fileName: string;
    fileMimeType: string;
  }) => void;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_FILE_TYPES = new Set<string>(CIRCLE_CARD_SUPPORTED_LINK_FILE_MIME_TYPES);

function isSupportedFile(file: File) {
  if (file.type) {
    return SUPPORTED_FILE_TYPES.has(file.type);
  }

  return /\.(pdf|html?|jpe?g|png|webp|zip)$/i.test(file.name);
}

export function CircleCardLinkFileUploadField({
  defaultFileUrl = "",
  defaultFileName = "",
  defaultFileMimeType = "",
  onFileMetadataChange
}: CircleCardLinkFileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState(defaultFileUrl ?? "");
  const [fileName, setFileName] = useState(defaultFileName ?? "");
  const [fileMimeType, setFileMimeType] = useState(defaultFileMimeType ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function selectFile(file: File | null) {
    setNotice(null);
    setSelectedFile(null);

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setNotice("File must be 10MB or smaller.");
      return;
    }

    if (!isSupportedFile(file)) {
      setNotice("Upload a PDF, HTML, JPG, PNG, WebP or ZIP file.");
      return;
    }

    setSelectedFile(file);
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      setNotice("Choose a file first.");
      return;
    }

    setUploading(true);
    setNotice(null);

    try {
      const payload = new FormData();
      payload.set("kind", "link-file");
      payload.set("file", selectedFile);

      const response = await fetch("/api/circle-card/upload", {
        method: "POST",
        body: payload
      });
      const data = (await response.json().catch(() => ({}))) as UploadResponse;

      if (!response.ok || !data.fileUrl) {
        setNotice(data.error ?? "Unable to upload file.");
        return;
      }

      setFileUrl(data.fileUrl);
      setFileName(data.fileName ?? selectedFile.name);
      setFileMimeType(data.fileMimeType ?? selectedFile.type);
      onFileMetadataChange?.({
        fileUrl: data.fileUrl,
        fileName: data.fileName ?? selectedFile.name,
        fileMimeType: data.fileMimeType ?? selectedFile.type
      });
      setSelectedFile(null);
      setNotice("File uploaded. Save the link below.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setNotice("Unable to upload file.");
    } finally {
      setUploading(false);
    }
  }

  function clearFile() {
    setFileUrl("");
    setFileName("");
    setFileMimeType("");
    onFileMetadataChange?.({
      fileUrl: "",
      fileName: "",
      fileMimeType: ""
    });
    setSelectedFile(null);
    setNotice(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-silver/14 bg-background/18 p-4">
      <input type="hidden" name="fileUrl" value={fileUrl} />
      <input type="hidden" name="fileName" value={fileName} />
      <input type="hidden" name="fileMimeType" value={fileMimeType} />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,text/html,image/jpeg,image/png,image/webp,application/zip,.zip"
        className="sr-only"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">File upload</p>
          <p className="mt-1 truncate text-xs text-muted">
            {selectedFile?.name || fileName || "PDF, HTML, JPG, PNG, WebP or ZIP"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp size={14} />
            Choose
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!selectedFile || uploading}
            onClick={uploadSelectedFile}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            Upload
          </Button>
          {fileUrl || selectedFile ? (
            <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={clearFile}>
              <X size={14} />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {fileUrl ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-gold">
          <CheckCircle2 size={13} />
          Uploaded file ready for this link.
        </p>
      ) : null}
      {notice ? (
        <p className={cn("text-xs", notice.startsWith("File uploaded") ? "text-gold" : "text-muted")}>
          {notice}
        </p>
      ) : null}
    </div>
  );
}
