import type { Metadata } from "next";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";

export const metadata: Metadata = createCircleCardPageMetadata(
  {
    title: "Circle Card Teams",
    description: "Explore the planned Circle Card experience for teams.",
    path: "/teams"
  },
  "circle-card"
);

export { default } from "@/app/(public)/circle-card/teams/page";
