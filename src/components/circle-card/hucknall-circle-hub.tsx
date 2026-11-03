"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { HUCKNALL_ABOUT_PATH } from "@/lib/circle-card/hucknall-content";
import { ArrowUpRight, Building2, Check, MapPin, Search, Share2, ShieldCheck, Utensils, ShoppingBag, Hammer, Sparkles, BriefcaseBusiness, Car, Compass, UsersRound, Shapes } from "lucide-react";
import { HucknallPhoto } from "@/components/circle-card/hucknall-photo";
import { HUCKNALL_PHOTOS, HUCKNALL_PROFILE_PHOTO } from "@/lib/circle-card/hucknall-media";
import { BUSINESS_DIRECTORY_CATEGORIES, HUCKNALL_HUB_PATH, type LocalHubBusiness } from "@/lib/circle-card/local-hubs";

const CATEGORY_ICONS = [Utensils, ShoppingBag, Hammer, Sparkles, BriefcaseBusiness, Car, Compass, UsersRound, Shapes];

export function HucknallCircleHub({ businesses, joinPath, proPath, previewMode = false, nativeIdentity, nativeActions, nativeDetails, aboutContent }: {
  businesses: LocalHubBusiness[];
  joinPath: string;
  proPath: string;
  previewMode?: boolean;
  nativeIdentity?: ReactNode;
  nativeActions?: ReactNode;
  nativeDetails?: ReactNode;
  aboutContent?: ReactNode;
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
    if (previewMode) return;
    const url = new URL(HUCKNALL_HUB_PATH, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: "Hucknall Circle Hub", url });
      else { await navigator.clipboard.writeText(url); setShareStatus("Hub link copied"); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareStatus("Copy the page address to share this hub.");
    }
  }

  return <div data-hucknall-presentation="photographic" className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
    <nav aria-label="Hucknall hub navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gold"><a href="#hub-directory-title" className="inline-flex min-h-11 items-center">Local directory</a><Link href={HUCKNALL_ABOUT_PATH} className="inline-flex min-h-11 items-center">About Hucknall</Link>{nativeIdentity ? <a href="#hub-connect" className="inline-flex min-h-11 items-center">Connect with Hucknall</a> : null}</nav>
    {previewMode ? <div role="status" className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-4 text-sm text-amber-100"><strong>Private hub design preview.</strong> Search and category filters work with clearly marked illustrative listings. These are not joined businesses. Public enrolment and real business links are not active.</div> : null}
    <section aria-label="Welcome to Hucknall" className="relative isolate overflow-hidden rounded-[2rem] border border-[#d9c498]/40 bg-[#102c29] text-white shadow-2xl">
      <HucknallPhoto src={HUCKNALL_PHOTOS[1].src} alt={HUCKNALL_PHOTOS[1].alt} eager className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,28,26,0.18),rgba(6,28,26,0.65)_35%,rgba(6,28,26,0.98))]" />
      <div className="flex min-h-[580px] flex-col justify-end p-6 pt-28 sm:min-h-[650px] sm:p-12 sm:pt-40">
        <p className="absolute left-6 top-6 rounded-full border border-white/30 bg-[#102c29]/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#f5e6c7] sm:left-12 sm:top-10">Nottinghamshire · NG15</p>
        <div className="mb-7 flex items-center gap-4">{nativeIdentity || <HucknallPhoto src={HUCKNALL_PROFILE_PHOTO} alt="St Mary Magdalene Church, Hucknall" className="h-20 w-20 shrink-0 rounded-full border-2 border-[#ead4a3] object-cover" />}<div><p className="text-lg font-semibold">Hucknall Circle Hub</p><p className="mt-1 text-xs text-[#eee0c7]">Independent. Local. Run by Trev.</p><p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-white/70">Powered by Circle Card</p></div></div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ead4a3]">One town. One Circle.</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-8xl">Hucknall.<br /><span className="text-[#ead4a3]">All together.</span></h1>
        <p className="mt-5 max-w-xl text-lg text-white sm:text-2xl">Your high street. Your people. Your Circle.</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80">The shops you know. The people you trust. The places you are yet to discover. A local home for the town we call ours.</p>
        <div className="mt-6 flex flex-wrap gap-3"><a href="#hub-directory-title" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ead4a3] px-6 font-semibold text-[#102c29]">Explore the directory <ArrowUpRight size={18} /></a>{!previewMode ? <button type="button" onClick={share} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 px-5 text-sm text-white"><Share2 size={16} />Share this hub</button> : <span className="self-center text-xs text-amber-100">Private presentation</span>}</div>
        <p role="status" className="mt-2 text-sm text-white">{shareStatus}</p>
        {nativeActions ? <div id="hub-connect" className="mt-5 flex scroll-mt-24 flex-wrap items-center gap-3 border-t border-white/20 pt-5">{nativeActions}</div> : null}
      </div>
    </section>
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#b6c9bd]/25 bg-[#163c35] px-5 py-4 text-sm text-[#eee4cf]"><MapPin size={18} /><span className="mr-auto">Hucknall &amp; NG15 · {previewMode ? "A local home for local businesses" : `${businesses.length} local ${businesses.length === 1 ? "business" : "businesses"} · Free to join`}</span>{!previewMode ? <Link href={joinPath} className="inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">Add your business free <ArrowUpRight size={16} /></Link> : null}</div>
    <section aria-labelledby="hucknall-in-pictures" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[#d9c498]">A place to belong</p><h2 id="hucknall-in-pictures" className="mt-2 font-display text-3xl text-white">This is our Hucknall.</h2></div><Link href={HUCKNALL_ABOUT_PATH} className="text-sm text-[#ead4a3] underline underline-offset-4">Discover our town</Link></div>
      <div className="grid gap-4 sm:grid-cols-3">{HUCKNALL_PHOTOS.filter(photo => photo.id !== "town").map(photo => <Link key={photo.id} href={`${HUCKNALL_ABOUT_PATH}#${photo.id === "church" ? "heritage" : "visit"}`} className="group relative isolate block overflow-hidden rounded-2xl border border-white/15 bg-[#163c35]">
        <HucknallPhoto src={photo.src} alt={photo.alt} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" /><div className="absolute bottom-5 left-5 right-5"><p className="text-[10px] uppercase tracking-[0.2em] text-[#ead4a3]">{photo.id === "church" ? "Our heritage" : photo.id === "park" ? "Room to breathe" : "Keep it local"}</p><h3 className="mt-1 text-xl font-semibold text-white">{photo.title}</h3></div>
      </Link>)}</div>
      <details className="text-xs leading-relaxed text-slate-400"><summary className="min-h-8 cursor-pointer">Town photography &amp; credits</summary><p className="mt-2">Market and pedestrianised High Street images supplied by Trev; photographer and dates not provided. Church and park photographs are dated below and licensed under <a href="https://creativecommons.org/licenses/by-sa/2.0/" className="underline">CC BY-SA 2.0</a>, including their display crops. No photographer endorsement is implied.</p><ul className="mt-2 space-y-1">{HUCKNALL_PHOTOS.map(photo => <li key={photo.id}>{photo.source ? <a href={photo.source} className="underline">{photo.title}</a> : <span>{photo.title}</span>} · {photo.author} · {photo.year}</li>)}</ul></details>
    </section>

    {nativeDetails}
    {aboutContent}

    <section aria-labelledby="hub-directory-title" className="space-y-5">
      <div><p className="text-xs uppercase tracking-[0.16em] text-gold">Keep it local</p><h2 id="hub-directory-title" className="mt-2 font-display text-3xl text-foreground">Explore your local Circle</h2></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Browse business categories">{BUSINESS_DIRECTORY_CATEGORIES.map(([key, label], index) => { const Icon = CATEGORY_ICONS[index]; return <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(current => current === key ? "all" : key)} className={`flex min-h-28 flex-col items-start justify-between gap-3 rounded-2xl border p-4 text-left text-sm transition ${category === key ? "border-gold/60 bg-gold/15 text-gold" : "border-silver/20 bg-card/60 text-foreground hover:border-gold/40"}`}><Icon size={23} className="text-gold" /><span>{label}</span></button>; })}</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
        <label htmlFor="hub-search" className="relative"><span className="sr-only">Search local businesses</span><Search size={19} className="absolute left-4 top-4 text-muted" /><input id="hub-search" type="search" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search business names or services" className="min-h-14 w-full rounded-2xl border border-silver/25 bg-card pl-12 pr-4 text-foreground" /></label>
        <label htmlFor="hub-category"><span className="sr-only">Business category</span><select id="hub-category" value={category} onChange={event => setCategory(event.target.value)} className="min-h-14 w-full rounded-2xl border border-silver/25 bg-card px-4 text-foreground"><option value="all">All sections</option>{BUSINESS_DIRECTORY_CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <p className="text-sm text-muted" role="status">{filtered.length} {previewMode ? "illustrative listings" : filtered.length === 1 ? "business" : "businesses"} found. Highest Circle Trust first in each section.</p>

      {filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-gold/30 p-8 text-center"><Building2 className="mx-auto text-gold" size={32} /><h3 className="mt-4 text-xl text-foreground">{businesses.length ? "No matching businesses yet" : "Your local Circle starts here"}</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">{businesses.length ? "Try another name or section, or invite a local business to join." : "Run a business in NG15? Create your free Business Circle Card, add your postcode and turn on Discover to appear here."}</p>{!previewMode ? <Link href={joinPath} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-black">Join the hub free</Link> : <p className="mt-4 text-xs text-amber-100">Try a different search or category to explore the illustrative directory.</p>}</div> : null}

      {BUSINESS_DIRECTORY_CATEGORIES.map(([key, label]) => {
        const items = filtered.filter(business => business.category === key);
        if (!items.length) return null;
        const visible = expanded[key] ? items : items.slice(0, 6);
        return <section key={key} aria-labelledby={`hub-section-${key}`} className="space-y-4 pt-4">
          <h3 id={`hub-section-${key}`} className="flex items-center gap-3 font-display text-2xl text-foreground">{label}<span className="rounded-full border border-silver/20 px-2.5 py-1 font-sans text-xs text-muted">{items.length}</span></h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visible.map(business => <article key={business.id} className="flex flex-col rounded-2xl border border-silver/20 bg-card/70 p-5">
            <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-[#163c35]"><HucknallPhoto src={business.imageUrl} alt={`${business.name} profile picture`} fallback={business.name.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]).join("")} className="h-40 w-full object-contain p-4" /></div><div className="flex items-start justify-between gap-3"><Building2 size={23} className="text-gold" /><span className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold"><ShieldCheck size={13} /> {previewMode ? "Example listing" : `Circle Trust ${business.trustScore}`}</span></div>
            <h4 className="mt-4 break-words text-lg font-semibold text-foreground">{previewMode ? business.name : <Link href={`/card/${business.slug}`}>{business.name}</Link>}</h4>
            <p className="mt-2 flex-1 break-words text-sm leading-relaxed text-muted">{business.description || "Meet this local business through their Circle Card."}</p>
            <p className="mt-4 text-xs text-muted">NG15 · {business.verifiedTestimonials ? `${business.verifiedTestimonials} verified ${business.verifiedTestimonials === 1 ? "testimonial" : "testimonials"}` : "Building their Circle Trust"}</p>
            {previewMode ? <span className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-dashed border-gold/25 px-4 text-xs text-muted">Business card links appear here after launch</span> : <Link href={`/card/${business.slug}`} className="mt-4 inline-flex min-h-11 items-center justify-between gap-2 rounded-xl border border-gold/25 px-4 text-sm font-medium text-gold">View Circle Card <ArrowUpRight size={16} /></Link>}
          </article>)}</div>
          {items.length > 6 ? <button type="button" onClick={() => setExpanded(current => ({ ...current, [key]: !current[key] }))} className="min-h-11 rounded-full border border-silver/25 px-5 text-sm text-foreground">{expanded[key] ? "Show fewer" : `Show all ${items.length} in ${label}`}</button> : null}
        </section>;
      })}
    </section>

    <section className="grid gap-6 rounded-3xl border border-gold/25 bg-card/60 p-6 sm:p-8 md:grid-cols-2">
      <div><ShieldCheck className="text-gold" /><h2 className="mt-3 font-display text-2xl text-foreground">Earn your place in the Circle</h2><p className="mt-3 text-sm leading-relaxed text-muted">Sections are ordered by Circle Trust from verified Circle relationships, approved testimonials and profile signals. The directory score excludes membership points. Equal scores are ordered alphabetically.</p><p className="mt-3 text-sm leading-relaxed text-muted">Circle Trust shows activity and relationships on Circle Card. It is not a guarantee of workmanship or a verified business address. New businesses can join while they build their score.</p></div>
      <div><h2 className="font-display text-2xl text-foreground">Your business belongs here</h2><ol className="mt-4 space-y-3 text-sm text-muted">{["Create your free Business Circle Card.", "Add your full business postcode and choose a section.", "Publish your card and switch on Discover."].map(step => <li key={step} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-gold" />{step}</li>)}</ol><p className="mt-4 text-sm text-muted">{previewMode ? "At launch, eligible NG15 businesses will join automatically after opting into Discover." : "NG15 businesses are linked automatically. Switching Discover off, unpublishing or changing to an address outside NG15 removes your listing."}</p><p className="mt-4 text-sm text-muted">Stay free, {previewMode ? "choose Pro" : <Link href={proPath} className="text-gold underline">choose Pro</Link>} or ask about a custom card design with ongoing Pro membership. Upgrades never buy a better position.</p>{!previewMode ? <Link href={joinPath} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-black">Get your free business card</Link> : <p className="mt-5 text-xs text-amber-100">Joining is paused while this remains your private presentation draft.</p>}</div>
    </section>
  </div>;
}
