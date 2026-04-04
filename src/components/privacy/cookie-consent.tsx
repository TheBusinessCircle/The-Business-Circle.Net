"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ACCEPT_ALL_COOKIE_CONSENT,
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  COOKIE_SETTINGS_OPEN_EVENT,
  DEFAULT_COOKIE_CONSENT,
  type CookieConsentState,
  type OptionalCookieConsentCategory,
  normalizeCookieConsent,
  parseCookieConsentFromCookieString,
  serializeCookieConsentValue
} from "@/lib/cookie-consent";
import { cn } from "@/lib/utils";

const COOKIE_CATEGORIES: Array<{
  key: keyof CookieConsentState;
  title: string;
  description: string;
  locked?: boolean;
}> = [
  {
    key: "necessary",
    title: "Strictly necessary",
    description:
      "Required for security, login, core site functionality, and essential platform operations. These are always active.",
    locked: true
  },
  {
    key: "analytics",
    title: "Analytics",
    description:
      "Help us understand how people use the site so we can improve performance, journeys, and content."
  },
  {
    key: "marketing",
    title: "Marketing",
    description:
      "Used to measure campaign performance and support future marketing activity, if enabled."
  },
  {
    key: "preferences",
    title: "Preferences",
    description:
      "Remember settings and choices to improve your experience on future visits."
  }
];

function readStoredConsent() {
  if (typeof document === "undefined") {
    return null;
  }

  return parseCookieConsentFromCookieString(document.cookie);
}

function writeConsentCookie(consent: CookieConsentState) {
  if (typeof document === "undefined") {
    return;
  }

  const serializedConsent = encodeURIComponent(serializeCookieConsentValue(consent));
  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie =
    `${COOKIE_CONSENT_COOKIE_NAME}=${serializedConsent}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
}

function syncConsentAttributes(consent: CookieConsentState | null) {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedConsent = consent ?? DEFAULT_COOKIE_CONSENT;

  document.documentElement.dataset.cookieConsent = consent ? "set" : "pending";
  document.documentElement.dataset.cookieNecessary = "granted";
  document.documentElement.dataset.cookieAnalytics = resolvedConsent.analytics ? "granted" : "denied";
  document.documentElement.dataset.cookieMarketing = resolvedConsent.marketing ? "granted" : "denied";
  document.documentElement.dataset.cookiePreferences = resolvedConsent.preferences ? "granted" : "denied";
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden"));
}

function Toggle({
  checked,
  disabled = false,
  onPressedChange
}: {
  checked: boolean;
  disabled?: boolean;
  onPressedChange?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onPressedChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-0",
        checked
          ? "border-gold/45 bg-gold/20"
          : "border-border/80 bg-background/45",
        disabled ? "cursor-not-allowed opacity-80" : "hover:border-gold/40"
      )}
    >
      <span
        className={cn(
          "ml-1 block h-5 w-5 rounded-full bg-foreground shadow-sm transition-transform duration-200",
          checked ? "translate-x-5 bg-gold" : "translate-x-0 bg-silver/90"
        )}
      />
      <span className="sr-only">{checked ? "Enabled" : "Disabled"}</span>
    </button>
  );
}

export function CookieConsent() {
  const [isReady, setIsReady] = useState(false);
  const [storedConsent, setStoredConsent] = useState<CookieConsentState | null>(null);
  const [draftConsent, setDraftConsent] = useState<CookieConsentState>(DEFAULT_COOKIE_CONSENT);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const nextConsent = readStoredConsent();

    setStoredConsent(nextConsent);
    setDraftConsent(nextConsent ?? DEFAULT_COOKIE_CONSENT);
    syncConsentAttributes(nextConsent);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOpenSettings = () => {
      const nextConsent = readStoredConsent() ?? DEFAULT_COOKIE_CONSENT;
      setDraftConsent(nextConsent);
      setIsPreferencesOpen(true);
    };

    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettings);

    return () => {
      window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettings);
    };
  }, []);

  useEffect(() => {
    if (!isPreferencesOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusDialog = () => {
      const modal = modalRef.current;

      if (!modal) {
        return;
      }

      const focusable = getFocusableElements(modal);
      (focusable[0] ?? modal).focus();
    };

    focusDialog();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreferencesOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const modal = modalRef.current;

      if (!modal) {
        return;
      }

      const focusable = getFocusableElements(modal);

      if (!focusable.length) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPreferencesOpen]);

  const shouldShowBanner = isReady && !storedConsent && !isPreferencesOpen;

  const persistConsent = (consent: CookieConsentState) => {
    writeConsentCookie(consent);
    syncConsentAttributes(consent);
    setStoredConsent(consent);
    setDraftConsent(consent);
    setIsPreferencesOpen(false);
  };

  const handleAcceptAll = () => {
    persistConsent(ACCEPT_ALL_COOKIE_CONSENT);
  };

  const handleRejectNonEssential = () => {
    persistConsent(DEFAULT_COOKIE_CONSENT);
  };

  const handleSavePreferences = () => {
    persistConsent(normalizeCookieConsent(draftConsent));
  };

  const toggleCategory = (category: OptionalCookieConsentCategory) => {
    setDraftConsent((current) =>
      normalizeCookieConsent({
        ...current,
        [category]: !current[category]
      })
    );
  };

  if (!isReady) {
    return null;
  }

  return (
    <>
      {shouldShowBanner ? (
        <div className="fixed inset-x-4 bottom-4 z-50 md:left-6 md:right-6">
          <div className="mx-auto w-full max-w-[72rem] rounded-[2rem] border border-gold/20 bg-[linear-gradient(180deg,rgba(14,24,46,0.96),rgba(10,18,35,0.94))] p-5 shadow-panel backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <h2 className="font-display text-2xl text-foreground sm:text-[2rem]">
                  Your privacy, your choice
                </h2>
                <p className="text-sm leading-relaxed text-muted sm:text-[0.95rem]">
                  We use cookies to keep The Business Circle running properly and to understand how
                  the site is used. You can accept all cookies, reject non-essential cookies, or
                  manage your preferences at any time.
                </p>
                <Link href="/cookie-policy" className="inline-flex text-sm text-primary hover:underline">
                  Read our Cookie Policy
                </Link>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                <Button size="lg" variant="default" onClick={handleAcceptAll}>
                  Accept all
                </Button>
                <Button size="lg" variant="outline" onClick={handleRejectNonEssential}>
                  Reject non-essential
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setIsPreferencesOpen(true)}>
                  Manage preferences
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isPreferencesOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setIsPreferencesOpen(false)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="w-full max-w-3xl rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(18,28,50,0.98),rgba(10,18,35,0.98))] shadow-panel outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-5 sm:px-7">
              <div className="space-y-3">
                <p className="premium-kicker">Cookie preferences</p>
                <div className="space-y-2">
                  <h2 id={titleId} className="font-display text-3xl text-foreground">
                    Cookie preferences
                  </h2>
                  <p id={descriptionId} className="max-w-2xl text-sm leading-relaxed text-muted">
                    We use some cookies to keep the platform secure and working properly. Optional
                    cookies help us understand usage and improve the experience. You can choose
                    which types you&apos;re happy for us to use.
                  </p>
                </div>
                <Link href="/cookie-policy" className="inline-flex text-sm text-primary hover:underline">
                  Read our Cookie Policy
                </Link>
              </div>

              <button
                type="button"
                aria-label="Close cookie preferences"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/30 text-muted transition-colors hover:border-gold/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-0"
                onClick={() => setIsPreferencesOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
              {COOKIE_CATEGORIES.map((category) => (
                <section
                  key={category.key}
                  className="rounded-[1.6rem] border border-border/80 bg-card/55 px-4 py-4 sm:px-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xl text-foreground">{category.title}</h3>
                        {category.locked ? (
                          <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                            Always active
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{category.description}</p>
                    </div>

                    <div className="shrink-0">
                      <Toggle
                        checked={draftConsent[category.key]}
                        disabled={category.locked}
                        onPressedChange={
                          category.locked
                            ? undefined
                            : () => toggleCategory(category.key as OptionalCookieConsentCategory)
                        }
                      />
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-border/70 px-5 py-5 sm:flex-row sm:flex-wrap sm:justify-end sm:px-7">
              <Button size="lg" variant="default" onClick={handleSavePreferences}>
                Save preferences
              </Button>
              <Button size="lg" variant="secondary" onClick={handleAcceptAll}>
                Accept all
              </Button>
              <Button size="lg" variant="outline" onClick={handleRejectNonEssential}>
                Reject non-essential
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
