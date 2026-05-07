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
      contentClassName="max-w-[1440px] px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 2xl:px-10"
    >
      {children}
    </AppShell>
  );
}
