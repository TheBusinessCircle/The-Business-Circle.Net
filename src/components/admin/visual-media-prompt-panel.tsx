"use client";

import { useMemo, useState } from "react";
import { Check, Copy, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { VisualMediaPlacementDefinition } from "@/lib/visual-media/types";

type VisualMediaPromptPanelProps = {
  definition: VisualMediaPlacementDefinition;
};

function formatPrompt(definition: VisualMediaPlacementDefinition) {
  const prompt = definition.promptTemplate;

  return [
    "[SCENE TYPE]",
    prompt.sceneType,
    "",
    "[SUBJECT]",
    prompt.subject,
    "",
    "[ENVIRONMENT]",
    prompt.environment,
    "",
    "[LIGHTING]",
    prompt.lighting,
    "",
    "[MOOD]",
    prompt.mood,
    "",
    "[STYLE]",
    prompt.style,
    "",
    "[CAMERA/COMPOSITION]",
    prompt.cameraComposition,
    "",
    "[QUALITY TAGS]",
    prompt.qualityTags,
    "",
    "[NEGATIVE PROMPT]",
    prompt.negativePrompt
  ].join("\n");
}

export function VisualMediaPromptPanel({
  definition
}: VisualMediaPromptPanelProps) {
  const defaultPrompt = useMemo(() => formatPrompt(definition), [definition]);
  const [promptValue, setPromptValue] = useState(defaultPrompt);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-background/16 p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-gold" />
        <p className="text-sm font-medium text-foreground">Image Style &amp; Prompt</p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Style summary</p>
          <p className="text-sm leading-6 text-foreground/88">
            {definition.promptTemplate.styleSummary}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Detailed prompt</p>
            <p className="text-xs text-muted">
              Editable before copy. Local changes are not saved automatically.
            </p>
          </div>
          <Textarea
            value={promptValue}
            onChange={(event) => setPromptValue(event.target.value)}
            rows={20}
            className="min-h-[360px] font-mono text-xs leading-6"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
            {copied ? "Copied" : "Copy Prompt"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setPromptValue(defaultPrompt);
              setCopied(false);
            }}
          >
            <RotateCcw size={14} className="mr-1" />
            Reset Prompt
          </Button>
        </div>
      </div>
    </div>
  );
}
