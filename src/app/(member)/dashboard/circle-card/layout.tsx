import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { CircleCardWorkspaceShell } from "@/components/circle-card/circle-card-workspace-shell";
import { CIRCLE_CARD_PWA_METADATA } from "@/lib/circle-card/metadata";

export const metadata: Metadata = CIRCLE_CARD_PWA_METADATA;

export default function CircleCardDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="circle-card-page-transition">{children}</div>}>
      <CircleCardWorkspaceShell>{children}</CircleCardWorkspaceShell>
    </Suspense>
  );
}
