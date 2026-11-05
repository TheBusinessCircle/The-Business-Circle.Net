import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { BcnShell } from "@/components/bcn-v2/shell";
import { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

export function PublicAreaShell({ children }: { children: ReactNode }) {
  return <AppShell header={<PublicHeader />} footer={<PublicFooter />}>{children}</AppShell>;
}

export function AuthAreaShell({ children }: { children: ReactNode }) {
  if (isBcnV2Enabled()) return <BcnShell><section className="v2-section"><div className="v2-wrap">{children}</div></section></BcnShell>;
  return (
    <AppShell
      header={<PublicHeader />}
      footer={<PublicFooter />}
      contentClassName="py-8 sm:py-10 lg:py-12"
    >
      {children}
    </AppShell>
  );
}
