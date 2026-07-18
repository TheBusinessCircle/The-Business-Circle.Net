import type { Metadata } from "next";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";

export const metadata: Metadata = createCircleCardPageMetadata(
  {
    title: "Circle Card Community Standards",
    description: "The standards that support safe and trustworthy use of Circle Card.",
    path: "/community-standards"
  },
  "circle-card"
);

export { default } from "@/app/(public)/circle-card/community-standards/page";
