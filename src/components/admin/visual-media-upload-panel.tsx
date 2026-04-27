"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, ImageIcon, Loader2, Monitor, Smartphone, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  submitVisualMediaPlacementAssetRemovalAction
} from "@/actions/admin/visual-media.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  generationPrompt: string;
};

type InlineMessage =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

type UploadResponse =
  | {
      ok: true;
      message: string;
      imageUrl: string | null;
    }
  | {
      ok: false;
      message: string;
    };

type GenerateResponse =
  | {
      ok: true;
      message: string;
      imageUrl: string;
      prompt: string;
      metadata?: Record<string, unknown>;
    }
  | {
      ok: false;
      message: string;
      error?: string;
      details?: Record<string, unknown> | null;
    };

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
  altText,
  generationPrompt
}: VisualMediaUploadPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [currentSavedImageUrl, setCurrentSavedImageUrl] = useState<string | null>(savedImageUrl);
  const [inlineMessage, setInlineMessage] = useState<InlineMessage>(null);
  const [pendingAction, setPendingAction] = useState<"upload" | "remove" | "generate" | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [generationPromptValue, setGenerationPromptValue] = useState(generationPrompt);
  const [lastGeneratedImageUrl, setLastGeneratedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  useEffect(() => {
    setCurrentSavedImageUrl(savedImageUrl);
  }, [savedImageUrl]);

  useEffect(() => {
    setGenerationPromptValue(generationPrompt);
  }, [generationPrompt]);

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

  async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
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
    setIsUploading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60_000);

    try {
      const response = await fetch("/api/admin/visual-media/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      const result = (await response.json()) as UploadResponse;

      setInlineMessage({
        tone: result.ok ? "success" : "error",
        text: result.message
      });

      if (result.ok) {
        setCurrentSavedImageUrl(result.imageUrl);
        resetSelection();
        router.refresh();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setInlineMessage({
          tone: "error",
          text: "Upload timed out before the server responded. The button has been reset."
        });
      } else {
        setInlineMessage({
          tone: "error",
          text: "Upload could not be completed right now."
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsUploading(false);
      setPendingAction(null);
    }
  }

  async function handleGenerateImage() {
    const prompt = generationPromptValue.trim();

    if (!prompt) {
      setInlineMessage({
        tone: "error",
        text: "Add a prompt before generating an image."
      });
      return;
    }

    setInlineMessage(null);
    setLastGeneratedImageUrl(null);
    setPendingAction("generate");
    setIsGenerating(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 150_000);

    try {
      const response = await fetch("/api/admin/visual-media/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key: placementKey,
          mode,
          prompt
        }),
        signal: controller.signal
      });
      const result = (await response.json()) as GenerateResponse;

      setInlineMessage({
        tone: result.ok ? "success" : "error",
        text: result.message
      });

      if (result.ok) {
        setCurrentSavedImageUrl(result.imageUrl);
        setLastGeneratedImageUrl(result.imageUrl);
        setGenerationPromptValue(result.prompt);
        resetSelection();
        router.refresh();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setInlineMessage({
          tone: "error",
          text: "Image generation timed out before the server responded. The button has been reset."
        });
      } else {
        setInlineMessage({
          tone: "error",
          text: "Image generation could not be completed right now."
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      setPendingAction(null);
    }
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
          setCurrentSavedImageUrl(null);
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

  const effectivePreviewUrl = selectedPreviewUrl || currentSavedImageUrl;
  const isUploadPending = isUploading && pendingAction === "upload";
  const isRemovePending = isPending && pendingAction === "remove";
  const isGeneratePending = isGenerating && pendingAction === "generate";
  const isBusy = isUploading || isPending || isGenerating;
  const hasSelectedFile = Boolean(selectedFileName);
  const hasSavedAsset = Boolean(currentSavedImageUrl);
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
          disabled={isBusy}
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

      <div className="space-y-3 rounded-2xl border border-gold/20 bg-gold/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">AI generation</p>
            <p className="text-xs leading-5 text-muted">
              Generate one image for this slot, upload it to Cloudinary, and attach it here.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => setIsPromptOpen((open) => !open)}
          >
            <Sparkles size={14} className="mr-1" />
            Generate Image
          </Button>
        </div>

        {isPromptOpen ? (
          <div className="space-y-3 border-t border-white/8 pt-3">
            <div className="space-y-2">
              <Label htmlFor={`${placementKey}-${mode}-generation-prompt`}>
                Generation prompt
              </Label>
              <Textarea
                id={`${placementKey}-${mode}-generation-prompt`}
                value={generationPromptValue}
                onChange={(event) => setGenerationPromptValue(event.target.value)}
                rows={10}
                disabled={isBusy}
                className="min-h-[220px] text-xs leading-6"
              />
              <p className="text-xs leading-5 text-muted">
                This is a deliberate one-image action. It will replace the saved {mode} image for this slot.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isBusy || !generationPromptValue.trim()}
                onClick={handleGenerateImage}
              >
                {isGeneratePending ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="mr-1" />
                    Generate and attach {mode}
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => setGenerationPromptValue(generationPrompt)}
              >
                Reset prompt
              </Button>
            </div>

            {lastGeneratedImageUrl ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                Generated image URL: <span className="break-all">{lastGeneratedImageUrl}</span>
              </div>
            ) : null}
          </div>
        ) : null}
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
        <Button type="submit" size="sm" disabled={!hasSelectedFile || isBusy}>
          {isUploadPending ? (
            <>
              <Loader2 size={14} className="mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={14} className="mr-1" />
              {hasSavedAsset ? `Replace ${mode}` : `Upload ${mode}`}
            </>
          )}
        </Button>

        {currentSavedImageUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBusy}
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
