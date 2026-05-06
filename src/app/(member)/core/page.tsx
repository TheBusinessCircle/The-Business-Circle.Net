import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier } from "@prisma/client";
import { ArrowUpRight, CheckCircle2, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccessTier, roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = createPageMetadata({
  title: "Core",
  description:
    "Core is the highest-signal member tier inside The Business Circle for stronger access, sharper proximity, and premium visibility.",
  path: "/core"
});

const CORE_CHANGE_BULLETS = [
  "Highest member visibility and strongest profile signal",
  "Priority access to deeper rooms, events, and strategic opportunities",
  "Stronger recognition across the member environment",
  "Closer access to premium conversations and selected opportunities",
  "Best positioning for serious collaboration inside BCN"
] as const;

const CORE_DIFFERENCE_CARDS = [
  {
    title: "Strongest signal",
    description:
      "Core members are instantly recognisable as the highest commitment tier inside the environment."
  },
  {
    title: "Priority proximity",
    description:
      "Core gives members the clearest path into deeper conversations, stronger opportunities, and selected higher-level rooms."
  },
  {
    title: "Premium visibility",
    description:
      "Core members stand out across profile views and relevant discovery surfaces."
  },
  {
    title: "Strategic access",
    description:
      "Core sits closest to the strongest BCN opportunities, Growth Architect access, and curated business conversations."
  }
] as const;

const CORE_GET_ITEMS = [
  "Core profile tier badge and premium profile styling",
  "Highest member discovery signal",
  "Priority access to selected sessions and opportunities",
  "Deeper rooms and strategic discussions",
  "Preferred visibility for collaboration and referrals",
  "Strongest member rate positioning for Growth Architect services where eligible",
  "Future priority access to BCN pilots, events, and early features where appropriate"
] as const;

function ValueCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-gold/30 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function CorePage() {
  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const hasCoreAccess = canAccessTier(effectiveTier, MembershipTier.CORE);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-gold/45 bg-[radial-gradient(circle_at_86%_0%,rgba(214,180,103,0.24),transparent_34%),linear-gradient(145deg,rgba(214,180,103,0.14),rgba(15,8,24,0.88)_52%,rgba(7,3,12,0.94))] shadow-[0_28px_82px_rgba(214,180,103,0.2)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="core">
              <ShieldCheck size={12} className="mr-1" />
              Core
            </Badge>
            <Badge variant="outline" className="border-gold/45 bg-gold/12 text-gold">
              <Crown size={12} className="mr-1" />
              Highest access
            </Badge>
          </div>
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.12em] text-gold">Core</p>
            <CardTitle className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              The highest-signal room inside The Business Circle.
            </CardTitle>
            <CardDescription className="mt-4 text-base leading-relaxed">
              Core is built for owners who want stronger access, sharper proximity, and a more
              visible role inside the private business environment.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-gold/38 bg-[radial-gradient(circle_at_92%_0%,rgba(214,180,103,0.18),transparent_32%),linear-gradient(145deg,rgba(214,180,103,0.12),rgba(15,8,24,0.84)_56%,rgba(8,4,13,0.9))]">
          <CardHeader>
            <CardTitle>What changes at Core</CardTitle>
            <CardDescription>
              Core is the premium operator layer, built for the strongest visibility, strategic
              proximity, and the clearest member signal inside BCN.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm text-muted sm:grid-cols-2">
              {CORE_CHANGE_BULLETS.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-gold/42 bg-gold/10">
          <CardHeader>
            <CardTitle>
              {hasCoreAccess ? "You are already inside Core" : "Upgrade to Core"}
            </CardTitle>
            <CardDescription>
              {hasCoreAccess
                ? "Use Core visibility and strategic access to stay closer to the strongest BCN opportunities."
                : "Move above Inner Circle when the business needs the strongest signal and closest strategic room."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href={hasCoreAccess ? "/dashboard" : "/membership?tier=core"}>
              <Button variant="core" className="w-full justify-center">
                {hasCoreAccess ? "Go to Dashboard" : "Compare Membership Options"}
                <ArrowUpRight size={14} className="ml-2" />
              </Button>
            </Link>
            <Link href="/inner-circle">
              <Button variant="outline" className="w-full justify-center">
                Compare with Inner Circle
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-gold">Why Core is different</p>
          <h2 className="mt-2 font-display text-2xl text-foreground">
            The strongest signal, proximity, and visibility layer.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CORE_DIFFERENCE_CARDS.map((card) => (
            <ValueCard key={card.title} title={card.title} description={card.description} />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
              <Sparkles size={12} className="mr-1" />
              Premium operator tier
            </Badge>
          </div>
          <CardTitle>What you get</CardTitle>
          <CardDescription>
            Core sits above Inner Circle with the strongest profile signal, priority visibility,
            and closest route into selected BCN opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CORE_GET_ITEMS.map((item) => (
              <div key={item} className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-3 text-sm text-muted">
                <CheckCircle2 size={15} className="mr-2 inline text-gold" />
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
