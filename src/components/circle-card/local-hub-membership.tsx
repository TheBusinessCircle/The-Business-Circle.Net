import "server-only";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CIRCLE_CARD_DISCOVER_VISIBLE_WHERE } from "@/lib/circle-card/privacy";
import { getLocalHubPath, HUCKNALL_HUB_SLUG } from "@/lib/circle-card/local-hubs";
import { HUCKNALL_HUB_CARD_ID } from "@/lib/circle-card/hucknall-content";
import { getPublicCircleCard } from "@/server/circle-card/public-card.service";

// Rendered by the shared public route, including Free, Pro and bespoke presentations.
// Membership is read afresh, rather than copied into a business's About text or links.
export async function LocalHubMembership({ cardId, isDemo }: { cardId: string; isDemo: boolean }) {
  if (isDemo || cardId === HUCKNALL_HUB_CARD_ID) return null;
  const member = await prisma.circleCard.findFirst({
    where: { id: cardId, ...CIRCLE_CARD_DISCOVER_VISIBLE_WHERE,
      businessPostcode: { startsWith: "NG15 " }, user: { suspended: false } },
    select: { cardType: true, businessPostcode: true, isPublished: true, showInDiscover: true, archivedAt: true }
  });
  const hubPath = member && getLocalHubPath(member);
  if (!hubPath) return null;
  const hub = await getPublicCircleCard(HUCKNALL_HUB_SLUG);
  if (!hub || hub.isDemo || hub.id !== HUCKNALL_HUB_CARD_ID) return null;
  return (
    <aside aria-label="Local Circle Hub membership" className="border-b border-gold/20 bg-[#07101f] px-4 py-3 text-center">
      <Link href={hubPath} className="inline-flex min-h-11 flex-wrap items-center justify-center gap-x-2 rounded-full border border-gold/30 bg-gold/10 px-5 py-2 text-sm text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
        <span>Part of Hucknall Circle Hub</span>
        <span className="text-xs text-slate-300">Explore businesses in Hucknall &amp; NG15 <span aria-hidden="true">&rarr;</span></span>
      </Link>
    </aside>
  );
}
