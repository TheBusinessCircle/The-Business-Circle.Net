import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FreeProfileForm } from "./forms";
export async function BcnDashboard() {
  const s = await requireUser({ allowUnentitled: true });
  return (
    <>
      <p className="v2-eyebrow">YOUR BUSINESS CIRCLE</p>
      <h1 style={{ fontSize: 36 }}>
        Good to see you, {s.user.name?.split(" ")[0] || "business owner"}.
      </h1>
      <p>What would make your next business decision easier?</p>
      <div className="v2-grid" style={{ marginTop: 30 }}>
        {[
          [
            "Free tools",
            "Work through pricing, profit, costs and quotes.",
            "/tools",
          ],
          [
            "Your free business profile",
            "Describe how you help and choose whether to be listed.",
            "/profile",
          ],
          [
            "Find the right help",
            "Send a private request for BCN to review.",
            "/find-help",
          ],
        ].map(([t, d, h]) => (
          <Link className="v2-card v2-card-link" href={h} key={h}>
            <h2 style={{ fontSize: 23 }}>{t}</h2>
            <p>{d}</p>
            <span className="v2-text-link">Open ↗</span>
          </Link>
        ))}
      </div>
      {s.user.hasActiveSubscription && (
        <section className="v2-card" style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 24 }}>Your existing member services</h2>
          <p>
            Your current membership record and contracted access have been
            preserved. No subscription has been cancelled or changed by this
            redesign.
          </p>
          <div className="v2-dashboard-nav">
            <Link href="/dashboard/resources">Member resources</Link>
            <Link href="/community">Community</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/events">Events</Link>
            <Link href="/dashboard?view=legacy">
              Membership & billing dashboard
            </Link>
            <Link href="/contact">Membership support</Link>
          </div>
        </section>
      )}
    </>
  );
}
export async function BcnProfile() {
  const s = await requireUser({ allowUnentitled: true });
  const p = await prisma.bcnBusinessProfile.findUnique({
    where: { userId: s.user.id },
  });
  return (
    <>
      <p className="v2-eyebrow">OPTIONAL, FREE BUSINESS PROFILE</p>
      <h1 style={{ fontSize: 36 }}>Help the right people find you.</h1>
      <p>
        Only information you submit here can appear in the new directory. We do
        not automatically publish legacy profiles.
      </p>
      <p className="v2-note">
        Status:{" "}
        {p?.approved && p.publicConsentAt
          ? "Approved"
          : p?.publicConsentAt
            ? "Awaiting moderation"
            : "Private"}
        . Email verification is required before publication.
      </p>
      <FreeProfileForm
        initial={
          p
            ? {
                business: p.business,
                category: p.category,
                location: p.location,
                description: p.description,
                website: p.website,
                publicConsent: !!p.publicConsentAt,
              }
            : undefined
        }
      />
    </>
  );
}
