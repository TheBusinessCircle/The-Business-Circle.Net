import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleCardOnboardingFlow } from "@/components/circle-card/circle-card-onboarding-flow";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { CIRCLE_CARD_PLAN_DEFINITIONS } from "@/lib/circle-card/plans";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "Circle Card Onboarding",
  description: "Set up your free Circle Card.",
  path: "/dashboard/circle-card/onboarding",
  noIndex: true
});

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-onboarding": "Check the current setup step and try again.",
  "card-limit": "Your current Circle Card access includes one card.",
  "slug-taken": "That public card link is already taken.",
  "card-save-failed": "Your Circle Card could not be created."
};

export default async function CircleCardOnboardingPage({ searchParams }: PageProps) {
  const session = await requireCircleCardUser();
  const params = await searchParams;
  const error = firstValue(params.error);
  const [existingCard, member] = await Promise.all([
    prisma.circleCard.findFirst({
      where: { userId: session.user.id },
      select: { id: true }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        image: true,
        profile: {
          select: {
            headline: true,
            website: true,
            business: {
              select: {
                companyName: true,
                website: true
              }
            }
          }
        }
      }
    })
  ]);

  if (existingCard) {
    redirect("/dashboard/circle-card?created=1");
  }

  return (
    <div className="space-y-6">
      <section className="member-accent-panel rounded-2xl border p-5 sm:p-6">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[hsl(var(--member-accent-text))]">
            {CIRCLE_CARD_PLAN_DEFINITIONS.FREE.label}
          </p>
          <h1 className="mt-3 font-display text-4xl text-foreground sm:text-5xl">
            Set up your first Circle Card
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--member-accent-muted))] sm:text-base">
            Add the essentials now. You can edit the full card, wallet and analytics from the
            Circle Card dashboard after publishing.
          </p>
        </div>
      </section>

      {error && ERROR_MESSAGES[error] ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {ERROR_MESSAGES[error]}
        </p>
      ) : null}

      <CircleCardOnboardingFlow
        defaults={{
          accountType: "",
          identityTags: [],
          fullName: member?.name ?? "",
          businessName: member?.profile?.business?.companyName ?? "",
          role: member?.profile?.headline ?? "",
          tagline: "",
          websiteUrl: member?.profile?.website ?? member?.profile?.business?.website ?? "",
          profileImageUrl: member?.image ?? "",
          businessLogoUrl: "",
          profileImagePositionX: 50,
          profileImagePositionY: 50,
          profileImageScale: 1,
          businessLogoPositionX: 50,
          businessLogoPositionY: 50,
          businessLogoScale: 1,
          showInDiscover: false
        }}
      />
    </div>
  );
}
