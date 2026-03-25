"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type FeedSubmitButtonProps = ButtonProps & {
  children: ReactNode;
  pendingLabel?: string;
};

export function FeedSubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: FeedSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending || disabled} {...props}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          {pendingLabel ?? "Saving..."}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
