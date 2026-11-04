import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HUCKNALL_HUB_CARD_ID } from "@/lib/circle-card/hucknall-content";
import { BUSINESS_DIRECTORY_CATEGORIES, HUCKNALL_HUB_PATH } from "@/lib/circle-card/local-hubs";
import { filterPublicCircleCardTargetsWithinOwnerPlans } from "@/server/circle-card/plan-policy.service";
import { saveHucknallMembershipAction } from "@/actions/hucknall-hub.actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join Hucknall Circle Hub", robots: { index: false, follow: false } };
export default async function JoinHucknallPage({ searchParams }: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?from=${encodeURIComponent(`${HUCKNALL_HUB_PATH}/join`)}`);
  const query = await searchParams;
  const cards = await filterPublicCircleCardTargetsWithinOwnerPlans(await prisma.circleCard.findMany({
    where: { userId: session.user.id, id: { not: HUCKNALL_HUB_CARD_ID }, isPublished: true,
      archivedAt: null, user: { suspended: false } },
    select: { id: true, userId: true, businessName: true, fullName: true, businessPostcode: true, businessCategory: true, showInDiscover: true }
  }));
  return <div className="mx-auto max-w-2xl space-y-6 px-5 py-10"><Link href={HUCKNALL_HUB_PATH} className="text-gold">Back to Hucknall Circle Hub</Link><h1 className="font-display text-4xl">Join your local Circle</h1><p className="text-muted">Free for businesses and creators in Hucknall & NG15. Join with your existing published Circle Card, including a free standard or creator card. Confirm it represents your local business or creator work, then choose whether to show it in Discover and local hubs.</p>
    {query.saved ? <p role="status" className="rounded-xl border border-gold/30 p-4">Your directory preferences are saved. With visibility switched on, your eligible card appears in Hucknall Circle Hub.</p> : null}
    {query.error ? <p role="alert" className="rounded-xl border border-red-400/40 p-4">{query.error === "confirmation" ? "Please confirm this card represents your local business or creator work before switching visibility on." : query.error === "postcode" ? "Enter a full NG15 business postcode." : "Check your card and details, then try again."}</p> : null}
    {!cards.length ? <div className="space-y-4 rounded-2xl border border-gold/25 p-6"><p>Create or publish your Circle Card first, then return here to join. Any card type works on the free plan. If you already have a card, open your workspace and publish it.</p><Link href="/app" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-black">Open my Circle Card</Link></div> : cards.map(card => <form key={card.id} action={saveHucknallMembershipAction} className="space-y-5 rounded-2xl border border-gold/25 p-6"><input type="hidden" name="cardId" value={card.id} /><h2 className="text-xl">{card.businessName || card.fullName}</h2><label className="block space-y-2"><span>Full business postcode</span><input name="postcode" defaultValue={card.businessPostcode ?? ""} maxLength={10} autoComplete="postal-code" required className="min-h-11 w-full rounded-xl border border-silver/25 bg-background px-3" /></label><label className="block space-y-2"><span>Directory section</span><select name="category" defaultValue={card.businessCategory ?? "other"} className="min-h-11 w-full rounded-xl border border-silver/25 bg-background px-3">{BUSINESS_DIRECTORY_CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="flex gap-3"><input name="businessConfirmed" type="checkbox" className="mt-1 h-5 w-5" /><span>I confirm this card represents my business or creator work in Hucknall &amp; NG15, and I am authorised to list it.</span></label><label className="flex gap-3"><input name="discover" type="checkbox" defaultChecked={card.showInDiscover} className="mt-1 h-5 w-5" /><span>Show this business in Discover and eligible local hubs.</span></label><p className="text-xs text-muted">Your full postcode is used for matching and is not displayed in the directory. Clearing this checkbox removes the card from Discover and local hubs while keeping its shared public link working. Pro and custom design do not buy a higher position.</p><button type="submit" className="min-h-11 rounded-full bg-gold px-6 font-semibold text-black">Save directory preferences</button></form>)}
  </div>;
}
