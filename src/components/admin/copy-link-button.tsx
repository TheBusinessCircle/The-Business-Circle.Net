"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyLinkButtonProps = {
  value: string;
  label?: string;
};

export function CopyLinkButton({ value, label = "Copy link" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
      {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
