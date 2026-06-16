"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type CircleCardSubmitButtonProps = Omit<ButtonProps, "type"> & {
  pendingLabel?: string;
  pendingChildren?: ReactNode;
};

export function CircleCardSubmitButton({
  children,
  disabled,
  pendingLabel = "Saving...",
  pendingChildren,
  ...props
}: CircleCardSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending
        ? pendingChildren ?? (
            <>
              <Loader2 size={15} className="animate-spin" />
              {pendingLabel}
            </>
          )
        : children}
    </Button>
  );
}
