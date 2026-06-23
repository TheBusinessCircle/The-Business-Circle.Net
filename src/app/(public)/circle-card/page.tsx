import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ContactRound,
  QrCode,
  ScanLine,
  Star,
  UsersRound,
  WalletCards
} from "lucide-react";
import { auth } from "@/auth";
import { CircleCardInstallPrompt } from "@/components/circle-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CIRCLE_CARD_DASHBOARD_PATH,
  CIRCLE_CARD_ONBOARDING_PATH
} from "@/lib/circle-card/routes";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { normalizeCircleCardReferralCode } from "@/lib/circle-card/referral-engine";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "Circle Card",
  description:
    "Create a professional digital identity, share your QR code, save contacts in Circle Wallet, and keep relationship tools close.",
  path: "/circle-card",
  keywords: [
    "digital business card",
    "business networking card",
    "QR business card",
    "relationship wallet",
    "The Business Circle Card"
  ]
});

const HOW_IT_WORKS = [
  {
    title: "Create your card.",
    icon: ContactRound
  },
  {
    title: "Share your QR.",
    icon: QrCode
  },
  {
    title: "Save contacts.",
    icon: WalletCards
  },
  {
    title: "Build real relationships.",
    icon: UsersRound
  }
] as const;

type CircleCardLandingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CircleCardLandingPage({
  searchParams
}: CircleCardLandingPageProps) {
  const params = await searchParams;
  const referralCode = normalizeCircleCardReferralCode(firstValue(params.ref));

  if (referralCode) {
    redirect(`/r/${referralCode}?source=circle_card_query`);
  }

  const session = await auth();
  const existingCard = session?.user && !session.user.suspended
    ? await prisma.circleCard.findFirst({
        where: { userId: session.user.id },
        select: { id: true }
      })
    : null;
  const primaryCtaHref = session?.user && !session.user.suspended
    ? existingCard
      ? CIRCLE_CARD_DASHBOARD_PATH
      : CIRCLE_CARD_ONBOARDING_PATH
    : "/register?source=circle-card";
  const primaryCtaLabel = session?.user && !session.user.suspended
    ? existingCard
      ? "Open My Circle Card"
      : "Finish Circle Card Setup"
    : "Create Free Circle Card";

  return (
    <div className="public-page-stack">
      <section className="grid gap-6 py-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)] lg:items-center lg:py-10">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.08em] text-gold">
            <ScanLine size={14} />
            Relationship layer
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[0.96] text-foreground sm:text-6xl lg:text-7xl">
            Circle Card
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-silver sm:text-xl">
            More than a digital business card. The relationship layer of The Business Circle.
          </p>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
            Circle Card helps professionals and business owners create a professional digital
            identity, share details instantly with QR codes, save contacts into a wallet, remember
            people they meet, and reconnect later.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryCtaHref}
              className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 sm:w-auto")}
            >
              {primaryCtaLabel}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/card/demo"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2 sm:w-auto")}
            >
              View Demo Card
              <QrCode size={16} />
            </Link>
          </div>
          <CircleCardInstallPrompt className="mt-5 max-w-xl" />
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-silver/18 bg-card/74 p-4 shadow-panel-soft">
            <div className="rounded-[1.5rem] border border-gold/24 bg-[linear-gradient(145deg,rgba(9,19,43,0.96),rgba(6,12,27,0.9))] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                    Circle Card
                  </p>
                  <h2 className="mt-3 font-display text-3xl leading-tight text-foreground">
                    Trev Clarke
                  </h2>
                  <p className="mt-2 text-sm text-silver">Founder, The Business Circle</p>
                </div>
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-background/40">
                  <Image
                    src="/branding/circle-card-logo.png"
                    width={52}
                    height={52}
                    alt="Circle Card logo"
                    className="h-11 w-11 object-contain"
                  />
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                A clean identity layer for the people you meet, the conversations worth remembering,
                and the next step back into the room.
              </p>
              <div className="mt-5 grid grid-cols-[96px_minmax(0,1fr)] gap-4">
                <div className="grid aspect-square grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-white p-2">
                  {Array.from({ length: 25 }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "rounded-[3px]",
                        [0, 1, 2, 5, 10, 11, 12, 18, 20, 21, 22, 23, 24].includes(index)
                          ? "bg-background"
                          : "bg-background/18"
                      )}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-silver/12 bg-background/24 px-3 py-2 text-xs text-silver">
                    thebusinesscircle.net/card/demo
                  </div>
                  <div className="rounded-xl border border-silver/12 bg-background/24 px-3 py-2 text-xs text-muted">
                    Save, favourite, remember.
                  </div>
                  <div className="rounded-xl border border-gold/22 bg-gold/10 px-3 py-2 text-xs text-gold">
                    BCN member signal ready.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {HOW_IT_WORKS.map((item) => (
          <div key={item.title} className="rounded-2xl border border-silver/14 bg-card/62 p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-silver/16 bg-background/28 text-silver">
              <item.icon size={17} />
            </span>
            <p className="mt-4 text-base font-semibold text-foreground">{item.title}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-silver/14 bg-card/62 p-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
            <WalletCards size={18} />
          </div>
          <h2 className="mt-5 font-display text-3xl text-foreground">Circle Wallet</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Users can save cards, favourite contacts, add notes and build a relationship memory
            bank. The foundation starts here, with room for richer reminders and reconnection
            tools in later phases.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-silver/14 bg-background/22 p-5">
            <Building2 size={18} className="text-silver" />
            <h3 className="mt-4 font-display text-xl text-foreground">Built into BCN</h3>
            <p className="mt-2 text-sm text-muted">
              One login, one ecosystem, one network. Circle Card sits inside the member
              environment instead of creating a second identity layer.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/22 p-5">
            <UsersRound size={18} className="text-silver" />
            <h3 className="mt-4 font-display text-xl text-foreground">Teams preview</h3>
            <p className="mt-2 text-sm text-muted">
              Company cards, staff cards, shared branding and team analytics are prepared for a
              later release.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/22 p-5 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <BadgeCheck size={18} className="text-gold" />
              <Star size={18} className="text-silver" />
            </div>
            <h3 className="mt-4 font-display text-xl text-foreground">Relationship memory</h3>
            <p className="mt-2 text-sm text-muted">
              Share the card in the moment, then keep enough context to remember who someone is,
              why they mattered, and when to reconnect.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gold/24 bg-gold/10 p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Circle Card</p>
            <h2 className="mt-2 font-display text-3xl text-foreground">
              Start with a free Circle Card.
            </h2>
          </div>
          <Link href={primaryCtaHref}>
            <Button className="w-full gap-2 md:w-auto">
              {primaryCtaLabel}
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
