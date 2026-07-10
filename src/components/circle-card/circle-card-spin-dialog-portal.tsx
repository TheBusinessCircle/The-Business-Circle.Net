"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CircleCardSpinDialogPortalProps = {
  open: boolean;
  titleId: string;
  descriptionId: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

export function CircleCardSpinDialogPortal({
  open,
  titleId,
  descriptionId,
  onClose,
  returnFocusRef,
  children
}: CircleCardSpinDialogPortalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    const body = document.body;
    const returnFocusTarget = returnFocusRef.current;
    const previousOverflow = body.style.overflow;
    const previousOverscrollBehavior = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";

    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? dialogRef.current)?.focus({ preventScroll: true });
    });

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousOverscrollBehavior;

      if (returnFocusTarget?.isConnected) {
        returnFocusTarget.focus({ preventScroll: true });
      }
    };
  }, [mounted, onClose, open, returnFocusRef]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <>
      <div
        aria-hidden="true"
        data-spin-to-connect-backdrop
        className="fixed inset-0 z-[9998] bg-[#020617]/72"
        onMouseDown={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-spin-to-connect-dialog
        tabIndex={-1}
        className="pointer-events-none fixed inset-0 z-[9999] flex min-w-0 items-end justify-center overflow-hidden px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-none sm:items-center sm:p-6"
      >
        <div
          data-spin-to-connect-panel
          className="pointer-events-auto max-h-[calc(100dvh-max(1.5rem,env(safe-area-inset-top))-max(1.5rem,env(safe-area-inset-bottom)))] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[1.75rem] rounded-b-2xl border border-gold/28 bg-[#050b18] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left text-foreground opacity-100 shadow-[0_34px_100px_rgba(0,0,0,0.68)] sm:rounded-[1.75rem] sm:p-6"
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
