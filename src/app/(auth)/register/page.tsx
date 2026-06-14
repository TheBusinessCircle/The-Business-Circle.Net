import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleCardRegisterForm } from "@/components/auth/circle-card-register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/auth/utils";
import { buildJoinConfirmationRedirect, firstValue } from "@/lib/join/routing";
import { isCircleCardRegistrationSource } from "@/lib/circle-card/routes";
import { prisma } from "@/lib/prisma";
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

  if (isCircleCardRegistrationSource(firstValue(params.source))) {
    const claimToken = firstValue(params.claim);
    const returnTo = safeRedirectPath(firstValue(params.returnTo), "");
    const sourceCardSlugCandidate = firstValue(params.sourceCardSlug);
    const sourceCardSlug =
      sourceCardSlugCandidate && /^[a-z0-9-]+$/i.test(sourceCardSlugCandidate)
        ? sourceCardSlugCandidate
        : "";
    const claimContact =
      claimToken && /^[a-f0-9]{64}$/i.test(claimToken)
        ? await prisma.circleWalletContact.findUnique({
            where: { claimToken },
            select: {
              fullName: true,
              businessName: true,
              email: true
            }
          })
        : null;

    return (
      <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <Card className="border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle className="font-display text-3xl">
              Circle Card is free. BCN membership stays separate.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted">
            <p>
              Create a public card, save contacts into Circle Wallet, track basic activity and
              install the mobile web app with the same BCN account system.
            </p>
            <p>
              Community, calls, resources, messaging, founder rooms and member dashboards remain
              for paid BCN members.
            </p>
          </CardContent>
        </Card>

        <CircleCardRegisterForm
          returnTo={returnTo}
          sourceCardSlug={sourceCardSlug}
          defaults={{
            name: claimContact?.fullName ?? "",
            email: claimContact?.email ?? "",
            businessName: claimContact?.businessName ?? ""
          }}
        />
      </div>
    );
  }

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

