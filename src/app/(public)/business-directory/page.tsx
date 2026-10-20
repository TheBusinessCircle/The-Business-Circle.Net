import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { PageHeading } from "@/components/bcn-v2/shell";
import { createPageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata = createPageMetadata({
  title: "Business Directory",
  description:
    "Find participating businesses by the help they offer and the area they serve. Listings require permission and moderation.",
  path: "/business-directory",
});
export default async function Directory({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isBcnV2Enabled()) notFound();
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q.trim().slice(0, 100) : "";
  let unavailable = false;
  let providers: {
    id: string;
    name: string;
    category: string;
    description: string;
    location: string;
    website: string;
  }[] = [];
  let profiles: {
    id: string;
    acceptsMessages: boolean;
    business: string;
    category: string;
    description: string;
    location: string;
    website: string;
  }[] = [];
  try {
    const [approvedProviders, approvedProfiles] = await Promise.all([
      prisma.bcnProvider.findMany({
        where: {
          approved: true,
          publicListingConsent: true,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { category: { contains: q, mode: "insensitive" as const } },
                  { location: { contains: q, mode: "insensitive" as const } },
                  {
                    description: { contains: q, mode: "insensitive" as const },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          location: true,
          website: true,
        },
        take: 50,
        orderBy: { name: "asc" },
      }),
      prisma.bcnBusinessProfile.findMany({
        where: {
          approved: true,
          publicConsentAt: { not: null },
          ...(q
            ? {
                OR: [
                  { business: { contains: q, mode: "insensitive" as const } },
                  { category: { contains: q, mode: "insensitive" as const } },
                  { location: { contains: q, mode: "insensitive" as const } },
                  {
                    description: { contains: q, mode: "insensitive" as const },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          userId: true,
          acceptsMessages: true,
          business: true,
          category: true,
          description: true,
          location: true,
          website: true,
        },
        take: 50,
        orderBy: { business: "asc" },
      }),
    ]);
    providers = approvedProviders;
    const users = await prisma.user.findMany({
      where: {
        id: { in: approvedProfiles.map((p) => p.userId) },
        suspended: false,
        emailVerified: { not: null },
      },
      select: { id: true },
    });
    const eligible = new Set(users.map((u) => u.id));
    profiles = approvedProfiles.filter((p) => eligible.has(p.userId));
  } catch {
    unavailable = true;
  }
  const listings = [
    ...providers.map((p) => ({ ...p, type: "Participating provider", acceptsMessages: false })),
    ...profiles.map((p) => ({
      ...p,
      name: p.business,
      type: "Business profile",
    })),
  ];
  return (
    <>
      <PageHeading
        eyebrow="THE BUSINESS DIRECTORY"
        title="Find people who can help."
      >
        <p>
          Search by business, type of help or area. Businesses choose to be
          listed and are reviewed before publication. A listing is not a
          guarantee of quality or professional accreditation.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap">
          <form className="v2-search-row" method="get">
            <label className="v2-field" style={{ flex: 1 }}>
              Search businesses
              <input
                className="v2-search"
                type="search"
                name="q"
                defaultValue={q}
                maxLength={100}
                placeholder="Try website, bookkeeping or Nottingham"
              />
            </label>
            <button className="v2-button" style={{ alignSelf: "end" }}>
              Search ↗
            </button>
          </form>
          {unavailable ? (
            <p className="v2-error" role="status">
              The directory is temporarily unavailable. Please try again later.
            </p>
          ) : listings.length ? (
            <div className="v2-grid">
              {listings.map((p) => (
                <article className="v2-card" key={`${p.type}-${p.id}`}>
                  <span className="v2-tag">
                    {p.type} · {p.category}
                  </span>
                  <h2 style={{ fontSize: 23 }}>{p.name}</h2>
                  <p>{p.location}</p>
                  <p>{p.description}</p>
                  {p.website && (
                    <p>
                      <a
                        className="v2-text-link"
                        href={p.website}
                        rel="noreferrer"
                      >
                        Visit business website ↗
                      </a>
                    </p>
                  )}
                  {p.acceptsMessages && <p><Link className="v2-text-link" href={`/messages?connect=${p.id}`}>Request a private conversation ↗</Link></p>}
                  <Link
                    className="v2-text-link"
                    href={`/find-help?category=${p.category}`}
                  >
                    Ask BCN for help in this category
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="v2-empty">
              <h2 style={{ fontSize: 26 }}>
                {q
                  ? "No matching businesses yet."
                  : "A useful directory starts with the right businesses."}
              </h2>
              <p>
                {q
                  ? "Try another category or area, or ask BCN to review your request."
                  : "We are opening the directory carefully. Profiles appear only with permission and approval."}
              </p>
              <Link className="v2-button" href="/register">
                Create your free profile
              </Link>
            </div>
          )}
          <p className="v2-note">
            Showing up to 50 provider listings and 50 business profiles.
            Alphabetical order within each group; no paid placement.{" "}
            <Link href="/find-help">Ask for help</Link> if you cannot find the
            right match.
          </p>
        </div>
      </section>
    </>
  );
}
