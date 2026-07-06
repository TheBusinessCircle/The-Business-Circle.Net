"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCardBackButton } from "@/components/circle-card/circle-card-back-button";
import { BackToTopButton } from "@/components/ui/back-to-top-button";
import { CIRCLE_CARD_DASHBOARD_PATH } from "@/lib/circle-card/routes";

const NAVIGATION_ORIGIN_KEY = "circle-card:navigation-origin";
const RESTORE_TARGET_KEY = "circle-card:restore-target";
const SCROLL_KEY_PREFIX = "circle-card:scroll:";
const PREFETCH_ROUTES = [
  CIRCLE_CARD_DASHBOARD_PATH,
  `${CIRCLE_CARD_DASHBOARD_PATH}/studio`,
  `${CIRCLE_CARD_DASHBOARD_PATH}/wallet`
] as const;

function locationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

function scrollStorageKey(key: string) {
  return `${SCROLL_KEY_PREFIX}${key}`;
}

function internalCircleCardUrl(anchor: HTMLAnchorElement) {
  if (anchor.target || anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  const isCircleCardPath =
    url.pathname === CIRCLE_CARD_DASHBOARD_PATH ||
    url.pathname.startsWith(`${CIRCLE_CARD_DASHBOARD_PATH}/`);
  return url.origin === window.location.origin && isCircleCardPath
    ? url
    : null;
}

export function CircleCardWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const pendingAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const nestedPage = pathname !== CIRCLE_CARD_DASHBOARD_PATH;

  useEffect(() => {
    const prefetch = () => PREFETCH_ROUTES.forEach((route) => router.prefetch(route));
    const timeoutId = window.setTimeout(prefetch, 250);
    return () => window.clearTimeout(timeoutId);
  }, [router]);

  useEffect(() => {
    pendingRef.current = false;
    pendingAnchorRef.current?.removeAttribute("data-circle-card-pending");
    pendingAnchorRef.current = null;
    setPending(false);

    const current = locationKey();
    const restoreTarget = window.sessionStorage.getItem(RESTORE_TARGET_KEY);
    if (restoreTarget === current) {
      window.sessionStorage.removeItem(RESTORE_TARGET_KEY);
      const savedScroll = Number(window.sessionStorage.getItem(scrollStorageKey(current)) ?? 0);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll })));
    }
  }, [routeKey]);

  useEffect(() => {
    function rememberScroll() {
      window.sessionStorage.setItem(scrollStorageKey(locationKey()), String(window.scrollY));
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor) return;
      const target = internalCircleCardUrl(anchor);
      if (!target || target.pathname === window.location.pathname) return;

      if (pendingRef.current) {
        event.preventDefault();
        return;
      }

      rememberScroll();
      window.sessionStorage.setItem(NAVIGATION_ORIGIN_KEY, locationKey());
      pendingRef.current = true;
      pendingAnchorRef.current = anchor;
      anchor.setAttribute("data-circle-card-pending", "true");
      setPending(true);
    }

    function handlePageHide() {
      rememberScroll();
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return (
    <div className="circle-card-workspace-shell" data-route-pending={pending ? "true" : "false"}>
      <div className="circle-card-route-progress" role="progressbar" aria-label="Loading page" aria-hidden={!pending} />
      {nestedPage ? (
        <div className="circle-card-back-row">
          <CircleCardBackButton />
        </div>
      ) : null}
      <div key={pathname} className="circle-card-page-transition">
        {children}
      </div>
      <BackToTopButton />
    </div>
  );
}
