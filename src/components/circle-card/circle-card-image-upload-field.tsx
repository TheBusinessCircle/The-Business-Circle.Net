"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  SlidersHorizontal,
  Upload,
  X
} from "lucide-react";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ImageAdjustmentValues = {
  positionX: number;
  positionY: number;
  scale: number;
};

type CircleCardImageUploadFieldProps = {
  id: string;
  label: string;
  uploadKind: "profile-photo" | "business-logo" | "gallery-image" | "link-image";
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  positionXName?: string;
  positionYName?: string;
  scaleName?: string;
  defaultPositionX?: number | null;
  defaultPositionY?: number | null;
  defaultScale?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  scale?: number | null;
  onAdjustmentChange?: (values: ImageAdjustmentValues) => void;
  previewAlt: string;
  helperText?: string;
  saveReminder?: string;
  uploadSuccessMessage?: string;
  className?: string;
  previewClassName?: string;
  fallbackSrc?: string;
  showAdjustments?: boolean;
};

type UploadResponse = {
  ok?: boolean;
  imageUrl?: string;
  url?: string;
  secureUrl?: string;
  error?: string;
};

type UploadNotice = {
  tone: "success" | "error" | "info";
  message: string;
};

const CIRCLE_CARD_LOGO_SRC = "/branding/circle-card-logo.png";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_ADJUSTMENTS: ImageAdjustmentValues = {
  positionX: 50,
  positionY: 50,
  scale: 1
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePosition(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.round(value), 0, 100)
    : 50;
}

function normalizeScale(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Number(value.toFixed(2)), 1, 3)
    : 1;
}

function isSupportedImage(file: File) {
  if (file.type) {
    return SUPPORTED_IMAGE_TYPES.has(file.type);
  }

  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function readUploadedImageUrl(data: UploadResponse) {
  const candidate = data.secureUrl ?? data.imageUrl ?? data.url ?? "";
  return typeof candidate === "string" ? candidate.trim() : "";
}

function uploadFailedNotice(error?: string) {
  const detail = error?.trim();

  return detail
    ? `Failed. ${detail} Your existing image has not changed.`
    : "Failed. Your existing image has not changed.";
}

function preloadUploadedImage(imageUrl: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };

    image.onload = finish;
    image.onerror = finish;
    image.src = imageUrl;

    if (image.complete) {
      finish();
    } else {
      window.setTimeout(finish, 2000);
    }
  });
}

export function CircleCardImageUploadField({
  id,
  label,
  uploadKind,
  name,
  defaultValue = "",
  value,
  onValueChange,
  positionXName,
  positionYName,
  scaleName,
  defaultPositionX,
  defaultPositionY,
  defaultScale,
  positionX,
  positionY,
  scale,
  onAdjustmentChange,
  previewAlt,
  helperText,
  saveReminder = "After uploading or adjusting images, save your Circle Card below.",
  uploadSuccessMessage = "Uploaded. Save your Circle Card below.",
  className,
  previewClassName,
  fallbackSrc,
  showAdjustments = true
}: CircleCardImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultValueRef = useRef(defaultValue);
  const [imageUrl, setImageUrl] = useState(value ?? defaultValue);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<UploadNotice | null>(null);
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustments, setAdjustments] = useState<ImageAdjustmentValues>(() => ({
    positionX: normalizePosition(positionX ?? defaultPositionX),
    positionY: normalizePosition(positionY ?? defaultPositionY),
    scale: normalizeScale(scale ?? defaultScale)
  }));
  const previousAdjustmentsRef = useRef(adjustments);
  const previewUrl = selectedPreviewUrl ?? imageUrl;
  const hasImageToAdjust = Boolean(previewUrl);
  const fallbackImageSrc = fallbackSrc ?? (uploadKind === "business-logo" ? CIRCLE_CARD_LOGO_SRC : undefined);
  const currentImageValueLabel = name ? `${name} value` : "Image URL";

  useEffect(() => {
    if (value !== undefined) {
      setImageUrl(value);
    }
  }, [value]);

  useEffect(() => {
    if (value !== undefined || defaultValueRef.current === defaultValue) {
      return;
    }

    if (selectedFile || uploading || lastUploadedUrl) {
      defaultValueRef.current = defaultValue;
      return;
    }

    defaultValueRef.current = defaultValue;
    setImageUrl(defaultValue);
    setSelectedPreviewUrl(null);
    setLastUploadedUrl(null);
  }, [defaultValue, lastUploadedUrl, selectedFile, uploading, value]);

  useEffect(() => {
    if (positionX === undefined && positionY === undefined && scale === undefined) {
      return;
    }

    setAdjustments((previous) => ({
      positionX: normalizePosition(positionX ?? previous.positionX),
      positionY: normalizePosition(positionY ?? previous.positionY),
      scale: normalizeScale(scale ?? previous.scale)
    }));
  }, [positionX, positionY, scale]);

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

  function commitAdjustments(nextValues: ImageAdjustmentValues) {
    setAdjustments(nextValues);
    onAdjustmentChange?.(nextValues);
  }

  function updateAdjustment(key: keyof ImageAdjustmentValues, nextValue: number) {
    commitAdjustments({
      ...adjustments,
      [key]: key === "scale" ? normalizeScale(nextValue) : normalizePosition(nextValue)
    });
    setNotice(null);
  }

  function resetAdjustments() {
    commitAdjustments(DEFAULT_ADJUSTMENTS);
  }

  function selectFile(file: File | null) {
    setNotice(null);
    setLastUploadedUrl(null);

    if (!file) {
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      commitAdjustments(previousAdjustmentsRef.current);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      commitAdjustments(previousAdjustmentsRef.current);
      setNotice({ tone: "error", message: "Image must be 5MB or smaller." });
      return;
    }

    if (!isSupportedImage(file)) {
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      commitAdjustments(previousAdjustmentsRef.current);
      setNotice({ tone: "error", message: "Upload a JPG, PNG or WebP image." });
      return;
    }

    if (!selectedFile) {
      previousAdjustmentsRef.current = adjustments;
    }
    setSelectedFile(file);
    setSelectedPreviewUrl(URL.createObjectURL(file));
    commitAdjustments(DEFAULT_ADJUSTMENTS);
    setNotice({ tone: "info", message: "Preview ready. Upload this image before saving to use it." });
    setAdjustOpen(true);
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      setNotice({ tone: "error", message: "Choose an image first." });
      return;
    }

    setUploading(true);
    setNotice({ tone: "info", message: "Uploading..." });
    setLastUploadedUrl(null);

    try {
      const payload = new FormData();
      payload.set("kind", uploadKind);
      payload.set("image", selectedFile);

      const response = await fetch("/api/circle-card/upload", {
        method: "POST",
        body: payload
      });
      const data = (await response.json().catch(() => ({}))) as UploadResponse;
      const uploadedImageUrl = readUploadedImageUrl(data);

      if (!response.ok || !uploadedImageUrl) {
        setSelectedPreviewUrl(null);
        commitAdjustments(previousAdjustmentsRef.current);
        setNotice({ tone: "error", message: uploadFailedNotice(data.error) });
        return;
      }

      await preloadUploadedImage(uploadedImageUrl);
      commitImageUrl(uploadedImageUrl);
      setLastUploadedUrl(uploadedImageUrl);
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      setNotice({ tone: "success", message: uploadSuccessMessage });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setSelectedPreviewUrl(null);
      commitAdjustments(previousAdjustmentsRef.current);
      setNotice({ tone: "error", message: uploadFailedNotice() });
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    commitImageUrl("");
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    setNotice(null);
    setLastUploadedUrl(null);
    commitAdjustments(DEFAULT_ADJUSTMENTS);
    setAdjustOpen(false);
    setNotice({ tone: "success", message: "Cleared. Save to keep this change." });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {positionXName ? <input type="hidden" name={positionXName} value={adjustments.positionX} /> : null}
      {positionYName ? <input type="hidden" name={positionYName} value={adjustments.positionY} /> : null}
      {scaleName ? <input type="hidden" name={scaleName} value={adjustments.scale} /> : null}

      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="grid gap-3 sm:grid-cols-[104px_minmax(0,1fr)]">
          <div
            className={cn(
              "relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-gold/24 bg-background/38 text-xs font-semibold text-muted shadow-inner-surface",
              previewClassName
            )}
          >
            {previewUrl || fallbackImageSrc ? (
              <CircleCardFramedImage
                src={previewUrl}
                fallbackSrc={fallbackImageSrc}
                alt={previewUrl ? previewAlt : ""}
                positionX={adjustments.positionX}
                positionY={adjustments.positionY}
                scale={adjustments.scale}
              >
                <ImagePlus size={22} aria-hidden="true" />
              </CircleCardFramedImage>
            ) : (
              <ImagePlus size={22} aria-hidden="true" />
            )}
            {uploading ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/72 text-[10px] font-medium text-foreground backdrop-blur-[1px]">
                <Loader2 size={16} className="animate-spin text-gold" aria-hidden="true" />
                Uploading...
              </span>
            ) : null}
          </div>

          <div className="min-w-0 space-y-2">
            <Input
              id={id}
              name={name}
              value={imageUrl}
              placeholder="https://..."
              onChange={(event) => {
                setNotice(null);
                setLastUploadedUrl(null);
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
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={14} />
                Choose
              </Button>
              {showAdjustments && hasImageToAdjust ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={uploading}
                  onClick={() => setAdjustOpen((open) => !open)}
                >
                  <SlidersHorizontal size={14} />
                  Adjust
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!selectedFile || uploading}
                onClick={uploadSelectedFile}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? "Uploading" : "Upload"}
              </Button>
              {imageUrl || selectedFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={uploading}
                  onClick={clearImage}
                >
                  <X size={14} />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {showAdjustments && hasImageToAdjust && adjustOpen ? (
          <div className="rounded-2xl border border-silver/14 bg-background/22 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-xs text-muted">
                <span className="flex items-center justify-between gap-2">
                  Position X <span className="text-silver">{adjustments.positionX}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={adjustments.positionX}
                  className="w-full accent-primary"
                  onChange={(event) => updateAdjustment("positionX", Number(event.target.value))}
                />
              </label>
              <label className="space-y-1.5 text-xs text-muted">
                <span className="flex items-center justify-between gap-2">
                  Position Y <span className="text-silver">{adjustments.positionY}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={adjustments.positionY}
                  className="w-full accent-primary"
                  onChange={(event) => updateAdjustment("positionY", Number(event.target.value))}
                />
              </label>
              <label className="space-y-1.5 text-xs text-muted">
                <span className="flex items-center justify-between gap-2">
                  Zoom <span className="text-silver">{adjustments.scale.toFixed(2)}x</span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={adjustments.scale}
                  className="w-full accent-primary"
                  onChange={(event) => updateAdjustment("scale", Number(event.target.value))}
                />
              </label>
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={resetAdjustments}>
              Reset crop
            </Button>
          </div>
        ) : null}

        {helperText ? <p className="text-xs text-muted">{helperText}</p> : null}
        <p className="text-xs text-silver">{saveReminder}</p>
        {notice ? (
          <p
            aria-live="polite"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              notice.tone === "success"
                ? "text-gold"
                : notice.tone === "error"
                  ? "text-destructive"
                  : "text-muted"
            )}
          >
            {notice.tone === "success" ? <CheckCircle2 size={13} /> : null}
            {notice.tone === "error" ? <AlertCircle size={13} /> : null}
            {notice.message}
          </p>
        ) : null}
        {lastUploadedUrl ? (
          <p className="break-all text-xs text-silver">
            Uploaded URL: <span className="font-medium text-foreground">{lastUploadedUrl}</span>
          </p>
        ) : imageUrl ? (
          <p className="break-all text-xs text-muted">
            {currentImageValueLabel}: <span className="text-silver">{imageUrl}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
