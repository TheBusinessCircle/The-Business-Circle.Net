"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Building2, Check, MapPin, Search, Share2, ShieldCheck } from "lucide-react";
import { CircleCardLogoMark } from "@/components/circle-card/circle-card-logo-mark";
import { BUSINESS_DIRECTORY_CATEGORIES, HUCKNALL_HUB_PATH, type LocalHubBusiness } from "@/lib/circle-card/local-hubs";

export function HucknallCircleHub({ businesses, joinPath, proPath }: {
  businesses: LocalHubBusiness[];
  joinPath: string;
  proPath: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shareStatus, setShareStatus] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-GB");
    return businesses.filter(business => (category === "all" || business.category === category) &&
      (!query || `${business.name} ${business.description ?? ""}`.toLocaleLowerCase("en-GB").includes(query)));
  }, [businesses, category, search]);

  async function share() {
    const url = new URL(HUCKNALL_HUB_PATH, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: "Hucknall Circle Hub", url });
      else { await navigator.clipboard.writeText(url); setShareStatus("Hub link copied"); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareStatus("Copy the page address to share this hub.");
    }
  }

  return <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
    <section className="relative overflow-hidden rounded-[2rem] border border-[#d8b868]/40 bg-[#07101f] p-6 text-white shadow-[0_0_70px_rgba(35,115,255,0.12)] sm:p-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <CircleCardLogoMark className="mb-6 h-16 w-16" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e5c779]">One town. One Circle.</p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">Hucknall<br /><span className="text-[#e5c779]">Circle Hub</span></h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">Discover the people behind your local businesses. Find a shop, a service or your next local favourite, then connect through their Circle Card.</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-100"><MapPin size={16} /> Hucknall &amp; NG15</p>
        </div>
        <button type="button" onClick={share} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-[#d8b868]/40 px-5 text-sm text-[#e5c779]"><Share2 size={16} /> Share this hub</button>
      </div>
      <p role="status" className="mt-2 text-sm text-blue-100">{shareStatus}</p>
      <div className="relative mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
        <span className="mr-auto text-sm text-slate-300"><strong className="text-white">{businesses.length}</strong> local {businesses.length === 1 ? "business" : "businesses"} · Free to join</span>
        <Link href={joinPath} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#e5c779] px-6 font-semibold text-[#07101f]">Add your business free <ArrowUpRight size={18} /></Link>
      </div>
    </section>

    <section aria-labelledby="hub-directory-title" className="space-y-5">
      <div><p className="text-xs uppercase tracking-[0.16em] text-gold">Keep it local</p><h2 id="hub-directory-title" className="mt-2 font-display text-3xl text-foreground">Explore your local Circle</h2></div>
      <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
        <label htmlFor="hub-search" className="relative"><span className="sr-only">Search local businesses</span><Search size={19} className="absolute left-4 top-4 text-muted" /><input id="hub-search" type="search" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search business names or services" className="min-h-14 w-full rounded-2xl border border-silver/25 bg-card pl-12 pr-4 text-foreground" /></label>
        <label htmlFor="hub-category"><span className="sr-only">Business category</span><select id="hub-category" value={category} onChange={event => setCategory(event.target.value)} className="min-h-14 w-full rounded-2xl border border-silver/25 bg-card px-4 text-foreground"><option value="all">All sections</option>{BUSINESS_DIRECTORY_CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <p className="text-sm text-muted" role="status">{filtered.length} {filtered.length === 1 ? "business" : "businesses"} found. Highest Circle Trust first in each section.</p>

      {filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-gold/30 p-8 text-center"><Building2 className="mx-auto text-gold" size={32} /><h3 className="mt-4 text-xl text-foreground">{businesses.length ? "No matching businesses yet" : "Your local Circle starts here"}</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">{businesses.length ? "Try another name or section, or invite a local business to join." : "Run a business in NG15? Create your free Business Circle Card, add your postcode and turn on Discover to appear here."}</p><Link href={joinPath} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-black">Join the hub free</Link></div> : null}

      {BUSINESS_DIRECTORY_CATEGORIES.map(([key, label]) => {
        const items = filtered.filter(business => business.category === key);
        if (!items.length) return null;
        const visible = expanded[key] ? items : items.slice(0, 6);
        return <section key={key} aria-labelledby={`hub-section-${key}`} className="space-y-4 pt-4">
          <h3 id={`hub-section-${key}`} className="flex items-center gap-3 font-display text-2xl text-foreground">{label}<span className="rounded-full border border-silver/20 px-2.5 py-1 font-sans text-xs text-muted">{items.length}</span></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visible.map(business => <article key={business.id} className="flex flex-col rounded-2xl border border-silver/20 bg-card/70 p-5">
            <div className="flex items-start justify-between gap-3"><Building2 size={23} className="text-gold" /><span className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold"><ShieldCheck size={13} /> Circle Trust {business.trustScore}</span></div>
            <h4 className="mt-4 break-words text-lg font-semibold text-foreground"><Link href={`/card/${business.slug}`}>{business.name}</Link></h4>
            <p className="mt-2 flex-1 break-words text-sm leading-relaxed text-muted">{business.description || "Meet this local business through their Circle Card."}</p>
            <p className="mt-4 text-xs text-muted">NG15 · {business.verifiedTestimonials ? `${business.verifiedTestimonials} verified ${business.verifiedTestimonials === 1 ? "testimonial" : "testimonials"}` : "Building their Circle Trust"}</p>
            <Link href={`/card/${business.slug}`} className="mt-4 inline-flex min-h-11 items-center justify-between gap-2 rounded-xl border border-gold/25 px-4 text-sm font-medium text-gold">View Circle Card <ArrowUpRight size={16} /></Link>
          </article>)}</div>
          {items.length > 6 ? <button type="button" onClick={() => setExpanded(current => ({ ...current, [key]: !current[key] }))} className="min-h-11 rounded-full border border-silver/25 px-5 text-sm text-foreground">{expanded[key] ? "Show fewer" : `Show all ${items.length} in ${label}`}</button> : null}
        </section>;
      })}
    </section>

    <section className="grid gap-6 rounded-3xl border border-gold/25 bg-card/60 p-6 sm:p-8 md:grid-cols-2">
      <div><ShieldCheck className="text-gold" /><h2 className="mt-3 font-display text-2xl text-foreground">Earn your place in the Circle</h2><p className="mt-3 text-sm leading-relaxed text-muted">Sections are ordered by Circle Trust from verified Circle relationships, approved testimonials and profile signals. The directory score excludes membership points. Equal scores are ordered alphabetically.</p><p className="mt-3 text-sm leading-relaxed text-muted">Circle Trust shows activity and relationships on Circle Card. It is not a guarantee of workmanship or a verified business address. New businesses can join while they build their score.</p></div>
      <div><h2 className="font-display text-2xl text-foreground">Your business belongs here</h2><ol className="mt-4 space-y-3 text-sm text-muted">{["Create your free Business Circle Card.", "Add your full business postcode and choose a section.", "Publish your card and switch on Discover."].map(step => <li key={step} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-gold" />{step}</li>)}</ol><p className="mt-4 text-sm text-muted">NG15 businesses are linked automatically. Switching Discover off, unpublishing or changing to an address outside NG15 removes your listing.</p><p className="mt-4 text-sm text-muted">Stay free, <Link href={proPath} className="text-gold underline">choose Pro</Link> or ask about a custom card design with ongoing Pro membership. Upgrades never buy a better position.</p><Link href={joinPath} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-black">Get your free business card</Link></div>
    </section>
  </div>;
}
