import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ArrowDown, ArrowUpRight, MapPin, Phone, Facebook, ArrowRight, Bookmark } from "lucide-react";
import { lawrenceFacebook, lawrencePhotos } from "./content";
import { CircleCardTrackedLink } from "../circle-card-tracked-link";
import { LawrenceSevernLogoFace } from "./lawrence-severn-logo";
import styles from "./lawrence-severn.module.css";

type Props = {
  name: string;
  phone: string | null;
  location: string | null;
  spin?: ReactNode;
  share?: ReactNode;
  wallet?: ReactNode;
  qr?: ReactNode;
  contactHref: string;
  isDemo: boolean;
  galleryEnabled: boolean;
  analyticsCardId?: string;
  feedback?: ReactNode;
  heroImageUrl?: string | null;
  galleryItems?: { id: string; title: string; imageUrl: string; isActive: boolean }[];
};

/** A deliberately scoped card, reusing its parent's real spin/share/wallet actions. */
export function LawrenceSevernCard({ name, phone, location, spin, share, wallet, qr, contactHref, isDemo, galleryEnabled, analyticsCardId, feedback, heroImageUrl = lawrencePhotos.shopfront, galleryItems }: Props) {
  const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : null;
  const mapsHref = location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : null;
  const photos = galleryItems === undefined ? [
    {id:"counter",title:"Real people. Proper service.",imageUrl:lawrencePhotos.counter,isActive:true},
    {id:"cuts",title:"Your everyday favourites.",imageUrl:lawrencePhotos.cuts,isActive:true},
    {id:"deli",title:"Something for the table.",imageUrl:lawrencePhotos.deli,isActive:true}
  ] : galleryItems.filter(item => item.isActive && /^(https:\/\/|\/(?!\/))/.test(item.imageUrl)).slice(0,3);
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  function ActionLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
    const href = props.href ?? "";
    const eventType = href.startsWith("tel:") ? "PHONE_CLICK" : href.endsWith("/vcard") ? "VCARD_DOWNLOAD" : "CUSTOM_LINK_CLICK";
    return <CircleCardTrackedLink {...props} cardId={analyticsCardId ?? ""} eventType={eventType} metadata={{ source: "lawrence_bespoke", url: href }} />;
  }
  return (
    <div className={styles.card} data-bespoke-card="lawrence-severn">
      <div className={styles.sheet}>
        <header className={styles.header}>
          <ActionLink href="#lawrence-top" className={styles.wordmark} aria-label={name}>
            <span>LAWRENCE SEVERN</span><span className={styles.wordmarkSecond}>& SON <span>•</span> QUALITY BUTCHERS</span>
          </ActionLink>
          <div className={styles.headerRight}><span className={styles.headerPlace}>HUCKNALL, NOTTINGHAM</span><ActionLink href="/" className={styles.circleBrand}><img src="/branding/circle-card-logo.png" alt="" width="24" height="24" /><span>Circle Card</span></ActionLink>{share}</div>
        </header>
        {isDemo ? <p className={styles.demoNote}>Private design preview · Prepared for Lawrence Severn & Son · Not an official published business card</p> : null}
        <main id="lawrence-top">
          {feedback}
          <section className={styles.identityPanel} aria-label="Circle Card connection">
            <div className={styles.spin}>{spin ?? <button type="button" className={styles.previewSpin} data-preview-spin aria-label="Spin Lawrence Severn & Son’s logo — design preview"><LawrenceSevernLogoFace /></button>}</div>
            <div className={styles.identityPrompt}><p className={styles.eyebrow}>YOUR LOCAL BUTCHER. IN YOUR CIRCLE.</p><h2>Spin the logo<br /><em>to connect.</em></h2><p>Tap or swipe the circle to keep us close.</p>{!spin ? <span role="status" data-preview-spin-status>Design preview · No connection is created here.</span> : null}</div>
          </section>
          <section className={styles.hero} aria-labelledby="lawrence-heading">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span /> YOUR HIGH STREET BUTCHER · EST. 1979</p>
              <h1 id="lawrence-heading">Good food.<br />Proper butchery.<br /><em>Right here in Hucknall.</em></h1>
              <p className={styles.intro}>From the Sunday roast to something for tonight. Quality cuts, counter favourites and a friendly face to help you choose.</p>
              <div className={styles.actions}>
                {phoneHref ? <ActionLink href={phoneHref} className={styles.primary}><Phone size={17} aria-hidden="true" />Call the shop<ArrowUpRight size={16} aria-hidden="true" /></ActionLink> : null}
                {mapsHref ? <ActionLink href={mapsHref} {...external} className={styles.secondary}><MapPin size={17} aria-hidden="true" />Find us</ActionLink> : null}
              </div>
              <ActionLink href={lawrenceFacebook} {...external} className={styles.facebook}><Facebook size={15} aria-hidden="true" />Find us on Facebook<ArrowUpRight size={14} aria-hidden="true" /></ActionLink>
              <div className={styles.heritage}><span className={styles.heritageYear}>1979</span><span>A Hucknall original.<br /><strong>Part of your High Street.</strong></span></div>
            </div>
            <div className={styles.heroVisual}>
              <figure className={styles.shopfront}>{heroImageUrl ? <img src={heroImageUrl} alt="The real Lawrence Severn & Son shopfront on Hucknall High Street" fetchPriority="high" width="716" height="650" /> : <div className={styles.noPhoto}>Lawrence Severn<br />& Son</div>}<figcaption><span>COME ON IN</span><strong>53 High Street, Hucknall</strong><ArrowUpRight size={21} aria-hidden="true" /></figcaption></figure>
              <span className={styles.photoCredit}>Shopfront photograph: The Data Company</span>
            </div>
          </section>
          <div className={styles.ribbon} aria-label="At your local butcher"><span>TRADITIONAL CUTS</span><i aria-hidden="true">✦</i><span>FAMILY FAVOURITES</span><i aria-hidden="true">✦</i><span>FRIENDLY ADVICE</span></div>
          {galleryEnabled && photos.length ? <section className={styles.counterSection} aria-labelledby="lawrence-counter">
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>A LOOK INSIDE</p><h2 id="lawrence-counter">A proper butcher’s counter.</h2></div><p>Take a closer look at the shop.<br />Call us for today’s selection.</p></div>
            <div className={styles.photoGrid}>
              {photos.map((photo,index) => <ActionLink key={photo.id} className={index === 0 ? styles.photoFeature : styles.photoTile} href={photo.imageUrl} {...external} aria-label={`Enlarge ${photo.title}`}><img src={photo.imageUrl} alt={photo.title} loading="lazy" width="716" height="545" /><div><span>{["THE SHOP","THE COUNTER","A LITTLE INSPIRATION"][index]}</span><h3>{photo.title}</h3><ArrowUpRight size={19} aria-hidden="true" /></div></ActionLink>)}
            </div>
            <p className={styles.photoNote}>Photos show the shop and its counter selection. Products and availability may vary. Interior photographs supplied from Google Maps.</p>
          </section> : null}
          <section className={styles.story} aria-labelledby="lawrence-story"><div><p className={styles.eyebrow}>GOOD FOOD. LOCAL KNOW-HOW.</p><h2 id="lawrence-story">Not sure which cut?<br /><em>That’s what we’re here for.</em></h2></div><div><p>Tell us what you’re cooking. From a family roast to a quick midweek meal, pop in for a chat and help choosing from the counter.</p><p>Lawrence Severn & Son has been serving Hucknall since 1979. You’ll find us on the High Street.</p><ActionLink href={mapsHref ?? lawrenceFacebook} {...external} className={styles.textLink}>Make your next meal a local one<ArrowRight size={17} aria-hidden="true" /></ActionLink></div></section>
          <section className={styles.visit} aria-labelledby="lawrence-visit"><div><p className={styles.eyebrow}>WE’RE JUST ON THE HIGH STREET</p><h2 id="lawrence-visit">Your next good meal<br /><em>starts here.</em></h2><p>{location}</p><p className={styles.visitNote}>Planning a special meal? Call ahead to discuss your cut and check availability.</p></div><div className={styles.visitActions}>{phoneHref ? <ActionLink className={styles.visitPhone} href={phoneHref}><Phone size={22} aria-hidden="true" /><span><small>GIVE THE SHOP A CALL</small><strong>{phone}</strong></span><ArrowUpRight size={23} aria-hidden="true" /></ActionLink> : null}{mapsHref ? <ActionLink href={mapsHref} {...external} className={styles.creamButton}><MapPin size={17} aria-hidden="true" />Get directions<ArrowUpRight size={17} aria-hidden="true" /></ActionLink> : null}<ActionLink href={lawrenceFacebook} {...external} className={styles.visitFacebook}><Facebook size={16} aria-hidden="true" />Visit our Facebook page<ArrowUpRight size={16} aria-hidden="true" /></ActionLink></div></section>
          <section className={styles.keep} aria-labelledby="lawrence-keep"><div><Bookmark size={24} aria-hidden="true" /><div><h2 id="lawrence-keep">Keep your local butcher close.</h2><p>Save the details for the next time you’re planning dinner.</p></div></div><div className={styles.keepActions}><ActionLink href={contactHref} className={styles.secondary}>Save contact<ArrowDown size={15} aria-hidden="true" /></ActionLink>{wallet}</div></section>
          {qr ? <details className={styles.qrDetails}><summary>Share this Circle Card · QR code</summary><div className={styles.qrPanel}>{qr}</div></details> : null}
        </main>
        <footer className={styles.footer}><span>LAWRENCE SEVERN & SON <small>HUCKNALL · EST. 1979</small></span><ActionLink href="/" aria-label="Circle Card home">Powered by <strong>Circle Card</strong><ArrowUpRight size={13} aria-hidden="true" /></ActionLink></footer>
      </div>
      <nav className={styles.mobileBar} aria-label="Contact the butcher">{phoneHref ? <ActionLink href={phoneHref}><Phone size={18} aria-hidden="true" />Call the shop</ActionLink> : null}{mapsHref ? <ActionLink href={mapsHref} {...external}><MapPin size={18} aria-hidden="true" />Directions</ActionLink> : null}</nav>
    </div>
  );
}
