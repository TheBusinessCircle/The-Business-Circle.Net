import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCircleCardRegistrationSource } from "@/lib/circle-card/routes";
import {
  buildJoinConfirmationRedirect,
  firstValue
} from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Join Redirect",
  description: "Redirecting to the Business Circle join page.",
  path: "/sign-up",
  noIndex: true
});

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;

  if (isCircleCardRegistrationSource(firstValue(params.source))) {
    const registerParams = new URLSearchParams({ source: "circle-card" });
    const returnTo = firstValue(params.returnTo);
    const sourceCardSlug = firstValue(params.sourceCardSlug);
    const claim = firstValue(params.claim);

    if (returnTo) {
      registerParams.set("returnTo", returnTo);
    }

    if (sourceCardSlug) {
      registerParams.set("sourceCardSlug", sourceCardSlug);
    }

    if (claim) {
      registerParams.set("claim", claim);
    }

    redirect(`/register?${registerParams.toString()}`);
  }

  redirect(
    buildJoinConfirmationRedirect({
      from: firstValue(params.from),
      tier: firstValue(params.tier),
      interval: firstValue(params.interval),
      period: firstValue(params.period),
      billing: firstValue(params.billing),
      auth: "register",
      coreAccessConfirmed: firstValue(params.coreAccessConfirmed)
    })
  );
}
