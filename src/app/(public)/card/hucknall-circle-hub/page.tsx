import type { Metadata } from "next";
import { HucknallCircleHub } from "@/components/circle-card/hucknall-circle-hub";
import { CIRCLE_CARD_ONBOARDING_PATH } from "@/lib/circle-card/routes";
import { HUCKNALL_HUB_PATH } from "@/lib/circle-card/local-hubs";
import { getHucknallHubBusinesses } from "@/server/circle-card/local-hub.service";

// Visibility and moderation changes must apply on the next request.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hucknall Circle Hub | Local businesses in NG15",
  description: "Discover Hucknall and NG15 businesses in one free local hub. Browse by category and connect through each business's Circle Card.",
  alternates: { canonical: HUCKNALL_HUB_PATH },
  openGraph: { title: "Hucknall Circle Hub", description: "One town. One Circle. Discover local businesses in Hucknall & NG15.", url: HUCKNALL_HUB_PATH }
};

export default async function HucknallHubPage() {
  return <HucknallCircleHub businesses={await getHucknallHubBusinesses()}
    joinPath={`${CIRCLE_CARD_ONBOARDING_PATH}?cardType=BUSINESS`} proPath="/circle-card/pro" />;
}
