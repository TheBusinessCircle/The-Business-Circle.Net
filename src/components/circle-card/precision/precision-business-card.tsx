import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, Globe2, Mail, MapPin, Phone, Send, Star } from "lucide-react";
import type { PublicCircleCard } from "@/server/circle-card";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { getExternalLinkProps } from "@/lib/links";
import { isSafeCircleCardLinkDestination } from "@/lib/circle-card/schema";
import { PrecisionGallery } from "./precision-gallery";
import styles from "./precision.module.css";

export const PRECISION_DRAFT_ID = "cmvwefhtp00csu7ahdicybag5";
export const PRECISION_SLUG = "precision-finish-plastering-rendering-ecb582748528";
export const PRECISION_REVIEW_URL = "https://g.page/r/Cb0gy5hYJ94-EAE/review";

export function isPrecisionBusiness(card: Pick<PublicCircleCard, "slug" | "cardType" | "websiteUrl">) {
  if (card.cardType !== "BUSINESS" || card.slug !== PRECISION_SLUG || !card.websiteUrl) return false;
  try {
    const site = new URL(card.websiteUrl);
    return site.protocol === "https:" && site.hostname.replace(/^www\./, "") === "precisionplasteringandrendering.co.uk";
  } catch { return false; }
}

type Props = {
  card: PublicCircleCard;
  identity: ReactNode;
  actions: ReactNode;
  connection: ReactNode;
  trust: ReactNode;
  qr: ReactNode;
  feedback?: ReactNode;
  analyticsCardId?: string;
  contactDownloadHref: string;
};

export function PrecisionBusinessCard({ card, identity, actions, connection, trust, qr, feedback, analyticsCardId, contactDownloadHref }: Props) {
  const website = card.websiteUrl!;
  const quoteUrl = new URL("#quote", website).href;
  const phone = card.phone?.trim();
  const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : null;
  const title = card.businessName || card.fullName;
  const activeLinks = card.customLinks.filter(link => link.visibility === "PUBLIC" && link.url && isSafeCircleCardLinkDestination(link.url) && (!link.expiresAt || new Date(link.expiresAt).getTime() > Date.now()));
  const surface = {
    "--cc-theme-section-bg": "#171816", "--cc-theme-card-bg": "#20211e",
    "--cc-theme-secondary-bg": "#20211e", "--cc-theme-secondary-hover-bg": "#2a2b26",
    "--cc-theme-secondary-border": "rgba(227,154,37,.28)", "--cc-theme-accent-hsl": "37 77% 52%",
    "--cc-theme-qr-bg": "#171816", "--cc-theme-trust-bg": "#171816"
  } as CSSProperties;

  function cta(href: string, label: string, icon: ReactNode, secondary = false, source = "precision_quote") {
    return <CircleCardTrackedLink {...getExternalLinkProps(href)} cardId={analyticsCardId ?? ""}
      eventType={href.startsWith("tel:") ? "PHONE_CLICK" : href.startsWith("mailto:") ? "EMAIL_CLICK" : "CUSTOM_LINK_CLICK"}
      metadata={{ source, url: href }} className={`${styles.button} ${secondary ? styles.outline : styles.primary}`}>
      {icon}<span>{label}</span><ArrowUpRight size={17} aria-hidden="true" />
    </CircleCardTrackedLink>;
  }

  return <div className={styles.page} style={surface} data-precision-business="bespoke">
    <div className={styles.shell}>
      <header className={styles.masthead}>
        <a {...getExternalLinkProps(website)} className={styles.wordmark}>PRECISION <span>FINISH</span><small>PLASTERING &amp; RENDERING</small></a>
        <a href="#precision-work" className={styles.textLink}>See the finish <ArrowDown size={14} aria-hidden="true" /></a>
      </header>

      <section className={styles.hero} aria-labelledby="precision-business-name">
        <img className={styles.heroPhoto} src="https://precisionplasteringandrendering.co.uk/assets/images/hero-finished-room.webp" alt="" />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <div className={styles.heroTop}><span className={styles.badge}><span /> Hucknall · Nottingham · Beyond</span><span className={styles.edition}>THE BUSINESS CIRCLE CARD</span></div>
          <div className={styles.identityRow}><div className={styles.spin}>{identity}</div><p className={styles.heroNote}>Local tradesmen.<br /><strong>Care in every detail.</strong></p></div>
          <p className={styles.eyebrow}>A BETTER FINISH STARTS HERE</p>
          <h1 id="precision-business-name" className={styles.businessName}>{title}</h1>
          <p className={styles.tagline}>{card.tagline || "Clean lines. Smooth walls. Precision finish."}</p>
          <p className={styles.heroIntro}>From a single ceiling to a whole-home refresh. Plastering and rendering, with a finish you can be proud of.</p>
          <div className={styles.heroActions}>
            {cta(website, "Visit Website", <Globe2 size={19} aria-hidden="true" />, false, "precision_hero_website")}
            {cta(PRECISION_REVIEW_URL, "Leave us a Google review", <Star size={19} aria-hidden="true" />, true, "precision_hero_review")}
          </div>
          <div className={styles.assurances}>{["Free quotes", "Careful preparation", "Clean, smooth finishes"].map(text=><span key={text}><Check size={13} aria-hidden="true" />{text}</span>)}</div>
        </div>
      </section>

      <section className={styles.projectStrip} aria-labelledby="precision-project-title">
        <div><p className={styles.eyebrow}>LET’S TALK ABOUT YOUR SPACE</p><h2 id="precision-project-title">Your next project.<br /><em>Our attention to detail.</em></h2><p>Send a few photos and tell the team what needs doing.</p></div>
        <div className={styles.projectButtons}>{cta(quoteUrl,"Get my free quote",<Send size={18} aria-hidden="true" />)}{phoneHref ? cta(phoneHref,`Call ${phone}`,<Phone size={18} aria-hidden="true" />,true,"precision_call") : null}<small>Free, no-obligation quotes. Straightforward advice.</small></div>
      </section>

      <section aria-label="Save and connect" className={styles.nativeActions}>
        <a href={contactDownloadHref} className={styles.contactSave}>Save business contact <ArrowDown size={16} aria-hidden="true" /></a>
        {actions}{connection}
      </section>
      {feedback}

      {card.services.length ? <section className={styles.services} aria-labelledby="precision-services-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>FROM WALLS TO WHOLE HOMES</p><h2 id="precision-services-title">Good spaces start<br />with a <em>great finish.</em></h2></div><p>Indoors or outside, find the right starting point for your property.</p></div>
        <div className={styles.serviceGrid}>{card.services.filter(s=>s.isActive).map((service,index)=><article key={service.id} className={styles.service}><span className={styles.serviceNumber}>{String(index+1).padStart(2,"0")}</span><h3>{service.title}</h3>{service.description ? <p>{service.description}</p>:null}{service.ctaUrl && isSafeCircleCardLinkDestination(service.ctaUrl) ? <a {...getExternalLinkProps(service.ctaUrl)} className={styles.textLink}>{service.ctaLabel || "Explore this service"} <ArrowUpRight size={14} aria-hidden="true" /></a>:null}</article>)}</div>
      </section>:null}

      <PrecisionGallery items={card.galleryItems} />

      <section className={styles.about} aria-labelledby="precision-about-title">
        <div><p className={styles.eyebrow}>PEOPLE BEHIND THE FINISH</p><h2 id="precision-about-title">A local team.<br /><em>A personal approach.</em></h2><p className={styles.aboutCopy}>{card.about}</p></div>
        <aside className={styles.teamPanel}><span className={styles.teamMark}>PF<span>Precision Finish</span></span><h3>Meet Ged &amp; Harrison</h3><p>Two familiar faces. One team focused on your plastering and rendering project.</p><div className={styles.teamLinks}><Link href="/card/precision-finish-plastering-redering"><span>G</span><div><strong>Ged</strong><small>View personal Circle Card</small></div><ArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/card/precision-finish-plastering-rendering"><span>HD</span><div><strong>Harrison Delbuono</strong><small>View personal Circle Card</small></div><ArrowUpRight size={18} aria-hidden="true" /></Link></div></aside>
      </section>

      {activeLinks.length ? <section className={styles.explore} aria-labelledby="precision-links-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>GO A LITTLE FURTHER</p><h2 id="precision-links-title">Explore Precision.</h2></div></div><div className={styles.linkGrid}>{activeLinks.map(link=><CircleCardTrackedLink {...getExternalLinkProps(link.url!)} cardId={analyticsCardId??""} eventType="CUSTOM_LINK_CLICK" metadata={{source:"precision_featured",linkId:link.id}} key={link.id} className={styles.featureLink}><div><strong>{link.label}</strong>{link.description?<p>{link.description}</p>:null}</div><ArrowUpRight size={20} aria-hidden="true" /></CircleCardTrackedLink>)}</div></section>:null}

      <section className={styles.finalCta} aria-labelledby="precision-ready-title"><p className={styles.eyebrow}>ONE ROOM. ONE REPAIR. A FRESH START.</p><h2 id="precision-ready-title">Ready for your<br /><em>Precision finish?</em></h2><p>A few details. A few photos. Let’s work out the next step.</p>{cta(quoteUrl,"Tell us about your project",<Send size={18} aria-hidden="true" />)}<div className={styles.direct}>{phoneHref?<a href={phoneHref}><Phone size={15} aria-hidden="true" />{phone}</a>:null}{card.email?<a href={`mailto:${card.email}`}><Mail size={15} aria-hidden="true" />Email the team</a>:null}{card.location?<span><MapPin size={15} aria-hidden="true" />{card.location}</span>:null}</div></section>

      <div className={styles.nativePanels}>{trust}{qr}</div>
      <footer className={styles.footer}><span>PRECISION FINISH <small>PLASTERING &amp; RENDERING</small></span><span>Built around your business.<br /><a href="https://circlecard.co.uk/">Powered by Circle Card ↗</a></span></footer>
    </div>
  </div>;
}
