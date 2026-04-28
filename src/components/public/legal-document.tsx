import type { ReactNode } from "react";
import { formatCompanyTrustLine } from "@/config/company";
import { SectionHeading } from "@/components/public/section-heading";

export type LegalDocumentSection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

type LegalDocumentProps = {
  label: string;
  title: string;
  intro: string;
  updatedAt: string;
  supportEmail: string;
  sections: readonly LegalDocumentSection[];
  children?: ReactNode;
};

export function LegalDocument({
  label,
  title,
  intro,
  updatedAt,
  supportEmail,
  sections,
  children
}: LegalDocumentProps) {
  return (
    <div className="space-y-20 pb-28 lg:space-y-28 lg:pb-36">
      <section className="public-panel relative overflow-hidden px-6 py-28 sm:px-8 lg:px-10 lg:py-36">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.44)_100%),linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.58)_100%)]" />
        <div className="relative">
          <SectionHeading label={label} title={title} description={intro} />
          <div className="gold-divider my-6" />
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>Last updated: {updatedAt}</span>
            <span className="hidden text-border sm:inline">/</span>
            <a
              href={`mailto:${supportEmail}`}
              className="text-silver transition-colors hover:text-gold"
            >
              {supportEmail}
            </a>
            <span className="hidden text-border sm:inline">/</span>
            <span>{formatCompanyTrustLine()}</span>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {sections.map((section) => (
          <article key={section.title} className="public-panel p-6 lg:p-8">
            <h2 className="font-display text-3xl tracking-tight text-foreground">
              {section.title}
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-white/75">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.bullets?.length ? (
              <ul className="mt-4 space-y-2">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="rounded-2xl border border-border/80 bg-background/30 px-4 py-3 text-sm text-muted"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      {children}
    </div>
  );
}
