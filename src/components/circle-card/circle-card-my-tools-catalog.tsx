"use client";

import Link from "next/link";
import { useState } from "react";
import { BriefcaseBusiness, LockKeyhole, Sparkles } from "lucide-react";

type ToolCategory = "Creators" | "Business";

const TOOLS = [
  { id: "creator-media", category: "Creators", title: "Media Kit", description: "Present your brand and collaboration information.", href: "/dashboard/circle-card?section=my-card#creator-pro-studio" },
  { id: "creator-offers", category: "Creators", title: "Creator Offers", description: "Showcase offers and partnerships.", href: "/dashboard/circle-card?section=my-card#creator-pro-studio" },
  { id: "creator-content", category: "Creators", title: "Featured Content", description: "Highlight the content that matters most.", href: "/dashboard/circle-card?section=my-card#creator-pro-studio" },
  { id: "studio", category: "Creators", title: "Circle Studio", description: "Fine-tune the presentation of your Circle Card.", href: "/dashboard/circle-card/studio" },
  { id: "services", category: "Business", title: "Services", description: "Show visitors what your business offers.", href: "/dashboard/circle-card?section=business#business-card-services" },
  { id: "products", category: "Business", title: "Products", description: "Present products on your business card.", href: "/dashboard/circle-card?section=business#business-card-products" },
  { id: "prices", category: "Business", title: "Price Lists", description: "Keep your services and prices together.", href: "/dashboard/circle-card?section=business#business-card-price-list" },
  { id: "bookings", category: "Business", title: "Bookings & Enquiries", description: "Guide potential customers towards contacting you.", href: "/dashboard/circle-card?section=business#business-card-booking" },
  { id: "documents", category: "Business", title: "Documents", description: "Manage brochures and downloadable documents.", href: "/dashboard/circle-card?section=business#business-card-downloads" },
  { id: "gallery", category: "Business", title: "Portfolio Gallery", description: "Show your work and build confidence.", href: "/dashboard/circle-card?section=business#business-card-gallery" },
  { id: "reviews", category: "Business", title: "Reviews", description: "Display relevant customer proof.", href: "/dashboard/circle-card?section=business#business-card-reviews" }
] as const;

export function CircleCardMyToolsCatalog({ hasPro, upgradeHref }: { hasPro: boolean; upgradeHref: string }) {
  const [category, setCategory] = useState<ToolCategory>("Creators");
  const visible = TOOLS.filter((tool) => tool.category === category);

  return (
    <section aria-label="My Tools catalogue">
      <div role="group" aria-label="Choose tool category" className="mb-6 flex flex-wrap gap-3">
        {(["Creators", "Business"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={category === option}
            onClick={() => setCategory(option)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${category === option ? "border-primary bg-primary/15 text-primary" : "border-silver/25 hover:border-primary"}`}>
            {option === "Creators" ? <Sparkles size={17} aria-hidden /> : <BriefcaseBusiness size={17} aria-hidden />}
            {option}
          </button>
        ))}
      </div>
      <h2 className="mb-4 text-xl font-semibold">{category} tools</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((tool) => (
          <article key={tool.id} className={`relative flex flex-col rounded-2xl border border-silver/20 bg-card/70 p-5 ${hasPro ? "" : "opacity-60"}`} aria-label={tool.title + (hasPro ? "" : " (locked: Pro required)")}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{category === "Creators" ? "Creator" : "Business"} tool</span>
              {hasPro ? <span className="text-xs text-primary">Available</span> : <LockKeyhole size={17} aria-label="Pro required" />}
            </div>
            <h3 className="text-lg font-semibold">{tool.title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted">{tool.description}</p>
            {hasPro ? <Link href={tool.href} className="mt-5 inline-flex w-fit rounded-lg border border-primary/40 px-3 py-2 text-sm font-semibold hover:bg-primary/10">Open tool</Link> : <Link href={upgradeHref} className="mt-5 inline-flex w-fit rounded-lg border border-silver/30 px-3 py-2 text-sm font-semibold">Unlock with Pro</Link>}
          </article>
        ))}
      </div>
    </section>
  );
}
