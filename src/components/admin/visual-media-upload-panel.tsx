"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, ImageIcon, Loader2, Monitor, Smartphone, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  submitVisualMediaPlacementAssetRemovalAction,
  submitVisualMediaPlacementUploadAction
} from "@/actions/admin/visual-media.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { VisualMediaAdminPreviewFamily, VisualMediaUploadMode } from "@/lib/visual-media/types";

type VisualMediaUploadPanelProps = {
  placementKey: string;
  placementLabel: string;
  mode: VisualMediaUploadMode;
  returnPath: string;
  family: VisualMediaAdminPreviewFamily;
  savedImageUrl: string | null;
  altText: string;
};

type InlineMessage =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

function previewFrameClassName(family: VisualMediaAdminPreviewFamily) {
  switch (family) {
    case "hero":
      return "aspect-[16/8.5] rounded-[1.25rem]";
    case "editorial":
      return "aspect-[4/3] rounded-[1.15rem]";
    case "founders":
      return "aspect-[5/4] rounded-[1.15rem]";
    default:
      return "aspect-[5/4] rounded-[1.15rem]";
  }
}

function placeholderClassName(family: VisualMediaAdminPreviewFamily) {
  switch (family) {
    case "hero":
      return "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.1),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(8,15,31,0.86))]";
    case "editorial":
      return "bg-[linear-gradient(180deg,rgba(14,21,40,0.92),rgba(10,17,33,0.84)),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,24px_24px]";
    case "founders":
      return "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(8,15,31,0.88))]";
    default:
      return "bg-[radial-gradient(circle_at_top,rgba(192,192,192,0.08),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(8,15,31,0.86))]";
  }
}

function modeLabel(mode: VisualMediaUploadMode) {
  return mode === "desktop" ? "Desktop image" : "Mobile image";
}

export function VisualMediaUploadPanel({
  placementKey,
  placementLabel,
  mode,
  returnPath,
  family,
  savedImageUrl,
  altText
}: VisualMediaUploadPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [inlineMessage, setInlineMessage] = useState<InlineMessage>(null);
  const [pendingAction, setPendingAction] = useState<"upload" | "remove" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  function resetSelection() {
    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setSelectedPreviewUrl(null);
    setSelectedFileName(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }

    if (!nextFile) {
      setSelectedPreviewUrl(null);
      setSelectedFileName(null);
      return;
    }

    setSelectedPreviewUrl(URL.createObjectURL(nextFile));
    setSelectedFileName(nextFile.name);
    setInlineMessage(null);
  }

  function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = inputRef.current?.files?.[0] ?? null;

    if (!file) {
      setInlineMessage({
        tone: "error",
        text: "Choose an image before uploading."
      });
      return;
    }

    const formData = new FormData();
    formData.set("key", placementKey);
    formData.set("returnPath", returnPath);
    formData.set("mode", mode);
    formData.set("file", file);

    setInlineMessage(null);
    setPendingAction("upload");

    startTransition(async () => {
      try {
        const result = await submitVisualMediaPlacementUploadAction(formData);

        setInlineMessage({
          tone: result.ok ? "success" : "error",
          text: result.message
        });

        if (result.ok) {
          resetSelection();
          router.refresh();
        }
      } catch {
        setInlineMessage({
          tone: "error",
          text: "Upload could not be completed right now."
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleRemove() {
    const formData = new FormData();
    formData.set("key", placementKey);
    formData.set("returnPath", returnPath);
    formData.set("mode", mode);

    setInlineMessage(null);
    setPendingAction("remove");

    startTransition(async () => {
      try {
        const result = await submitVisualMediaPlacementAssetRemovalAction(formData);

        setInlineMessage({
          tone: result.ok ? "success" : "error",
          text: result.message
        });

        if (result.ok) {
          resetSelection();
          router.refresh();
        }
      } catch {
        setInlineMessage({
          tone: "error",
          text: "Remove could not be completed right now."
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  const effectivePreviewUrl = selectedPreviewUrl || savedImageUrl;
  const isUploadPending = isPending && pendingAction === "upload";
  const isRemovePending = isPending && pendingAction === "remove";
  const hasSelectedFile = Boolean(selectedFileName);
  const hasSavedAsset = Boolean(savedImageUrl);
  const modeIcon =
    mode === "desktop" ? (
      <Monitor size={14} className="text-silver" />
    ) : (
      <Smartphone size={14} className="text-silver" />
    );

  return (
    <form
      onSubmit={handleUploadSubmit}
      encType="multipart/form-data"
      className="space-y-4 rounded-[1.5rem] border border-white/8 bg-background/16 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {modeIcon}
            <p className="text-sm font-medium text-foreground">{modeLabel(mode)}</p>
          </div>
          <p className="text-xs leading-5 text-muted">
            {mode === "desktop"
              ? "Upload the primary image used on larger breakpoints."
              : "Upload an alternate crop optimised for narrow screens."}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]",
            hasSelectedFile
              ? "border-gold/30 bg-gold/10 text-gold"
              : hasSavedAsset
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-silver/16 bg-silver/10 text-silver"
          )}
        >
          {hasSelectedFile ? "Local preview ready" : hasSavedAsset ? "Saved asset attached" : "No asset yet"}
        </span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden border border-white/10 bg-background/28",
          previewFrameClassName(family)
        )}
      >
        {effectivePreviewUrl ? (
          <img
            src={effectivePreviewUrl}
            alt={altText}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-full items-center justify-center px-4 text-center text-sm text-muted",
              placeholderClassName(family)
            )}
          >
            <div className="space-y-2">
              <p className="text-sm text-foreground/82">No image selected yet</p>
              <p className="text-xs text-muted">Choose a file to preview it here before upload.</p>
            </div>
          </div>
        )}

        {hasSelectedFile ? (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-gold/20 bg-background/82 px-3 py-2 text-xs text-gold shadow-lg backdrop-blur">
            Previewing {selectedFileName}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${placementKey}-${mode}-file`}>{modeLabel(mode)}</Label>
        <Input
          ref={inputRef}
          id={`${placementKey}-${mode}-file`}
          name="file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isPending}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{selectedFileName ?? `No ${mode} file selected for ${placementLabel}.`}</span>
          {hasSelectedFile ? (
            <button
              type="button"
              onClick={resetSelection}
              className="inline-flex items-center gap-1 text-silver transition hover:text-foreground"
            >
              <X size={12} />
              Clear selection
            </button>
          ) : null}
        </div>
      </div>

      {inlineMessage ? (
        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            inlineMessage.tone === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
          )}
        >
          <div className="flex items-start gap-2">
            {inlineMessage.tone === "success" ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
            ) : (
              <ImageIcon size={14} className="mt-0.5 shrink-0 text-red-200" />
            )}
            <p className="leading-6">{inlineMessage.text}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!hasSelectedFile || isPending}>
          {isUploadPending ? (
            <>
              <Loader2 size={14} className="mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={14} className="mr-1" />
              {savedImageUrl ? `Replace ${mode}` : `Upload ${mode}`}
            </>
          )}
        </Button>

        {savedImageUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={handleRemove}
          >
            {isRemovePending ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 size={14} className="mr-1" />
                Remove saved image
              </>
            )}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
