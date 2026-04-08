import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  buildAuthModeRedirect,
  buildMembershipSelectionRedirect,
  firstValue,
} from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";

type JoinMobilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Enter The Business Circle through a cinematic branded portal and choose whether to explore the world or move straight into membership.",
  keywords: [
    "join business circle",
    "business circle portal",
    "business owner membership",
    "founder network membership",
    "private business network"
  ],
  path: "/join-mobile"
});

export default async function JoinMobilePage({ searchParams }: JoinMobilePageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const mode = firstValue(params.mode);

  if (mode === "signin") {
    redirect(buildAuthModeRedirect({ from, error }));
  }

  redirect(
    buildMembershipSelectionRedirect({
      from,
      tier: firstValue(params.tier),
      interval: firstValue(params.interval),
      billing: firstValue(params.billing),
      invite: firstValue(params.invite),
      auth: firstValue(params.auth),
      coreAccessConfirmed: firstValue(params.coreAccessConfirmed)
    })
  );
}
