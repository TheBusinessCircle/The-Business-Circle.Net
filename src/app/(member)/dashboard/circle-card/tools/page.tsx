import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, LockKeyhole, Plus, Search, Sparkles, Wrench, X } from "lucide-react";
import { setCircleCardMyToolPinnedAction } from "@/actions/circle-card-my-tools.actions";
import { CircleCardPageHeader } from "@/components/circle-card/circle-card-page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CIRCLE_CARD_CURRENT_CARD_COOKIE, normalizeCircleCardCurrentCardId } from "@/lib/circle-card/current-card-preference";
import { CIRCLE_CARD_MY_TOOLS, myToolEditorHref, readMyToolsShelf, type MyTool, type MyToolsFamily } from "@/lib/circle-card/my-tools";
import { CIRCLE_CARD_PLAN_ORDER, selectCircleCardsWithinPlan } from "@/lib/circle-card/plan-policy";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { loadCircleCardAccessForUser } from "@/server/circle-card";

export const metadata: Metadata = {
  title: "My Tools | Circle Card",
  description: "Choose useful Creator and Business tools for your Circle Card."
};
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function catalogueUrl(cardId: string, filter: MyToolsFamily, query?: string) {
  const params = new URLSearchParams({ cardId, filter: filter.toLowerCase() });
  if (query) params.set("q", query);
  return "/dashboard/circle-card/tools?" + params.toString();
}

function ToolTile({
  tool, cardId, cardType, hasProAccess, pinned
}: {
  tool: MyTool;
  cardId: string;
  cardType: string;
  hasProAccess: boolean;
  pinned: boolean;
}) {
  const href = myToolEditorHref(tool, cardId, cardType, hasProAccess);
  const wrongCardType = Boolean(tool.editorCardType && tool.editorCardType !== cardType);
  const blockedByPlan = Boolean(tool.proOnly && !hasProAccess);
  const isFuture = tool.stage !== "editor";

  return (
    <article className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-silver/16 bg-card/60 p-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{tool.family === "CREATOR" ? "Creator" : "Business"}</Badge>
          {tool.stage === "recovery" ? <Badge variant="muted">Under review</Badge> : null}
          {tool.stage === "future" ? <Badge variant="muted">Coming later</Badge> : null}
          {tool.proOnly ? <Badge variant="premium">Pro</Badge> : null}
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground">{tool.title}</h3>
        <p className="text-sm leading-relaxed text-muted">{tool.description}</p>
        {wrongCardType && tool.stage === "editor" ? (
          <p className="text-xs text-muted">Can be saved here. Mixed-card editing is being prepared; the existing editor currently requires a {tool.editorCardType === "BUSINESS" ? "Business" : "Creator"} Card.</p>
        ) : null}
        {blockedByPlan && tool.stage === "editor" ? (
          <p className="text-xs text-muted">Requires an active Pro subscription to use the editor.</p>
        ) : null}
        {isFuture ? (
          <p className="text-xs text-muted">Save this tool to your workspace for later. No new public feature is activated.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <form action={setCircleCardMyToolPinnedAction}>
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="toolId" value={tool.id} />
          <input type="hidden" name="operation" value={pinned ? "unpin" : "pin"} />
          <Button type="submit" variant={pinned ? "outline" : "default"} size="sm" className="gap-1.5">
            {pinned ? <X size={14} /> : <Plus size={14} />}
            {pinned ? "Remove from My Tools" : "Add to My Tools"}
          </Button>
        </form>
        {href ? (
          <Link href={href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}>
            Open editor <ArrowUpRight size={14} />
          </Link>
        ) : blockedByPlan && tool.stage === "editor" ? (
          <Link href="/circle-card/pro" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}>
            <LockKeyhole size={14} /> Explore Pro
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default async function CircleCardMyToolsPage({ searchParams }: Props) {
  const session = await requireCircleCardUser();
  const params = await searchParams;
  const [cards, access, cookieStore] = await Promise.all([
    prisma.circleCard.findMany({
      where: { userId: session.user.id, archivedAt: null },
      orderBy: [...CIRCLE_CARD_PLAN_ORDER],
      select: {
        id: true, slug: true, fullName: true, businessName: true, cardType: true,
        isPublished: true, isDefaultCard: true, isPrimary: true,
        displayOrder: true, createdAt: true, contentBlocks: true
      }
    }),
    loadCircleCardAccessForUser(session.user.id),
    cookies()
  ]);

  const allowedCards = selectCircleCardsWithinPlan(cards, access.limits.circleCards);
  if (!allowedCards.length) {
    return (
      <main className="page-shell py-8">
        <CircleCardPageHeader title="My Tools" description="Create a Circle Card to begin." />
        <Link href="/dashboard/circle-card/onboarding" className={buttonVariants({ variant: "default" })}>Create your card</Link>
      </main>
    );
  }

  const requested = first(params.cardId);
  const persisted = normalizeCircleCardCurrentCardId(cookieStore.get(CIRCLE_CARD_CURRENT_CARD_COOKIE)?.value);
  const card = allowedCards.find((item) => item.id === requested)
    ?? allowedCards.find((item) => item.id === persisted)
    ?? allowedCards[0];

  const requestedFilter = first(params.filter)?.toUpperCase();
  const filter: MyToolsFamily = requestedFilter === "CREATOR" || requestedFilter === "BUSINESS"
    ? requestedFilter : card.cardType === "CREATOR" ? "CREATOR" : "BUSINESS";
  const q = (first(params.q) ?? "").trim().slice(0, 80);
  const selected = readMyToolsShelf(card.contentBlocks);
  const pinnedSet = new Set<string>(selected);
  const tools = CIRCLE_CARD_MY_TOOLS.filter((tool) =>
    tool.family === filter &&
    (!q || (tool.title + " " + tool.description).toLowerCase().includes(q.toLowerCase()))
  );
  const pinned = CIRCLE_CARD_MY_TOOLS.filter((tool) => pinnedSet.has(tool.id));

  return (
    <main className="page-shell space-y-6 pb-16 pt-4 sm:pt-6">
      <Link href="/dashboard/circle-card" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> Back to Circle Card
      </Link>
      <CircleCardPageHeader
        title="My Tools"
        icon={<Wrench size={20} />}
        description="Choose tools that fit you. Creator and Business are filters, not limits."
        badge={<Badge variant="outline">{access.hasProAccess ? "Pro workspace" : "Free workspace"}</Badge>}
      >
        Save a shortcut from either category to the same card. Your existing editors control what appears publicly.
        Saving a shortcut alone never publishes content or unlocks paid tools.
      </CircleCardPageHeader>

      {allowedCards.length > 1 ? (
        <nav aria-label="Choose a card" className="flex flex-wrap gap-2">
          {allowedCards.map((item) => (
            <Link key={item.id} href={catalogueUrl(item.id, filter, q)}
              className={buttonVariants({ variant: item.id === card.id ? "default" : "outline", size: "sm" })}>
              {item.businessName || item.fullName}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className="rounded-2xl border border-gold/20 bg-gold/8 p-4 sm:p-5" aria-label="Your saved tools">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Your My Tools shelf</h2>
          <Badge variant="outline">{pinned.length} saved</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">For {card.businessName || card.fullName}. Saved tools appear here regardless of category.</p>
        {pinned.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {pinned.map((tool) => {
              const href = myToolEditorHref(tool, card.id, card.cardType, access.hasProAccess);
              return href ? (
                <Link key={tool.id} href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {tool.title} <ArrowUpRight size={12} />
                </Link>
              ) : (
                <span key={tool.id} className="rounded-lg border border-silver/16 bg-background/30 px-3 py-2 text-xs text-muted">
                  {tool.title}
                </span>
              );
            })}
          </div>
        ) : <p className="mt-3 text-sm text-muted">Your shelf is empty. Pick tools from either category below.</p>}
      </section>

      <section className="space-y-4" aria-label="Discover tools">
        <nav aria-label="Tool category" className="grid grid-cols-2 gap-2">
          <Link href={catalogueUrl(card.id, "CREATOR", q)}
            aria-current={filter === "CREATOR" ? "page" : undefined}
            className={cn("flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold", filter === "CREATOR" ? "border-gold/40 bg-gold/12 text-foreground" : "border-silver/16 text-muted hover:text-foreground")}>
            <Sparkles size={17} /> Creator Tools
          </Link>
          <Link href={catalogueUrl(card.id, "BUSINESS", q)}
            aria-current={filter === "BUSINESS" ? "page" : undefined}
            className={cn("flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold", filter === "BUSINESS" ? "border-gold/40 bg-gold/12 text-foreground" : "border-silver/16 text-muted hover:text-foreground")}>
            <BriefcaseBusiness size={17} /> Business Tools
          </Link>
        </nav>
        <form method="GET" action="/dashboard/circle-card/tools" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="cardId" value={card.id} />
          <input type="hidden" name="filter" value={filter.toLowerCase()} />
          <label htmlFor="my-tools-search" className="min-w-[180px] flex-1 text-xs text-muted">
            Search {filter === "CREATOR" ? "Creator" : "Business"} tools
            <Input id="my-tools-search" name="q" defaultValue={q} maxLength={80} placeholder="Search tools" className="mt-1" />
          </label>
          <Button type="submit" variant="outline" className="gap-2"><Search size={15} /> Search</Button>
        </form>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <ToolTile key={tool.id} tool={tool} cardId={card.id} cardType={card.cardType}
              hasProAccess={access.hasProAccess} pinned={pinnedSet.has(tool.id)} />
          ))}
        </div>
        {!tools.length ? <p className="text-sm text-muted">No matching tools. Try a different search.</p> : null}
      </section>
    </main>
  );
}
