"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";
import { trackCircleCardEvent } from "@/lib/circle-card/analytics-client";
import { cn } from "@/lib/utils";

type CircleCardCopyLinkButtonProps = {
  publicUrl: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  analytics?: {
    cardId: string;
    eventType?: CircleCardEventTypeValue;
    source?: string;
  };
};

function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

export function CircleCardCopyLinkButton({
  publicUrl,
  label = "Copy Link",
  variant = "outline",
  size = "default",
  className,
  analytics
}: CircleCardCopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyToClipboard(publicUrl);
      if (analytics?.cardId) {
        trackCircleCardEvent({
          cardId: analytics.cardId,
          eventType: analytics.eventType ?? "CONNECT_HUB_COPY_LINK",
          metadata: {
            method: "copy_link",
            source: analytics.source ?? "connect_hub"
          }
        });
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("gap-2", className)}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied" : label}
    </Button>
  );
}
