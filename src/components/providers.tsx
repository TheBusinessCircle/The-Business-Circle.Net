"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { PostHogProvider } from "@/components/analytics/posthog-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PostHogProvider>{children}</PostHogProvider>
    </SessionProvider>
  );
}
