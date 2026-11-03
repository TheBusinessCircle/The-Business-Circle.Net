import Link from "next/link";
import { HUCKNALL_ABOUT_PATH, HUCKNALL_ABOUT_SECTIONS, HUCKNALL_SOURCES } from "@/lib/circle-card/hucknall-content";

export function HucknallAboutSummary() {
  return <section aria-labelledby="about-hucknall-hub" className="rounded-3xl border border-gold/25 bg-card/70 p-6 sm:p-8">
    <p className="text-xs uppercase tracking-[0.15em] text-gold">Our town. Our story.</p>
    <h2 id="about-hucknall-hub" className="mt-3 font-display text-3xl text-foreground">Made for the people of Hucknall</h2>
    <p className="mt-4 text-sm leading-relaxed text-muted">An independent local hub run by Trev Newton-Bradley, bringing Hucknall businesses, community organisations and useful places together. From the High Street and outdoor market to our heritage, parks and everyday services, the aim is simple: make it easier to find what is on your doorstep.</p>
    <p className="mt-3 text-sm leading-relaxed text-muted">Explore Hucknall&apos;s connections with Lord Byron and Ada Lovelace, learn about the town&apos;s working heritage, and discover practical information for a local visit. Save this hub to your Circle Wallet to keep your local Circle close.</p>
    <Link href={HUCKNALL_ABOUT_PATH} className="mt-5 inline-flex min-h-11 items-center rounded-full border border-gold/35 px-5 text-sm text-gold">About Hucknall &amp; the hub</Link>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[
      ["heritage", "Heritage & ideas", "Byron, Ada Lovelace and the story of a working town."],
      ["visit", "High Street & market", "Independent shops, local food and places to explore."],
      ["getting-here", "Visit Hucknall", "Practical links for trams, trains, buses and parking."]
    ].map(([anchor, title, detail]) => <Link key={anchor} href={`${HUCKNALL_ABOUT_PATH}#${anchor}`} className="rounded-2xl border border-gold/20 bg-background/40 p-4"><h3 className="font-semibold text-foreground">{title}</h3><p className="mt-2 text-xs leading-relaxed text-muted">{detail}</p></Link>)}</div>
  </section>;
}

export function HucknallAboutPageContent() {
  return <article className="mx-auto max-w-4xl space-y-8 px-5 py-10 sm:px-8">
    <Link href="/card/hucknall-circle-hub" className="inline-flex min-h-11 items-center text-sm text-gold">Back to Hucknall Circle Hub</Link>
    <header><p className="text-xs uppercase tracking-[0.18em] text-gold">Hucknall, Nottinghamshire</p><h1 className="mt-4 font-display text-4xl text-foreground sm:text-6xl">Our town.<br />Our Circle.</h1><p className="mt-5 text-lg leading-relaxed text-muted">About Hucknall, its local businesses and heritage, and the independent hub bringing people together.</p></header>
    <nav aria-label="About page sections" className="flex flex-wrap gap-2">{HUCKNALL_ABOUT_SECTIONS.map(section => <a key={section.id} href={`#${section.id}`} className="rounded-full border border-gold/25 px-4 py-2 text-xs text-gold">{section.title}</a>)}</nav>
    {HUCKNALL_ABOUT_SECTIONS.map(section => <section key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-silver/15 bg-card/50 p-6"><h2 className="font-display text-2xl text-foreground">{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph.slice(0, 45)} className="mt-4 text-base leading-relaxed text-muted">{paragraph}</p>)}</section>)}
    <section className="rounded-2xl border border-gold/25 p-6"><h2 className="font-display text-2xl">Local information &amp; sources</h2><p className="mt-3 text-sm text-muted">Researched 3 November 2026. Opening times and travel arrangements can change. Use these organisations&apos; own information for your visit. Links are provided as references, not claims of partnership or membership.</p><ul className="mt-4 space-y-3">{HUCKNALL_SOURCES.map(source => <li key={source.url}><a href={source.url} rel="noopener noreferrer" target="_blank" className="text-sm text-gold underline">{source.title}</a></li>)}</ul></section>
  </article>;
}
