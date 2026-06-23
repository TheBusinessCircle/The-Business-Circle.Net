"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Sparkles, X } from "lucide-react";
import {
  markAllCircleCardNotificationsReadAction,
  markCircleCardNotificationReadAction
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  circleCardNotificationHref,
  circleCardNotificationTypeLabel
} from "@/lib/circle-card/notifications";
import { cn } from "@/lib/utils";

export type CircleCardNotificationOrbItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

type CircleCardNotificationOrbProps = {
  unreadCount: number;
  notifications: CircleCardNotificationOrbItem[];
  returnPath: string;
  className?: string;
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function badgeLabel(unreadCount: number) {
  if (unreadCount > 99) {
    return "99+";
  }

  return String(unreadCount);
}

function NotificationItem({
  notification,
  returnPath,
  compact = false
}: {
  notification: CircleCardNotificationOrbItem;
  returnPath: string;
  compact?: boolean;
}) {
  const actionHref = circleCardNotificationHref(notification.type, notification.entityType);

  return (
    <article
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border p-3 transition-colors",
        notification.isRead
          ? "border-silver/12 bg-background/22"
          : "border-gold/24 bg-gold/10 shadow-[0_0_28px_rgba(56,189,248,0.08)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "normal-case tracking-normal",
                notification.isRead ? "border-silver/16 text-silver" : "border-gold/28 text-gold"
              )}
            >
              {circleCardNotificationTypeLabel(notification.type, notification.entityType)}
            </Badge>
            {!notification.isRead ? (
              <span className="h-2 w-2 rounded-full bg-[#38bdf8] shadow-[0_0_16px_rgba(56,189,248,0.85)]" />
            ) : null}
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {notification.title}
          </h3>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">
            {notification.message}
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-muted">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>

      <div className={cn("mt-3 grid gap-2", compact ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-0 gap-2")}
        >
          Open
          <ArrowUpRight size={14} />
        </Link>
        {!notification.isRead ? (
          <form action={markCircleCardNotificationReadAction}>
            <input type="hidden" name="notificationId" value={notification.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Button type="submit" size="sm" className="w-full gap-2">
              <CheckCircle2 size={14} />
              Mark read
            </Button>
          </form>
        ) : (
          <div className="flex min-h-9 items-center rounded-md border border-silver/12 px-3 text-xs text-muted">
            Read{notification.readAt ? ` ${formatRelativeTime(notification.readAt)}` : ""}
          </div>
        )}
      </div>
    </article>
  );
}

export function CircleCardNotificationOrb({
  unreadCount,
  notifications,
  returnPath,
  className
}: CircleCardNotificationOrbProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );
  const recentNotifications = useMemo(
    () => notifications.filter((notification) => notification.isRead).slice(0, 4),
    [notifications]
  );
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    const badgeNavigator = navigator as BadgeNavigator;

    async function updateAppBadge() {
      try {
        if (unreadCount > 0 && badgeNavigator.setAppBadge) {
          await badgeNavigator.setAppBadge(Math.min(unreadCount, 99));
          return;
        }

        if (badgeNavigator.clearAppBadge) {
          await badgeNavigator.clearAppBadge();
          return;
        }

        if (badgeNavigator.setAppBadge) {
          await badgeNavigator.setAppBadge(0);
        }
      } catch {
        // Browser badge support is optional and must never affect the workspace UI.
      }
    }

    void updateAppBadge();
  }, [unreadCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={
          hasUnread
            ? `Open Circle Card notifications, ${unreadCount} unread`
            : "Open Circle Card notifications"
        }
        title="Circle Card notifications"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/70",
          hasUnread
            ? "border-gold/50 bg-[#071426] text-gold shadow-[0_0_24px_rgba(56,189,248,0.34),inset_0_0_18px_rgba(214,168,79,0.12)]"
            : "border-silver/16 bg-[#071426]/72 text-silver/80 shadow-inner-surface hover:border-gold/28 hover:text-gold"
        )}
      >
        {hasUnread ? (
          <span
            className="absolute inset-0 rounded-full border border-[#38bdf8]/30 opacity-70 shadow-[0_0_26px_rgba(56,189,248,0.48)] motion-safe:animate-pulse"
            aria-hidden="true"
          />
        ) : null}
        <span className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_35%_25%,rgba(214,168,79,0.34),transparent_34%),radial-gradient(circle_at_70%_78%,rgba(56,189,248,0.28),transparent_36%),linear-gradient(145deg,#071426,#020617)]" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-gold/28 bg-[#020617]/72 text-[11px] font-semibold leading-none text-gold">
          {hasUnread ? badgeLabel(unreadCount) : <Sparkles size={13} />}
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close Circle Card notifications"
            className="fixed inset-0 z-[60] border-0 bg-[#020617]/35 p-0 backdrop-blur-[1px] sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Circle Card notification panel"
            className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-[70] flex max-h-[calc(100dvh_-_max(4.75rem,env(safe-area-inset-top))_-_max(1rem,env(safe-area-inset-bottom)))] min-w-0 flex-col overflow-hidden rounded-2xl border border-gold/22 bg-[#050b18]/96 text-foreground shadow-[0_28px_90px_rgba(0,0,0,0.55),0_0_40px_rgba(56,189,248,0.12)] backdrop-blur-xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:max-h-none sm:w-[min(calc(100vw_-_2rem),24rem)]"
          >
            <div className="shrink-0 border-b border-silver/12 bg-[linear-gradient(135deg,rgba(214,168,79,0.13),rgba(56,189,248,0.09),transparent)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-gold">
                    Circle Card Orb
                  </p>
                  <h2 className="mt-1 font-display text-xl text-foreground">Notifications</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Guidance, activity and useful relationship prompts.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close Circle Card notifications"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-silver/16 bg-background/30 text-silver transition-colors hover:border-gold/28 hover:text-gold"
                >
                  <X size={16} />
                </button>
              </div>
              <form action={markAllCircleCardNotificationsReadAction} className="mt-4">
                <input type="hidden" name="returnPath" value={returnPath} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled={!hasUnread}
                >
                  <CheckCircle2 size={14} />
                  Mark all as read
                </Button>
              </form>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:max-h-[min(70vh,34rem)]">
              {unreadNotifications.length ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <p className="text-xs font-semibold text-foreground">Unread</p>
                    <Badge variant="outline" className="border-gold/28 text-gold">
                      {unreadCount}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        returnPath={returnPath}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {recentNotifications.length ? (
                <section>
                  <p className="mb-2 px-1 text-xs font-semibold text-foreground">Recent</p>
                  <div className="space-y-2">
                    {recentNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        returnPath={returnPath}
                        compact
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {!notifications.length ? (
                <div className="rounded-2xl border border-dashed border-silver/18 bg-background/22 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/24 bg-[#071426] text-gold shadow-[0_0_24px_rgba(56,189,248,0.18)]">
                    <Sparkles size={18} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    Nothing new right now.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Keep building your Circle.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
