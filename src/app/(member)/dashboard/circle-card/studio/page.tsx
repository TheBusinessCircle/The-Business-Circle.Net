import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleUserRound, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { CircleStudio } from "@/components/circle-card/circle-studio";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveCircleStudioTokens } from "@/lib/circle-card/theme";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Circle Studio | Circle Card",
  description: "Build a curated Pro identity for your Circle Card."
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CircleStudioPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?from=/dashboard/circle-card/studio");

  const params = await searchParams;
  const requestedCardId = firstValue(params.card);
  const cards = await prisma.circleCard.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: [{ isDefaultCard: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      fullName: true,
      businessName: true,
      role: true,
      tagline: true,
      profileImageUrl: true,
      cardType: true,
      themeMetadata: true
    }
  });

  if (!cards.length) redirect("/dashboard/circle-card?section=my-card");
  const card = cards.find((item) => item.id === requestedCardId) ?? cards[0];
  const canActivate = session.user.role === "ADMIN" || session.user.hasActiveSubscription;

  return (
    <div className="page-shell pb-16 pt-4 sm:pt-6">
      <header className="mb-6 overflow-hidden rounded-[1.75rem] border border-silver/12 bg-[radial-gradient(circle_at_82%_0%,rgba(212,175,95,.14),transparent_34%),linear-gradient(145deg,rgba(8,18,38,.94),rgba(4,9,20,.98))] p-5 shadow-panel-soft sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Link href="/dashboard/circle-card?section=my-card#my-cards" className="inline-flex items-center gap-2 text-xs font-semibold text-silver hover:text-foreground"><ArrowLeft size={14} /> Your Cards</Link>
            <div className="mt-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold"><Sparkles size={20} /></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-3xl text-foreground sm:text-4xl">Circle Studio</h1><Badge variant="premium">Pro</Badge></div><p className="mt-1 text-sm text-muted">Not a theme selector. Your professionally designed identity system.</p></div></div>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-silver">Make your card unmistakably yours while keeping every choice polished, accessible and recognisably Circle Card.</p>
          </div>

          {cards.length > 1 ? <nav aria-label="Choose Circle Card" className="flex flex-wrap gap-2">{cards.map((item) => <Link key={item.id} href={`/dashboard/circle-card/studio?card=${item.id}`} className={cn(buttonVariants({ variant: item.id === card.id ? "default" : "outline", size: "sm" }), "gap-2")}><CircleUserRound size={14} /> {item.businessName || item.fullName}</Link>)}</nav> : null}
        </div>
      </header>

      <CircleStudio
        key={card.id}
        card={card}
        initialTokens={resolveCircleStudioTokens(card)}
        canActivate={canActivate}
        notice={firstValue(params.notice)}
        error={firstValue(params.error)}
      />
    </div>
  );
}
