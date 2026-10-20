import Link from "next/link";
import { BrandMark } from "@/components/branding/brand-mark";
import { CookieSettingsButton } from "@/components/privacy/cookie-settings-button";
import type { ReactNode } from "react";
import "./v2.css";
const navigation = [
  ["Free tools", "/tools"],
  ["Business advice", "/advice"],
  ["Build it together", "/ideas"],
  ["Find help", "/find-help"],
  ["Directory", "/business-directory"],
  ["Connections", "/connections"],
];
export function BcnShell({ children }: { children: ReactNode }) {
  return (
    <div className="bcn-v2">
      <a className="v2-skip" href="#bcn-main">
        Skip to content
      </a>
      <header className="v2-header">
        <div className="v2-wrap v2-header-inner">
          <Link href="/" className="v2-brand">
            <BrandMark placement="workspace" />
            <span>
              The Business Circle<small>REAL HELP. BETTER BUSINESS.</small>
            </span>
          </Link>
          <nav className="v2-desktop-nav" aria-label="Main navigation">
            {navigation.map(([title, href]) => (
              <Link key={href} href={href}>
                {title}
              </Link>
            ))}
          </nav>
          <Link className="v2-signin" href="/login">
            Sign in <span aria-hidden="true">↗</span>
          </Link>
          <details className="v2-mobile-nav">
            <summary>Menu</summary>
            <nav aria-label="Mobile navigation">
              {navigation.map(([title, href]) => (
                <Link key={href} href={href}>
                  {title}
                </Link>
              ))}
              <Link href="/opportunities">Opportunities</Link>
            </nav>
          </details>
        </div>
      </header>
      <main id="bcn-main">{children}</main>
      <footer className="v2-footer">
        <div className="v2-wrap">
          <div className="v2-footer-top">
            <div>
              <Link href="/" className="v2-brand">
                <BrandMark placement="workspace" />
                <span>The Business Circle</span>
              </Link>
              <p>Real help for real business owners.</p>
              <p className="v2-muted">
                Work it out. Get it done. Meet the right people.
              </p>
            </div>
            <nav aria-label="Footer navigation">
              <Link href="/start">Starting a business</Link>
              <Link href="/ideas">Build it together</Link>
              <Link href="/about">About BCN</Link>
              <Link href="/how-we-work">How we work & earn</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/opportunities">Opportunities</Link>
            </nav>
            <nav aria-label="Legal navigation">
              <Link href="/privacy-policy">Privacy</Link>
              <Link href="/terms-of-service">Terms</Link>
              <Link href="/cookie-policy">Cookies</Link>
              <Link href="/rules">Community rules</Link>
              <CookieSettingsButton />
            </nav>
          </div>
          <div className="v2-footer-bottom">
            © {new Date().getFullYear()} THE BUSINESS CIRCLE NETWORK LTD ·
            Company no. 17135876 · England & Wales
          </div>
        </div>
      </footer>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="v2-page-heading">
      <div className="v2-wrap">
        <p className="v2-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="v2-intro">{children}</div>
      </div>
    </section>
  );
}
