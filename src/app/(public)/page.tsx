import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CircleCardLandingPage from "@/app/(public)/circle-card/page";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { shouldUseMobileJoin } from "@/lib/join/routing";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  if (getRuntimeBrand().key !== "circle-card") {
    return {};
  }

  return createCircleCardPageMetadata(
    {
      title: "Circle Card",
      description:
        "Create a professional digital identity, share your QR code, save contacts in Circle Wallet, and keep relationship tools close.",
      path: "/"
    },
    "circle-card"
  );
}

type SocialEntryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SocialEntryPage({ searchParams }: SocialEntryPageProps) {
  if (getRuntimeBrand().key === "circle-card") {
    return <CircleCardLandingPage searchParams={searchParams} />;
  }

  const session = await auth();

  if (session?.user && !session.user.suspended) {
    trackAnalyticsEvent(ANALYTICS_EVENTS.rootEntry, {
      authenticated: true,
      destination: "/dashboard"
    });
    redirect("/dashboard");
  }

  const headersList = await headers();
  const destination = shouldUseMobileJoin(headersList) ? "/join-mobile" : "/join-desktop";

  trackAnalyticsEvent(ANALYTICS_EVENTS.rootEntry, {
    authenticated: false,
    destination
  });

  redirect(destination);
}
