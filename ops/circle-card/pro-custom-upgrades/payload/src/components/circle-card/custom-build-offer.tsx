import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPaidProForCustomBuild } from "@/lib/circle-card/custom-build";
import { getCircleCardBillingReadiness, canUserStartCircleCardCheckout } from "@/lib/circle-card/pricing";
import { loadCircleCardAccessForUser } from "@/server/circle-card/billing.service";
import { loadCustomBuildOrders } from "@/server/circle-card/custom-build.service";
import { CustomBuildCheckout } from "./custom-build-checkout";

export async function CustomBuildOffer() {
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id }, select: { id: true, suspended: true }
  }) : null;
  const activeUser = user && !user.suspended ? user : null;
  const access = activeUser ? await loadCircleCardAccessForUser(activeUser.id) : null;
  const eligible = Boolean(access && hasPaidProForCustomBuild(access));
  const readiness = getCircleCardBillingReadiness();
  const paymentsReady = Boolean(activeUser && readiness.billingEnabled && readiness.proLaunchConfigured && canUserStartCircleCardCheckout(activeUser.id));
  const [cards, orders] = activeUser ? await Promise.all([
    prisma.circleCard.findMany({ where: { userId: activeUser.id, archivedAt: null },
      orderBy: [{ isDefaultCard: "desc" }, { displayOrder: "asc" }],
      select: { id: true, fullName: true, businessName: true } }),
    loadCustomBuildOrders(activeUser.id)
  ]) : [[], []];
  const link = "inline-flex min-h-11 items-center rounded-xl border border-gold/30 px-5 text-sm font-semibold text-gold";
  return <section id="custom-design" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-gold/30 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,.16),transparent_50%)] p-5 sm:p-8">
    <div className="grid gap-7 lg:grid-cols-2">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-gold">Optional Pro add-on</p><h2 className="mt-3 font-display text-3xl sm:text-4xl">Your brand. A card built around it.</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">Let us design and set up your Circle Card using your colours, photos and business details. Choose a bespoke presentation inspired by the work we have created for local businesses and creators.</p>
        <p className="mt-5 text-4xl font-semibold text-gold">£49.99 <span className="text-sm font-normal text-muted">one-off, per card</span></p>
        <p className="mt-2 text-sm text-muted">Available after paid Pro is active. Your £9.99/month Pro subscription is separate. Standard Pro customisation remains included without this service.</p>
        <ul className="mt-5 space-y-2 text-sm text-silver"><li>✓ Your branding and a tailored layout</li><li>✓ Supplied photos, business details and contact links</li><li>✓ Mobile checks and one round of changes</li><li>✓ Your approved design stays saved between subscriptions</li></ul>
      </div>
      <div className="rounded-2xl border border-silver/15 bg-background/40 p-4 sm:p-5">
        {eligible && paymentsReady ? <CustomBuildCheckout cards={cards} orders={orders.map(({ id, cardId, paymentStatus, brief }) => ({ id, cardId, paymentStatus, brief }))} /> :
          <><p className="text-lg font-semibold">{!activeUser ? "Start with Circle Card Pro" : eligible ? "Custom design checkout is opening soon" : "Unlock with active paid Pro"}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{!activeUser ? "Create your account or sign in, then upgrade to Pro. The custom design purchase unlocks once your Pro payment is confirmed." : access?.hasProAccess ? "This add-on requires a current paid Pro subscription. Complimentary access and payment recovery do not unlock a new purchase." : "Upgrade or reactivate Pro first, then return here to order your custom design."}</p>
            <div className="mt-4 flex flex-wrap gap-3">{!activeUser ? <Link className={link} href="/login?from=%2Fpro%23custom-design">Sign in to continue</Link> : !access?.hasProAccess ? <Link className={link} href="/pro?returnTo=%2Fapp%2Fupgrades%2Fcustom-build#pro-checkout">Upgrade to Pro · £9.99/month</Link> : <Link className={link} href="/app/settings">Manage Pro billing</Link>}</div>
            {orders.some(order => order.paymentStatus === "PAID") ? <Link href="/app/upgrades/custom-build" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline">View your saved design orders</Link> : null}
          </>}
      </div>
    </div>
    <div className="mt-6 rounded-xl border border-silver/15 p-4 text-sm leading-relaxed text-muted"><strong className="text-foreground">If you cancel Pro:</strong> your custom presentation stays active until the paid period ends. It then pauses and your card follows Free limits. We keep the design and content saved. Paying for Pro again restores the saved custom presentation, with no repeat £49.99 design fee.</div>
  </section>;
}
