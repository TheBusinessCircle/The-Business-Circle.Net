"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { trackCircleCardEvent } from "@/lib/circle-card/analytics-client";
import { cn } from "@/lib/utils";

type CircleCardShareButtonProps = {
  title: string;
  publicUrl: string;
  cardId?: string;
  text?: string;
  label?: string;
  analyticsSource?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  buttonClassName?: string;
  statusClassName?: string;
  hideStatus?: boolean;
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

export function CircleCardShareButton({
  title,
  publicUrl,
  cardId,
  text = "Save or share this Circle Card from The Business Circle.",
  label = "Share Card",
  analyticsSource = "public_card",
  variant = "outline",
  size = "default",
  className,
  buttonClassName,
  statusClassName,
  hideStatus = false
}: CircleCardShareButtonProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function shareCard() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: publicUrl
        });
        if (cardId) {
          trackCircleCardEvent({
            cardId,
            eventType: "SHARE",
            metadata: {
              method: "native",
              source: analyticsSource
            }
          });
        }
        setStatus("Shared");
        return;
      }

      await copyToClipboard(publicUrl);
      if (cardId) {
        trackCircleCardEvent({
          cardId,
          eventType: "SHARE",
          metadata: {
            method: "copy_link",
            source: analyticsSource
          }
        });
      }
      setStatus("Link copied");
    } catch {
      setStatus("Share unavailable");
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("w-full gap-2", buttonClassName)}
        onClick={shareCard}
      >
        <Share2 size={16} />
        {label}
      </Button>
      {status && !hideStatus ? (
        <p className={cn("text-center text-xs text-muted", statusClassName)}>{status}</p>
      ) : null}
    </div>
  );
}
