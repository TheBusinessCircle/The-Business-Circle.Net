import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCircleCardUser } from "@/lib/session";
import { hasPaidProForCustomBuild } from "@/lib/circle-card/custom-build";
import { loadCircleCardAccessForUser } from "@/server/circle-card/billing.service";
import { loadCustomBuildOrders, reconcileCustomBuildOrder } from "@/server/circle-card/custom-build.service";
import { logServerError } from "@/lib/security/logging";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your custom Circle Card design", robots: { index: false, follow: false } };
export default async function CustomBuildOrderPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireCircleCardUser();
  const params = await searchParams;
  const requestedId = Array.isArray(params.order) ? params.order[0] : params.order;
  const [access, orders] = await Promise.all([
    loadCircleCardAccessForUser(session.user.id), loadCustomBuildOrders(session.user.id)
  ]);
  let order = requestedId ? orders.find(row => row.id === requestedId) : null;
  if (requestedId && !order) notFound();
  if (order && ["PENDING","PROCESSING","EXPIRED","FAILED"].includes(order.paymentStatus)) {
    try { order = await reconcileCustomBuildOrder(order); }
    catch (error) { logServerError("custom-build-order-reconciliation-failed", error); }
  }
  const paidPro = hasPaidProForCustomBuild(access);
  const link = "inline-flex min-h-11 items-center rounded-xl border border-gold/30 px-4 text-sm text-gold";
  return <div className="mx-auto max-w-3xl space-y-6">
    <header><p className="text-sm text-gold">Circle Card Upgrades</p><h1 className="mt-2 font-display text-3xl">Your custom design</h1><p className="mt-3 text-sm text-slate-300">£49.99 once per card. Paid Pro is required to use the custom presentation.</p></header>
    {order ? <section className="space-y-4 rounded-2xl border border-white/15 p-5">
      <h2 className="text-xl font-semibold">{order.paymentStatus === "PAID" ? order.buildStatus === "COMPLETE" ? "Your design is complete" : "Your design brief is in our queue" : order.paymentStatus === "REFUNDED" ? "This design payment was refunded" : order.paymentStatus === "DISPUTED" ? "This payment needs review" : order.paymentStatus === "EXPIRED" ? "Checkout expired" : "Awaiting payment confirmation"}</h2>
      <p className="text-sm text-slate-300">{order.paymentStatus === "PAID" ? "We will use your brief to prepare your custom Circle Card and arrange any photos or logos with you. One round of changes is included." : "Returning from checkout alone does not confirm payment. Refresh this page after payment, or return to Upgrades to continue an unfinished checkout."}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-400">Payment</dt><dd>{order.paymentStatus.toLowerCase().replaceAll("_"," ")}</dd></div><div><dt className="text-slate-400">Design progress</dt><dd>{order.buildStatus.toLowerCase().replaceAll("_"," ")}</dd></div></dl>
      <div><h3 className="text-sm font-semibold">Your brief</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">{order.brief}</p></div>
      {order.paymentStatus === "PAID" && !paidPro ? <p className="rounded-xl border border-gold/30 p-4 text-sm">Your order and design remain saved. Reactivate paid Pro to use your custom presentation again. You do not need to buy the design a second time.</p> : null}
    </section> : <section className="space-y-3 rounded-2xl border border-white/15 p-5">
      <h2 className="text-xl font-semibold">Your design orders</h2>
      {orders.length ? <ul className="space-y-3">{orders.map(row => <li key={row.id}><Link className={link} href={`/app/upgrades/custom-build?order=${encodeURIComponent(row.id)}`}>Design order · {row.paymentStatus.toLowerCase()} · {row.buildStatus.toLowerCase().replaceAll("_"," ")}</Link></li>)}</ul> : <p className="text-sm text-slate-300">Choose your card and send us a brief on the Pro upgrade page.</p>}
    </section>}
    <div className="flex flex-wrap gap-3"><Link className={link} href="/pro?returnTo=%2Fapp%2Fupgrades%2Fcustom-build#custom-design">{paidPro ? "Explore custom design" : "Upgrade or reactivate Pro"}</Link><Link className={link} href="/app">Back to your cards</Link></div>
    <p className="text-sm leading-relaxed text-slate-400">Cancelling Pro leaves your custom presentation active until the paid period ends. It then pauses while your card follows Free limits. Your saved design and content return when paid Pro resumes; no repeat design fee is charged.</p>
  </div>;
}
