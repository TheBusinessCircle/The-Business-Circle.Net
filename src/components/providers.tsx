"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { RuntimeBrandProvider } from "@/components/runtime-brand-provider";
import type { RuntimeBrandKey } from "@/config/runtime-brand";

export function Providers({
  children,
  runtimeBrand
}: {
  children: ReactNode;
  runtimeBrand: RuntimeBrandKey;
}) {
  return (
    <RuntimeBrandProvider brand={runtimeBrand}>
      <SessionProvider>
        <PostHogProvider>{children}</PostHogProvider>
      </SessionProvider>
    </RuntimeBrandProvider>
  );
}
