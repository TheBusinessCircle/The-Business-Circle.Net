"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { BackgroundModeProvider } from "@/components/background-mode/background-mode-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BackgroundModeProvider>
      <SessionProvider>{children}</SessionProvider>
    </BackgroundModeProvider>
  );
}
