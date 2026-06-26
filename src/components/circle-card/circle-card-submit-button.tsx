"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type CircleCardSubmitStatus = {
  success: boolean;
  submittedAt?: number;
};

const CircleCardSubmitStatusContext = createContext<CircleCardSubmitStatus | null>(null);

export function CircleCardSubmitStatusProvider({
  value,
  children
}: {
  value: CircleCardSubmitStatus;
  children: ReactNode;
}) {
  return (
    <CircleCardSubmitStatusContext.Provider value={value}>
      {children}
    </CircleCardSubmitStatusContext.Provider>
  );
}

type CircleCardSubmitButtonProps = Omit<ButtonProps, "type"> & {
  pendingLabel?: string;
  pendingChildren?: ReactNode;
  savedLabel?: string;
  savedChildren?: ReactNode;
};

export function CircleCardSubmitButton({
  children,
  disabled,
  pendingLabel = "Saving...",
  pendingChildren,
  savedLabel = "Saved",
  savedChildren,
  ...props
}: CircleCardSubmitButtonProps) {
  const { pending } = useFormStatus();
  const saveStatus = useContext(CircleCardSubmitStatusContext);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!saveStatus?.success || !saveStatus.submittedAt) {
      setShowSaved(false);
      return undefined;
    }

    setShowSaved(true);
    const timeout = window.setTimeout(() => setShowSaved(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [saveStatus?.success, saveStatus?.submittedAt]);

  return (
    <Button {...props} type="submit" disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending
        ? pendingChildren ?? (
            <>
              <Loader2 size={15} className="animate-spin" />
              {pendingLabel}
            </>
          )
        : showSaved
          ? savedChildren ?? (
              <>
                <CheckCircle2 size={15} />
                {savedLabel}
              </>
            )
        : children}
    </Button>
  );
}
