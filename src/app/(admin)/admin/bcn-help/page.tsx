import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { prisma } from "@/lib/prisma";
import { HelpAdmin } from "@/components/bcn-v2/admin-client";
import "@/components/bcn-v2/v2.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "BCN help, introductions and revenue",
  robots: { index: false, follow: false },
};
export default async function AdminHelp() {
  if (!isBcnV2Enabled()) notFound();
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 86400000);
  const [requests, providers, profiles, revenue, counts, tools, clicks] =
    await Promise.all([
      prisma.bcnHelpRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          email: true,
          business: true,
          category: true,
          summary: true,
          status: true,
          providerId: true,
          outcome: true,
          createdAt: true,
          audit: {
            select: { action: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.bcnProvider.findMany({
        select: { id: true, name: true, approved: true },
        orderBy: { name: "asc" },
        take: 200,
      }),
      prisma.bcnBusinessProfile.findMany({
        where: { publicConsentAt: { not: null } },
        select: {
          id: true,
          business: true,
          description: true,
          website: true,
          approved: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.bcnRevenueEntry.groupBy({
        by: ["stream", "currency"],
        _sum: { amountPence: true },
        where: { receivedAt: { gte: since } },
      }),
      prisma.bcnHelpRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.siteEvent.groupBy({
        by: ["eventName"],
        where: {
          eventName: { in: ["tool_started", "tool_completed"] },
          createdAt: { gte: since },
        },
        _count: { _all: true },
      }),
      prisma.bcnAffiliateClick.count({ where: { createdAt: { gte: since } } }),
    ]);
  return (
    <div className="bcn-v2" style={{ padding: 25, borderRadius: 10 }}>
      <p className="v2-eyebrow">PRIVATE OPERATIONS</p>
      <h1 style={{ fontSize: 35 }}>Useful help. Measured outcomes.</h1>
      <p>BCN reporting keeps demand, clicks and actual revenue separate.</p><Link className="v2-text-link" href="/admin/bcn-ideas">Moderate Build it together requests, offers & reports ↗</Link>
      <div className="v2-grid" style={{ marginTop: 25 }}>
        <div className="v2-card">
          <h2 style={{ fontSize: 23 }}>Help requests · all time</h2>
          {counts.map((c) => (
            <p key={c.status}>
              {c.status}: {c._count._all}
            </p>
          ))}
        </div>
        <div className="v2-card">
          <h2 style={{ fontSize: 23 }}>Usage · last 30 days</h2>
          {tools.map((t) => (
            <p key={t.eventName}>
              {t.eventName}: {t._count._all}
            </p>
          ))}
          <p>Consented affiliate clicks: {clicks}</p>
          <p className="v2-note">
            Analytics exclude visitors who decline consent. Clicks are not
            commissions. Legacy analytics can provide landing pages, sources and
            return visits for consented traffic.
          </p>
        </div>
        <div className="v2-card">
          <h2 style={{ fontSize: 23 }}>BCN receipts · last 30 days</h2>
          {revenue.length ? (
            revenue.map((r) => (
              <p key={`${r.stream}-${r.currency}`}>
                {r.stream}: {r.currency}{" "}
                {((r._sum.amountPence || 0) / 100).toFixed(2)}
              </p>
            ))
          ) : (
            <p>No receipts recorded.</p>
          )}
          <p className="v2-note">
            Evidenced cash receipts, not forecasts or provider revenue.
            Reversals reduce receipts.
          </p>
        </div>
      </div>
      <HelpAdmin
        requests={requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          audit: r.audit.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          })),
        }))}
        providers={providers}
        profiles={profiles}
      />
    </div>
  );
}
