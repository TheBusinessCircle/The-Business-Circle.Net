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
      contentClassName="py-8 sm:py-12"
    >
      {children}
    </AppShell>
  );
}
