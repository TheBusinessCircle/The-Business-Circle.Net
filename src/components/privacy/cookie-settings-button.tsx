"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { COOKIE_SETTINGS_OPEN_EVENT } from "@/lib/cookie-consent";
import { cn } from "@/lib/utils";

type CookieSettingsButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function CookieSettingsButton({
  className,
  onClick,
  children = "Cookie settings",
  type = "button",
  ...props
}: CookieSettingsButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented || typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event(COOKIE_SETTINGS_OPEN_EVENT));
  };

  return (
    <button
      type={type}
      className={cn("transition-colors hover:text-foreground", className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
