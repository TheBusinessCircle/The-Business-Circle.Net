import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HucknallAboutPageContent } from "@/components/circle-card/hucknall-about";
import { getPublicCircleCard } from "@/server/circle-card/public-card.service";
import { HUCKNALL_ABOUT_TITLE, HUCKNALL_DESCRIPTION, HUCKNALL_HUB_CANONICAL, hucknallStructuredData } from "@/lib/circle-card/hucknall-content";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  if (!await getPublicCircleCard("hucknall-circle-hub")) notFound();
  return { title: HUCKNALL_ABOUT_TITLE, description: HUCKNALL_DESCRIPTION,
    alternates: { canonical: `${HUCKNALL_HUB_CANONICAL}/about` }, robots: { index: true, follow: true },
    openGraph: { title: HUCKNALL_ABOUT_TITLE, description: HUCKNALL_DESCRIPTION, url: `${HUCKNALL_HUB_CANONICAL}/about`, type: "website" } };
}
export default async function AboutHucknallPage() {
  if (!await getPublicCircleCard("hucknall-circle-hub")) notFound();
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hucknallStructuredData()).replace(/</g, "\\u003c") }} /><HucknallAboutPageContent /></>;
}
