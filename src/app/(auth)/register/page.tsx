import type { Metadata } from "next";
import { CircleCardRegisterForm } from "@/components/auth/circle-card-register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/auth/utils";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { normalizeCircleCardReferralCode } from "@/lib/circle-card/referral-engine";
import { firstValue } from "@/lib/join/routing";
import { prisma } from "@/lib/prisma";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  return createCircleCardPageMetadata({
    title: "Create Free Circle Card",
    description: "Create your free Circle Card account.",
    path: "/register",
    noIndex: true
  });
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  const claimToken = firstValue(params.claim);
  const returnTo = safeRedirectPath(
    firstValue(params.returnTo),
    "/dashboard/circle-card/onboarding"
  );
  const sourceCardSlugCandidate = firstValue(params.sourceCardSlug);
  const referralCode = normalizeCircleCardReferralCode(
    firstValue(params.ref) || firstValue(params.referralCode)
  );
  const sourceCardSlug =
    sourceCardSlugCandidate && /^[a-z0-9-]+$/i.test(sourceCardSlugCandidate)
      ? sourceCardSlugCandidate.toLowerCase()
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
            install the mobile web app with the same secure account system.
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
        referralCode={referralCode}
        defaults={{
          name: claimContact?.fullName ?? "",
          email: claimContact?.email ?? "",
          businessName: claimContact?.businessName ?? ""
        }}
      />
    </div>
  );
}

