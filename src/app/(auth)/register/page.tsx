import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildJoinConfirmationRedirect, firstValue } from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Register Redirect",
  description: "Redirecting to the Business Circle join page.",
  path: "/register",
  noIndex: true
});

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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

