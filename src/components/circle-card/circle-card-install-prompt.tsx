"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PromptMode = "hidden" | "install" | "ios";

type CircleCardInstallPromptProps = {
  className?: string;
};

const DISMISS_KEY = "circle-card-install-prompt-dismissed-v1";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, "true");
  } catch {
    // Local storage can be unavailable in hardened browsers.
  }
}

export function CircleCardInstallPrompt({ className }: CircleCardInstallPromptProps) {
  const [mode, setMode] = useState<PromptMode>("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (readDismissed() || isStandalone()) {
      return;
    }

    const iosTimer = window.setTimeout(() => {
      if (isIosDevice()) {
        setMode("ios");
      }
    }, 900);

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      window.clearTimeout(iosTimer);
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode("install");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      writeDismissed();
      setDeferredPrompt(null);
      setMode("hidden");
    } catch {
      setMode("hidden");
    }
  }

  function dismissPrompt() {
    writeDismissed();
    setMode("hidden");
  }

  if (mode === "hidden") {
    return null;
  }

  return (
    <section
      aria-label="Install Circle Card"
      className={cn(
        "rounded-2xl border border-gold/20 bg-[linear-gradient(145deg,rgba(11,31,79,0.72),rgba(7,17,38,0.92))] p-4 shadow-panel-soft backdrop-blur",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
          <Smartphone size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Add Circle Card to your home screen</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Open your card, wallet, and relationship tools like an app.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {mode === "install" ? (
              <Button type="button" size="sm" className="gap-2" onClick={installApp}>
                <Download size={14} />
                Install
              </Button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-silver/16 bg-background/24 px-3 py-1.5 text-xs text-silver">
                <Share2 size={13} />
                Safari Share, then Add to Home Screen
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-silver/14 bg-background/24 text-muted transition-colors hover:border-silver/30 hover:text-foreground"
          onClick={dismissPrompt}
        >
          <X size={15} />
        </button>
      </div>
    </section>
  );
}
