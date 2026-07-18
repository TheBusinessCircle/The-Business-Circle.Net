import type { Metadata } from "next";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";

export const metadata: Metadata = createCircleCardPageMetadata(
  {
    title: "Circle Card Pro",
    description: "Explore the professional tools available with Circle Card Pro.",
    path: "/pro"
  },
  "circle-card"
);

export { default } from "@/app/(public)/circle-card/pro/page";
