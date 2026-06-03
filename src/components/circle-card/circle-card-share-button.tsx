"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CircleCardShareButtonProps = {
  title: string;
  publicUrl: string;
};

export function CircleCardShareButton({ title, publicUrl }: CircleCardShareButtonProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function shareCard() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url: publicUrl
        });
        setStatus("Shared");
        return;
      }

      await navigator.clipboard.writeText(publicUrl);
      setStatus("Link copied");
    } catch {
      setStatus("Share unavailable");
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" className="w-full gap-2" onClick={shareCard}>
        <Share2 size={16} />
        Share Card
      </Button>
      {status ? <p className="text-center text-xs text-muted">{status}</p> : null}
    </div>
  );
}
