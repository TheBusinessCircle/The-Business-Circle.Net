"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CircleCardImageUploadFieldProps = {
  id: string;
  label: string;
  uploadKind: "profile-photo" | "business-logo";
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  previewAlt: string;
  helperText?: string;
  className?: string;
  previewClassName?: string;
};

type UploadResponse = {
  ok?: boolean;
  imageUrl?: string;
  error?: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isSupportedImage(file: File) {
  if (file.type) {
    return SUPPORTED_IMAGE_TYPES.has(file.type);
  }

  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function CircleCardImageUploadField({
  id,
  label,
  uploadKind,
  name,
  defaultValue = "",
  value,
  onValueChange,
  previewAlt,
  helperText,
  className,
  previewClassName
}: CircleCardImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(value ?? defaultValue);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const previewUrl = selectedPreviewUrl ?? imageUrl;

  useEffect(() => {
    if (value !== undefined) {
      setImageUrl(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  function commitImageUrl(nextValue: string) {
    setImageUrl(nextValue);
    onValueChange?.(nextValue);
  }

  function selectFile(file: File | null) {
    setNotice(null);

    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl);
      setSelectedPreviewUrl(null);
    }

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setSelectedFile(null);
      setNotice("Image must be 5MB or smaller.");
      return;
    }

    if (!isSupportedImage(file)) {
      setSelectedFile(null);
      setNotice("Upload a JPG, PNG or WebP image.");
      return;
    }

    setSelectedFile(file);
    setSelectedPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      setNotice("Choose an image first.");
      return;
    }

    setUploading(true);
    setNotice(null);

    try {
      const payload = new FormData();
      payload.set("kind", uploadKind);
      payload.set("image", selectedFile);

      const response = await fetch("/api/circle-card/upload", {
        method: "POST",
        body: payload
      });
      const data = (await response.json().catch(() => ({}))) as UploadResponse;

      if (!response.ok || !data.imageUrl) {
        setNotice(data.error ?? "Unable to upload image.");
        return;
      }

      commitImageUrl(data.imageUrl);
      setSelectedFile(null);
      setNotice("Image uploaded.");

      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
        setSelectedPreviewUrl(null);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setNotice("Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    commitImageUrl("");
    setSelectedFile(null);
    setNotice(null);

    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl);
      setSelectedPreviewUrl(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
          <div
            className={cn(
              "grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border border-gold/24 bg-background/38 text-xs font-semibold text-muted shadow-inner-surface",
              previewClassName
            )}
          >
            {previewUrl ? (
              <img src={previewUrl} alt={previewAlt} className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={22} aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <Input
              id={id}
              name={name}
              value={imageUrl}
              placeholder="https://..."
              onChange={(event) => {
                setNotice(null);
                commitImageUrl(event.target.value);
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={14} />
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
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Upload
              </Button>
              {imageUrl || selectedFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={clearImage}
                >
                  <X size={14} />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        {helperText ? <p className="text-xs text-muted">{helperText}</p> : null}
        {notice ? (
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              notice === "Image uploaded." ? "text-gold" : "text-muted"
            )}
          >
            {notice === "Image uploaded." ? <CheckCircle2 size={13} /> : null}
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
