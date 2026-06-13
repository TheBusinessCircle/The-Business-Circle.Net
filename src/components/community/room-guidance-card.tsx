"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageSquarePlus,
  Pin,
  Sparkles
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { CommunityRoomGuidance } from "@/lib/community/room-guidance";
import { cn } from "@/lib/utils";

type RoomGuidanceCardProps = {
  guidance: CommunityRoomGuidance;
  roomSlug: string;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
  defaultCollapsed?: boolean;
  showCta?: boolean;
  compact?: boolean;
};

function GuidanceCta({
  href,
  label,
  className
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const content = (
    <>
      {label}
      <MessageSquarePlus size={15} className="ml-2" />
    </>
  );

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function RoomGuidanceCard({
  guidance,
  roomSlug,
  ctaHref,
  ctaLabel,
  className,
  defaultCollapsed = false,
  showCta = true,
  compact = false
}: RoomGuidanceCardProps) {
  const storageKey = `bcn:room-guidance:${roomSlug}:collapsed`;
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const resolvedCtaHref = ctaHref ?? guidance.pinnedCtaAction?.href ?? "#start-community-post";
  const resolvedCtaLabel = ctaLabel ?? guidance.pinnedCtaLabel;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "1") {
        setIsCollapsed(true);
      }
      if (saved === "0") {
        setIsCollapsed(false);
      }
    } catch {
      // Local preference is a convenience only.
    }
  }, [storageKey]);

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // Local preference is a convenience only.
      }
      return next;
    });
  }

  if (compact) {
    return (
      <section
        className={cn(
          "overflow-hidden rounded-lg border border-silver/14 bg-background/16",
          className
        )}
        aria-label={`${guidance.title} room guidance`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left"
          aria-expanded={!isCollapsed}
        >
          <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
            <Pin size={13} className="shrink-0 text-silver" />
            Room guide
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-silver">
            {isCollapsed ? "Open" : "Close"}
            {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </span>
        </button>

        {!isCollapsed ? (
          <div className="space-y-3 border-t border-silver/12 px-3 py-3">
            <p className="text-sm leading-relaxed text-muted">{guidance.whatThisRoomIsFor}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                  Good posts
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">
                  {guidance.howToPost.slice(0, 4).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                  Easy starts
                </p>
                <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">
                  {guidance.suggestedPrompts.slice(0, 2).map((prompt) => (
                    <p key={prompt}>{prompt}</p>
                  ))}
                </div>
              </div>
            </div>
            {showCta ? (
              <GuidanceCta
                href={resolvedCtaHref}
                label={resolvedCtaLabel}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "min-h-9")}
              />
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-gold/24 bg-gradient-to-br from-gold/10 via-card/82 to-card/68 shadow-gold-soft",
        className
      )}
      aria-label={`${guidance.title} room guidance`}
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.08]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" />

        <div className="relative space-y-4 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-gold">
                <Pin size={12} />
                Room guidance
              </p>
              <h2 className="mt-2 font-display text-2xl leading-tight text-foreground sm:text-3xl">
                {guidance.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                {guidance.shortIntro}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showCta ? (
                <GuidanceCta
                  href={resolvedCtaHref}
                  label={resolvedCtaLabel}
                  className={cn(buttonVariants({ size: "sm" }), "min-h-9")}
                />
              ) : null}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-silver/18 bg-background/24 px-3 text-xs font-medium text-silver transition-colors hover:border-silver/30 hover:text-foreground"
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? "Show guide" : "Hide guide"}
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
          </div>

          {isCollapsed ? (
            <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-3">
              <p className="text-sm leading-relaxed text-muted">
                {guidance.whatThisRoomIsFor}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(280px,0.72fr)]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                    What this room is for
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/88">
                    {guidance.whatThisRoomIsFor}
                  </p>
                </div>

                <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                    Good things to post here
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                    {guidance.howToPost.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/80" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 md:col-span-2">
                  <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-silver">
                    <Lightbulb size={12} />
                    Easy way to start
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {guidance.suggestedPrompts.map((prompt) => (
                      <div
                        key={prompt}
                        className="rounded-xl border border-silver/12 bg-background/18 px-3 py-3 text-sm leading-relaxed text-muted"
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-4">
                  <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-gold">
                    <Sparkles size={12} />
                    Example post prompt
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {guidance.examplePost}
                  </p>
                </div>

                {guidance.tierContext ? (
                  <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                      Why this room exists
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {guidance.tierContext}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
