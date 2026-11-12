import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, Crown, LockKeyhole, Sparkles, Wrench } from "lucide-react";
import { requireCircleCardUser } from "@/lib/session";
import { loadCircleCardAccessForUser } from "@/server/circle-card";
import { buildCircleCardProHref } from "@/lib/circle-card/pro-intent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Tools | Circle Card",
  description: "Creator and business tools for Circle Card Pro.",
  robots: { index: false, follow: false }
};

const tools = [
  { id: "creator-media", category: "Creators", title: "Media Kit", description: "Present your brand and collaboration information.", href: "/dashboard/circle-card?section=my-card#creator-pro-studio", ready: true },
  { id: "creator-offers", category: "Creators", title: "Creator Offers", description: "Showcase your offers and partnerships.", href: "/dashboard/circle-card?section=my-card#creator-pro-studio", ready: true },
  { id: "creator-content", category: "Creators", title: "Featured Content", description: "Highlight the content that matters most.", href: "/dashboard/circle-card?section=my-card#creator-pro-studio", ready: true },
  { id: "studio", category: "Creators", title: "Circle Studio", description: "Fine-tune the presentation of your Circle Card.", href: "/dashboard/circle-card/studio", ready: true },
  { id: "services", category: "Business", title: "Services", description: "Show visitors what your business offers.", href: "/dashboard/circle-card?section=business#business-card-services", ready: true },
  { id: "products", category: "Business", title: "Products", description: "Present products on your business card.", href: "/dashboard/circle-card?section=business#business-card-products", ready: true },
  { id: "prices", category: "Business", title: "Price Lists", description: "Keep your services and prices together.", href: "/dashboard/circle-card?section=business#business-card-price-list", ready: true },
  { id: "bookings", category: "Business", title: "Bookings & Enquiries", description: "Guide potential customers towards contacting you.", href: "/dashboard/circle-card?section=business#business-card-booking", ready: true },
  { id: "documents", category: "Business", title: "Documents", description: "Manage brochures and downloadable documents.", href: "/dashboard/circle-card?section=business#business-card-downloads", ready: true },
  { id: "gallery", category: "Business", title: "Portfolio Gallery", description: "Show your work and build confidence.", href: "/dashboard/circle-card?section=business#business-card-gallery", ready: true },
  { id: "reviews", category: "Business", title: "Reviews", description: "Display relevant customer proof.", href: "/dashboard/circle-card?section=business#business-card-reviews", ready: true }
] as const;

export default async function CircleCardMyToolsPage() {
  const session = await requireCircleCardUser();
  if (!session.user.id) redirect("/login?from=/dashboard/circle-card/tools");
  const access = await loadCircleCardAccessForUser(session.user.id);
  const hasPro = access.hasProAccess;
  const upgradeHref = buildCircleCardProHref();

  return (
    <main className="page-shell pb-16 pt-6 sm:pt-9">
      <header className="mb-8 rounded-3xl border border-silver/20 bg-card/75 p-5 sm:p-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <Wrench size={18} aria-hidden /> MY TOOLS <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs">PRO</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need, in your Circle.</h1>
        <p className="mt-3 max-w-2xl text-muted">Choose from Creator and Business tools. Both collections are available to every Pro member, whichever type of Circle Card you use. A Business tool may require a Business Card to configure.</p>
        {!hasPro ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-background/55 p-4">
            <LockKeyhole size={20} aria-hidden />
            <p className="flex-1 text-sm">Your tools are ready to explore. Upgrade to Pro to unlock them.</p>
            <Link href={upgradeHref} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Unlock Pro tools</Link>
          </div>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-primary"><Crown size={17} aria-hidden /> Your Pro tools are unlocked.</p>
        )}
      </header>
      <nav aria-label="Tool categories" className="mb-6 flex flex-wrap gap-3">
        <a href="#creators" className="rounded-xl border border-silver/25 px-4 py-2 text-sm font-semibold hover:border-primary">Creators</a>
        <a href="#business" className="rounded-xl border border-silver/25 px-4 py-2 text-sm font-semibold hover:border-primary">Business</a>
      </nav>
      {(["Creators", "Business"] as const).map((category) => (
        <section key={category} id={category.toLowerCase()} aria-labelledby={category.toLowerCase() + "-heading"} className="mb-10 scroll-mt-24">
          <h2 id={category.toLowerCase() + "-heading"} className="mb-4 flex items-center gap-2 text-xl font-semibold">
            {category === "Creators" ? <Sparkles size={20} aria-hidden /> : <BriefcaseBusiness size={20} aria-hidden />} {category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.filter((tool) => tool.category === category).map((tool) => (
              <article key={tool.id} className={`relative flex flex-col rounded-2xl border border-silver/20 bg-card/70 p-5 ${hasPro ? "" : "opacity-60"}`} aria-label={tool.title + (hasPro ? "" : " (locked: Pro required)")}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">{category.slice(0, -1)} tool</span>
                  {hasPro ? <span className="text-xs text-primary">Available</span> : <LockKeyhole size={17} aria-label="Pro required" />}
                </div>
                <h3 className="text-lg font-semibold">{tool.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">{tool.description}</p>
                {hasPro ? <Link href={tool.href} className="mt-5 inline-flex w-fit rounded-lg border border-primary/40 px-3 py-2 text-sm font-semibold hover:bg-primary/10">Open tool</Link> : <Link href={upgradeHref} className="mt-5 inline-flex w-fit rounded-lg border border-silver/30 px-3 py-2 text-sm font-semibold">Unlock with Pro</Link>}
              </article>
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm text-muted">The wallet, scanning and normal contact sharing remain accessible from Connect Hub. Secure file-sharing and claim invitation automation are being reviewed separately before activation.</p>
      <Link className="mt-4 inline-block text-sm font-semibold text-primary underline" href="/dashboard/circle-card">Back to Circle Card</Link>
    </main>
  );
}
