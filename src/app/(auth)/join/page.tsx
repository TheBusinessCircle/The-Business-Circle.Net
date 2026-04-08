import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  buildAuthModeRedirect,
  buildMembershipSelectionRedirect,
  firstValue
} from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Use the public join link to enter the right Business Circle join experience for your device.",
  keywords: [
    "join business circle",
    "business circle join",
    "business owner membership",
    "founder network membership",
    "private business network"
  ],
  path: "/join"
});

export default async function JoinPage({ searchParams }: JoinPageProps) {
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
