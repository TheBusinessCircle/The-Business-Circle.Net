import type { CSSProperties, ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Check, Globe2, Mail, MapPin, Phone, Send, Star } from "lucide-react";
import type { PublicCircleCard } from "@/server/circle-card";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { getExternalLinkProps } from "@/lib/links";
import { isSafeCircleCardLinkDestination } from "@/lib/circle-card/schema";
import { isSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { ConfirmAKillGallery } from "./confirm-gallery";
import styles from "./confirm-a-kill.module.css";

export const CONFIRM_DRAFT_ID = "cmw2jnnc6005xzfahkcfm7q39";
export const CONFIRM_DRAFT_SLUG = "confirm-a-kill-73f64ae9cc20";
export const CONFIRM_GOOGLE_REVIEWS = "https://www.google.com/maps?cid=13926558078507975125";
const ASSETS = {
  logo: "https://res.cloudinary.com/sziyzzje/image/upload/v1793822516/circle-card/confirm-a-kill/logo-20261104.png",
  hero: "https://res.cloudinary.com/sziyzzje/image/upload/v1793822538/circle-card/confirm-a-kill/hero-20261104.webp",
  domestic: "https://res.cloudinary.com/sziyzzje/image/upload/v1793822548/circle-card/confirm-a-kill/domestic-20261104.webp",
  commercial: "https://res.cloudinary.com/sziyzzje/image/upload/v1793822543/circle-card/confirm-a-kill/commercial-20261104.webp"
};

// A private Pro presentation only. No native/public business card is selected.
export function isConfirmAKillDraft(card: Pick<PublicCircleCard,"id"|"slug"|"cardType"|"isDemo"|"websiteUrl"|"user">, publicUrl: string) {
  if (card.id !== CONFIRM_DRAFT_ID || card.slug !== CONFIRM_DRAFT_SLUG ||
    card.cardType !== "BUSINESS" || !card.isDemo || !card.user.hasCircleCardProAccess || !card.websiteUrl) return false;
  try {
    const site = new URL(card.websiteUrl);
    const page = new URL(publicUrl);
    return site.protocol === "https:" && site.hostname.replace(/^www\./,"") === "confirmakill.co.uk" &&
      page.origin === "https://circlecard.co.uk" && page.pathname === `/prepared/${CONFIRM_DRAFT_SLUG}`;
  } catch { return false; }
}

type Props = {card:PublicCircleCard;identity:ReactNode;actions:ReactNode;connection:ReactNode;
  trust:ReactNode;qr:ReactNode;feedback?:ReactNode;analyticsCardId?:string;contactDownloadHref:string};

export function ConfirmAKillDraftCard({card,identity,actions,connection,trust,qr,feedback,analyticsCardId,contactDownloadHref}:Props) {
  const website = card.websiteUrl!;
  const quoteUrl = new URL("/free-local-pest-control-quote/",website).href;
  const commercialUrl = new URL("/commercial-pest-control/",website).href;
  const phone = card.phone?.trim();
  const tel = phone ? `tel:${phone.replace(/[^+\d]/g,"")}` : null;
  const hero = isSafeCircleCardImageUrl(card.profileImageUrl) ? card.profileImageUrl : ASSETS.hero;
  const links = card.customLinks.filter(link=>link.visibility === "PUBLIC" && link.url &&
    isSafeCircleCardLinkDestination(link.url) && (!link.expiresAt || new Date(link.expiresAt).getTime()>Date.now()));
  const surface = {"--cc-theme-section-bg":"#121e2a","--cc-theme-card-bg":"#192938",
    "--cc-theme-secondary-bg":"#192938","--cc-theme-secondary-hover-bg":"#223849",
    "--cc-theme-secondary-border":"rgba(244,203,56,.3)","--cc-theme-accent-hsl":"47 90% 59%",
    "--cc-theme-qr-bg":"#121e2a","--cc-theme-trust-bg":"#121e2a"} as CSSProperties;
  function cta(href:string,label:string,icon:ReactNode,secondary=false,source="confirm_quote") {
    return <CircleCardTrackedLink {...getExternalLinkProps(href)} cardId={analyticsCardId??""}
      eventType={href.startsWith("tel:")?"PHONE_CLICK":href.startsWith("mailto:")?"EMAIL_CLICK":"CUSTOM_LINK_CLICK"}
      metadata={{source,url:href}} className={`${styles.button} ${secondary?styles.outline:styles.primary}`}>
      {icon}<span>{label}</span><ArrowUpRight size={17} aria-hidden="true" />
    </CircleCardTrackedLink>;
  }
  return <div className={styles.page} style={surface} data-confirm-a-kill="private-bespoke-draft">
    <div className={styles.shell}>
      <header className={styles.masthead}><a {...getExternalLinkProps(website)}><img className={styles.brandLogo} src={ASSETS.logo} alt={card.businessName||card.fullName} /></a><a className={styles.textLink} href="#confirm-services">Find your pest <ArrowDown size={14} aria-hidden="true" /></a></header>
      <section className={styles.hero} aria-labelledby="confirm-hero-title">
        <img src={hero} alt="" className={styles.heroPhoto} /><div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <div className={styles.heroTop}><span className={styles.badge}><span />{card.location||"Nottingham & Nottinghamshire"}</span><span className={styles.edition}>LOCAL SINCE 1992</span></div>
          <div className={styles.identityRow}><div className={styles.spin}>{identity}</div><p className={styles.heroNote}>Your space.<br /><strong>Your peace of mind.</strong></p></div>
          <p className={styles.eyebrow}>{card.businessName||card.fullName}</p>
          <h1 className={styles.businessName} id="confirm-hero-title">Pest problem?<br /><em>We’ve got this.</em></h1>
          <p className={styles.heroIntro}>Experienced local help for the unwelcome visitors in your home or workplace.</p>
          <div className={styles.heroActions}>
            {tel?cta(tel,`Call ${phone}`,<Phone size={19} aria-hidden="true" />,false,"confirm_hero_call"):null}
            {cta(quoteUrl,"Get a personal quote",<Send size={19} aria-hidden="true" />,true)}
            {cta(website,"Visit Website",<Globe2 size={19} aria-hidden="true" />,true,"confirm_hero_website")}
            {cta(CONFIRM_GOOGLE_REVIEWS,"Read our Google reviews",<Star size={19} aria-hidden="true" />,true,"confirm_hero_reviews")}
          </div>
          <div className={styles.assurances}>{["Discreet visits","Free pest identification","Homes & businesses"].map(text=><span key={text}><Check size={13} aria-hidden="true" />{text}</span>)}</div>
        </div>
      </section>
      <section className={styles.nativeActions} aria-label="Save and connect"><a className={styles.contactSave} href={contactDownloadHref}>Save business contact <ArrowDown size={16} aria-hidden="true" /></a>{actions}{connection}</section>{feedback}
      <section className={styles.process} aria-label="From first call to practical aftercare">
        {[['01','Tell us what you’ve seen','A short description and a safe photograph help the team understand the problem.'],['02','Understand the next step','Discuss the property, the options and the cost before work begins.'],['03','Treatment and aftercare','A suitable response, followed by advice to reduce repeat activity.']].map(([number,title,copy])=><article key={number}><span>{number} / THE NEXT STEP</span><h3>{title}</h3><p>{copy}</p></article>)}
      </section>
      <section id="confirm-services" className={styles.services} aria-labelledby="confirm-services-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>WHAT’S IN YOUR SPACE?</p><h2 id="confirm-services-title">The right help.<br /><em>For the right pest.</em></h2></div><p>Start with the signs you have noticed. Not sure? Ask for identification help.</p></div><div className={styles.serviceGrid}>{card.services.filter(s=>s.isActive).map((s,i)=><article key={s.id} className={styles.service}><span className={styles.serviceNumber}>{String(i+1).padStart(2,"0")}</span><h3>{s.title}</h3>{s.description?<p>{s.description}</p>:null}{s.ctaUrl&&isSafeCircleCardLinkDestination(s.ctaUrl)?<a className={styles.textLink} {...getExternalLinkProps(s.ctaUrl)}>{s.ctaLabel||"Explore this service"}<ArrowUpRight size={14} aria-hidden="true" /></a>:null}</article>)}</div>
        <div className={styles.situations}><article className={styles.situation}><img src={ASSETS.domestic} alt="Residential property, as shown on Confirm A Kill’s website" loading="lazy" /><div><p className={styles.eyebrow}>FOR YOUR HOME</p><h3>Feel at home again.</h3><p>Support for households, landlords and rented properties.</p>{cta(quoteUrl,"Tell us what you’ve seen",<Send size={18} aria-hidden="true" />)}</div></article><article className={styles.situation}><img src={ASSETS.commercial} alt="Commercial kitchen, as shown on Confirm A Kill’s website" loading="lazy" /><div><p className={styles.eyebrow}>FOR YOUR BUSINESS</p><h3>Protect your premises.</h3><p>Discuss a call-out or planned visits around your business.</p>{cta(commercialUrl,"Discuss pest protection",<ArrowUpRight size={18} aria-hidden="true" />)}</div></article></div>
      </section>
      <ConfirmAKillGallery items={card.galleryItems} />
      <section className={styles.about} aria-labelledby="confirm-about-title"><div><p className={styles.eyebrow}>NOTTINGHAM ROOTS. PERSONAL SERVICE.</p><h2 id="confirm-about-title">Local experience.<br /><em>A calmer next step.</em></h2><p className={styles.aboutCopy}>{card.about}</p></div><aside className={styles.teamPanel}><span className={styles.brandYear}>1992</span><h3>Established in Nottingham.</h3><p>A family-run business with a practical approach to pest problems. Speak to the local team about your situation.</p>{cta(new URL("/about-confirm-a-kill/",website).href,"Meet Confirm A Kill",<ArrowUpRight size={18} aria-hidden="true" />,true)}</aside></section>
      {links.length?<section className={styles.explore} aria-labelledby="confirm-links-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>STRAIGHT TO WHAT YOU NEED</p><h2 id="confirm-links-title">Your next step.</h2></div></div><div className={styles.linkGrid}>{links.map(link=><CircleCardTrackedLink key={link.id} {...getExternalLinkProps(link.url!)} cardId={analyticsCardId??""} eventType="CUSTOM_LINK_CLICK" metadata={{source:"confirm_featured",linkId:link.id}} className={styles.featureLink}><div><strong>{link.label}</strong>{link.description?<p>{link.description}</p>:null}</div><ArrowUpRight size={20} aria-hidden="true" /></CircleCardTrackedLink>)}</div></section>:null}
      <section className={styles.finalCta} aria-labelledby="confirm-contact-title"><p className={styles.eyebrow}>NO JUDGEMENT. JUST THE NEXT STEP.</p><h2 id="confirm-contact-title">Something’s moved in?<br /><em>Let’s work it out.</em></h2><p>Tell the team what you have noticed and where.</p>{cta(quoteUrl,"Get a personal quote",<Send size={18} aria-hidden="true" />)}<div className={styles.direct}>{tel?<a href={tel}><Phone size={15} aria-hidden="true" />{phone}</a>:null}{card.email?<a href={`mailto:${card.email}`}><Mail size={15} aria-hidden="true" />Email the team</a>:null}{card.location?<span><MapPin size={15} aria-hidden="true" />{card.location}</span>:null}</div></section>
      <div className={styles.nativePanels}>{trust}{qr}</div><footer className={styles.footer}><span>CONFIRM A KILL<small>LOCAL PEST CONTROL SINCE 1992</small></span><span>Your space. Your peace of mind.<br /><a href="https://circlecard.co.uk/">Powered by Circle Card ↗</a></span></footer>
    </div>
  </div>;
}
