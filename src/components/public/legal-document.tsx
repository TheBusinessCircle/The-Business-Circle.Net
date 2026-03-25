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
};

export function LegalDocument({
  label,
  title,
  intro,
  updatedAt,
  supportEmail,
  sections
}: LegalDocumentProps) {
  return (
    <div className="space-y-10 pb-16">
      <section className="public-panel overflow-hidden p-8 sm:p-10">
        <SectionHeading label={label} title={title} description={intro} />
        <div className="gold-divider my-6" />
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>Last updated {updatedAt}</span>
          <span className="hidden text-border sm:inline">/</span>
          <a
            href={`mailto:${supportEmail}`}
            className="text-silver transition-colors hover:text-gold"
          >
            {supportEmail}
          </a>
        </div>
      </section>

      <section className="space-y-4">
        {sections.map((section) => (
          <article key={section.title} className="public-panel p-6 sm:p-7">
            <h2 className="font-display text-2xl text-foreground">
              {section.title}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
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
    </div>
  );
}
