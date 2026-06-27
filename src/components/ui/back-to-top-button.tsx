"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackToTopButtonProps = {
  className?: string;
  threshold?: number;
};

export function BackToTopButton({ className, threshold = 640 }: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > threshold);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, [threshold]);

  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 h-11 gap-2 rounded-full border border-gold/35 bg-background/94 px-3 text-gold shadow-[0_14px_45px_rgba(0,0,0,0.38)] backdrop-blur transition-all sm:bottom-20 sm:px-4",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        className
      )}
    >
      <ArrowUp size={16} />
      <span className="hidden sm:inline">Back to top</span>
    </Button>
  );
}
