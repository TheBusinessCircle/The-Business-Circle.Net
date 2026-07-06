"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallOutcome = "accepted" | "dismissed" | null;

type InstallDeviceState = {
  ready: boolean;
  standalone: boolean;
  installed: boolean;
  dismissed: boolean;
  ios: boolean;
  iosSafari: boolean;
  android: boolean;
  androidChrome: boolean;
  outcome: InstallOutcome;
};

type CircleCardInstallPromptProps = {
  className?: string;
  variant?: "top" | "settings";
  showManualFallback?: boolean;
};

const DISMISS_KEY = "circle-card-install-prompt-dismissed-v2";
const INSTALLED_KEY = "circle-card-installed-v1";
const OUTCOME_KEY = "circle-card-install-outcome-v1";
const STATE_CHANGE_EVENT = "circle-card-install-state-change";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

const INITIAL_STATE: InstallDeviceState = {
  ready: false,
  standalone: false,
  installed: false,
  dismissed: false,
  ios: false,
  iosSafari: false,
  android: false,
  androidChrome: false,
  outcome: null
};

function readLocalValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage can be unavailable in hardened browsers.
  }
  window.dispatchEvent(new Event(STATE_CHANGE_EVENT));
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectDeviceState(): InstallDeviceState {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const ios =
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const iosSafari =
    ios &&
    /safari/.test(userAgent) &&
    !/crios|fxios|edgios|opios|duckduckgo/.test(userAgent);
  const android = /android/.test(userAgent);
  const androidChrome =
    android &&
    /chrome/.test(userAgent) &&
    !/edga|opr|opera|samsungbrowser/.test(userAgent);
  const dismissedAt = Number(readLocalValue(DISMISS_KEY) ?? 0);
  const storedOutcome = readLocalValue(OUTCOME_KEY);
  const standalone = isStandalone();

  return {
    ready: true,
    standalone,
    installed: standalone || readLocalValue(INSTALLED_KEY) === "true",
    dismissed: dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_FOR_MS,
    ios,
    iosSafari,
    android,
    androidChrome,
    outcome: storedOutcome === "accepted" || storedOutcome === "dismissed" ? storedOutcome : null
  };
}

function InstallInstructions({ state }: { state: InstallDeviceState }) {
  if (state.ios && state.iosSafari) {
    return (
      <div className="circle-card-install-instructions">
        <p className="font-semibold text-foreground">Add from Safari</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>Tap the Share button in Safari.</li>
          <li>Scroll and tap Add to Home Screen.</li>
          <li>Tap Add.</li>
        </ol>
      </div>
    );
  }

  if (state.ios) {
    return (
      <div className="circle-card-install-instructions">
        <p className="font-semibold text-foreground">Open this page in Safari</p>
        <p className="mt-1.5 text-sm text-muted">
          On iPhone, open this page in Safari to add it to your Home Screen.
        </p>
      </div>
    );
  }

  if (state.android && state.androidChrome) {
    return (
      <div className="circle-card-install-instructions">
        <p className="font-semibold text-foreground">Add from Chrome</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>Open the Chrome menu.</li>
          <li>Tap Add to Home screen or Install app.</li>
          <li>Follow the Add prompt.</li>
        </ol>
      </div>
    );
  }

  if (state.android) {
    return (
      <div className="circle-card-install-instructions">
        <p className="font-semibold text-foreground">Open this page in Chrome</p>
        <p className="mt-1.5 text-sm text-muted">
          In Chrome, open the menu and choose Add to Home screen.
        </p>
      </div>
    );
  }

  return (
    <div className="circle-card-install-instructions">
      <p className="font-semibold text-foreground">Open Circle Card on your phone</p>
      <p className="mt-1.5 text-sm text-muted">
        Open this page in Safari on iPhone or Chrome on Android, then choose Add to Home Screen.
      </p>
    </div>
  );
}

export function CircleCardInstallPrompt({
  className,
  variant = "top",
  showManualFallback = false
}: CircleCardInstallPromptProps) {
  const [state, setState] = useState<InstallDeviceState>(INITIAL_STATE);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [feedback, setFeedback] = useState<InstallOutcome>(null);

  useEffect(() => {
    function refreshState() {
      setState(detectDeviceState());
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      refreshState();
    }

    function onInstalled() {
      writeLocalValue(INSTALLED_KEY, "true");
      writeLocalValue(OUTCOME_KEY, "accepted");
      setDeferredPrompt(null);
      setFeedback("accepted");
      refreshState();
    }

    const displayMode = window.matchMedia("(display-mode: standalone)");
    refreshState();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(STATE_CHANGE_EVENT, refreshState);
    displayMode.addEventListener?.("change", refreshState);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(STATE_CHANGE_EVENT, refreshState);
      displayMode.removeEventListener?.("change", refreshState);
    };
  }, []);

  async function addToPhone() {
    setFeedback(null);

    if (!deferredPrompt) {
      setInstructionsOpen(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setFeedback(choice.outcome);
      writeLocalValue(OUTCOME_KEY, choice.outcome);
      if (choice.outcome === "accepted") {
        setInstructionsOpen(false);
      }
    } catch {
      setDeferredPrompt(null);
      setInstructionsOpen(true);
    }
  }

  function maybeLater() {
    writeLocalValue(DISMISS_KEY, String(Date.now()));
  }

  const installed = state.standalone || state.installed;
  const settingsVariant = variant === "settings";
  const shouldOfferManualHelp = showManualFallback || state.ios;
  const visibleOutcome = feedback ?? state.outcome;
  const showTopPrompt =
    state.ready && !installed && !state.dismissed && (Boolean(deferredPrompt) || shouldOfferManualHelp);

  if (!state.ready || (!settingsVariant && !showTopPrompt)) {
    return null;
  }

  if (settingsVariant) {
    return (
      <section
        aria-labelledby="circle-card-install-settings-title"
        className={cn(
          "rounded-2xl border border-gold/18 bg-[linear-gradient(145deg,hsl(var(--card)/0.76),hsl(var(--background)/0.46))] p-4 shadow-inner-surface sm:p-5",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
            {installed ? <CheckCircle2 size={19} /> : <Smartphone size={19} />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="circle-card-install-settings-title" className="font-display text-lg text-foreground">
              Install Circle Card
            </h3>
            <p className="mt-1 text-sm text-muted">
              {installed
                ? "Circle Card is installed on this device."
                : state.dismissed || state.outcome === "dismissed"
                  ? "You can still add Circle Card to your phone here."
                  : "Open Circle Card faster. It works like an app, with no app store needed."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!installed ? (
                <Button type="button" size="sm" className="gap-2" onClick={addToPhone}>
                  <Download size={14} />
                  Add to phone
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setInstructionsOpen((open) => !open)}
                >
                  <ExternalLink size={14} />
                  Reinstall help
                </Button>
              )}
            </div>
          </div>
        </div>

        {visibleOutcome ? (
          <p className="mt-3 text-sm text-silver" role="status">
            {visibleOutcome === "accepted"
              ? "Circle Card was accepted for installation."
              : "Circle Card was not added. You can try again here whenever you’re ready."}
          </p>
        ) : null}
        {instructionsOpen ? <InstallInstructions state={state} /> : null}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="circle-card-install-top-title"
      className={cn(
        "rounded-2xl border border-gold/22 bg-[linear-gradient(135deg,rgba(11,31,79,0.78),rgba(7,17,38,0.94))] p-3.5 shadow-panel-soft backdrop-blur sm:p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
          <Smartphone size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="circle-card-install-top-title" className="text-sm font-semibold text-foreground">
            Add Circle Card to your phone
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Add Circle Card to your phone for faster access. Works like an app. No app store needed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="gap-2" onClick={addToPhone}>
              {state.ios ? <Share2 size={14} /> : <Download size={14} />}
              Add to phone
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={maybeLater}>
              Maybe later
            </Button>
          </div>
        </div>
      </div>

      {visibleOutcome ? (
        <p className="mt-3 text-sm text-silver" role="status">
          {visibleOutcome === "accepted"
            ? "Circle Card was accepted for installation."
            : "Circle Card was not added. You can try again from Settings."}
        </p>
      ) : null}
      {instructionsOpen ? <InstallInstructions state={state} /> : null}
    </section>
  );
}
