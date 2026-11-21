import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScaleSmithsAdminIssueLinkForm, ScaleSmithsAdminBrandForm } from "@/components/circle-card/scalesmiths-partner-link-forms";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ScaleSmiths Account Linking | Circle Card",
  robots: { index: false, follow: false }
};

export default async function ScaleSmithsCircleCardAdminPage() {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") notFound();
  await requireAdmin();

  const [recentUsers, linkedPartners, brandTemplate] = await Promise.all([
    prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true }
    }),
    prisma.circleCardScaleSmithsPartner.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, externalPartnerId: true, displayName: true, status: true,
        userId: true, partnerCardId: true, linkedAt: true
      }
    }),
    prisma.circleCardScaleSmithsBrandTemplate.findUnique({
      where: { id: "main" },
      select: { tagline: true, businessLogoUrl: true, websiteUrl: true }
    })
  ]);

  return (
    <main className="page-shell space-y-6 pb-20 pt-8">
      <header className="rounded-3xl border border-silver/20 bg-card/75 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Circle Card · admin-only · staging</p>
        <h1 className="mt-3 text-3xl font-bold">ScaleSmiths Partner Management</h1>
        <p className="mt-2 text-sm text-muted">
          Assign a single-use claim token to an identified Circle Card user.
          Merely registering does not activate sponsorship or attach a ScaleSmiths card.
        </p>
        <p className="mt-3 text-xs text-muted">
          Use exact immutable IDs confirmed against the ScaleSmiths partner registry.
          Do not link based on matching names or email addresses alone.
        </p>
      </header>

      <section aria-label="Issue private account-link token" className="rounded-3xl border border-silver/20 bg-card/65 p-6">
        <h2 className="mb-4 text-xl font-bold">Issue verified account link</h2>
        <ScaleSmithsAdminIssueLinkForm />
      </section>

      <section aria-labelledby="brand-title" className="rounded-3xl border border-silver/20 bg-card/65 p-6">
        <h2 id="brand-title" className="text-xl font-bold">Centrally managed partner branding</h2>
        <p className="mt-2 text-sm text-muted">
          Edit the ScaleSmiths company information shown on all assigned partner cards.
          Personal identity fields remain independently controlled by each approved partner.
        </p>
        <ScaleSmithsAdminBrandForm template={brandTemplate ?? {
          tagline: "Forge Your Digital Edge",
          businessLogoUrl: null,
          websiteUrl: "https://scalesmiths.co.uk"
        }} />
      </section>

      <section aria-labelledby="partner-registry-title" className="rounded-3xl border border-silver/20 bg-card/65 p-6">
        <h2 id="partner-registry-title" className="text-xl font-bold">Linked partner registry</h2>
        <div className="mt-4 grid gap-3">
          {linkedPartners.map((partner) => (
            <div key={partner.id} className="rounded-xl border border-silver/20 bg-background/35 p-3 text-sm">
              <p className="font-bold">{partner.displayName} · {partner.status}</p>
              <p className="mt-1 break-words text-xs text-muted">
                Partner ID {partner.externalPartnerId} · Circle Card user {partner.userId}
              </p>
              <p className="mt-1 text-xs text-muted">
                Account linked: {partner.linkedAt ? "Yes" : "No"} · Branded card: {partner.partnerCardId ? "assigned" : "awaiting approval"}
              </p>
            </div>
          ))}
          {linkedPartners.length === 0 ? <p className="text-sm text-muted">No verified partner accounts linked yet.</p> : null}
        </div>
      </section>

      <section aria-labelledby="candidate-registry-title" className="rounded-3xl border border-silver/20 bg-card/65 p-6">
        <h2 id="candidate-registry-title" className="text-xl font-bold">Recent Circle Card accounts</h2>
        <p className="mt-2 text-sm text-muted">Admin reference only. Confirm identity separately before issuing a token.</p>
        <div className="mt-4 grid gap-2">
          {recentUsers.map((user) => (
            <div key={user.id} className="rounded-xl border border-silver/15 bg-background/35 p-3 text-sm">
              <p className="font-semibold">{user.name ?? "Unnamed account"} · {user.email}</p>
              <p className="break-all text-xs text-muted">Circle Card user ID: {user.id}</p>
            </div>
          ))}
        </div>
      </section>
      <Link href="/dashboard/circle-card/scalesmiths" className="text-sm font-semibold text-primary underline">
        Back to partner workspace
      </Link>
    </main>
  );
}
