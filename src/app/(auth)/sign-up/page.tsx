import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

  redirect(
    buildJoinConfirmationRedirect({
      from: firstValue(params.from),
      tier: firstValue(params.tier),
      interval: firstValue(params.interval),
      period: firstValue(params.period),
      billing: firstValue(params.billing),
      invite: firstValue(params.invite),
      auth: "register",
      coreAccessConfirmed: firstValue(params.coreAccessConfirmed)
    })
  );
}
