"use client";

import { useEffect } from "react";

const CIRCLE_CARD_SECTIONS = new Set(["home", "my-card", "network", "business", "share", "settings"]);

function findAnchor(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

function dispatchOpenEvent(targetId: string | null) {
  if (!targetId) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("circle-card-open-section", {
      detail: { targetId }
    })
  );
}

function scrollToSection(section: string, targetId: string | null) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const target = targetId
        ? document.getElementById(targetId)
        : document.querySelector<HTMLElement>(`[data-circle-card-section="${section}"]`);

      const moduleDetails = target?.querySelector<HTMLDetailsElement>("[data-circle-card-module-details]");
      if (moduleDetails) {
        moduleDetails.open = true;
      }

      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
    });
  });
}

function setActiveSection(section: string) {
  document.querySelectorAll<HTMLElement>("[data-circle-card-section]").forEach((element) => {
    element.classList.toggle("hidden", element.dataset.circleCardSection !== section);
  });

  document.querySelectorAll<HTMLElement>("[data-circle-card-section-tab]").forEach((element) => {
    const active = element.dataset.circleCardSectionTab === section;
    element.dataset.active = active ? "true" : "false";
    if (active) {
      element.setAttribute("aria-current", "page");
    } else {
      element.removeAttribute("aria-current");
    }
  });
}

function activateFromUrl(url: URL, updateHistory: boolean) {
  const requestedSection = url.searchParams.get("section");
  const section = requestedSection === "wallet" ? "network" : requestedSection;

  if (!section || !CIRCLE_CARD_SECTIONS.has(section)) {
    return false;
  }

  const targetId = url.hash ? decodeURIComponent(url.hash.slice(1)) : null;
  setActiveSection(section);
  dispatchOpenEvent(targetId);

  if (updateHistory) {
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  scrollToSection(section, targetId);
  return true;
}

export function CircleCardSectionRouter() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = findAnchor(event.target);
      if (!anchor || anchor.target || anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || url.pathname !== "/dashboard/circle-card") {
        return;
      }

      if (activateFromUrl(url, true)) {
        event.preventDefault();
      }
    }

    function handlePopState() {
      activateFromUrl(new URL(window.location.href), false);
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return null;
}
