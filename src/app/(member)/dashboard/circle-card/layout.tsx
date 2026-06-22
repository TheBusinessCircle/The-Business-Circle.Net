import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CIRCLE_CARD_PWA_METADATA } from "@/lib/circle-card/metadata";

export const metadata: Metadata = CIRCLE_CARD_PWA_METADATA;

export default function CircleCardDashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
