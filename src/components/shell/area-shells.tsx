import { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

export function PublicAreaShell({ children }: { children: ReactNode }) {
  return <AppShell header={<PublicHeader />} footer={<PublicFooter />}>{children}</AppShell>;
}

export function AuthAreaShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      header={<PublicHeader />}
      footer={<PublicFooter />}
      contentClassName="mx-auto w-full max-w-[1400px] px-6 py-12 lg:px-10 lg:py-16"
    >
      {children}
    </AppShell>
  );
}
