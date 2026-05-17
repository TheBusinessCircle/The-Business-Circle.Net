import Link from "next/link";
import type { PublicIntentPage } from "@/config/public-intent-pages";
import {
  AnswerBlock,
  HowBcnWorksSection,
  PrivacyBoundaryNote,
  TrustTrailSection,
  TwoPathCta
} from "@/components/public/answer-block";
import { FAQSection } from "@/components/public/faq-section";
import { JsonLd } from "@/components/public/json-ld";
import { TrackedPublicCtaLink } from "@/components/public/tracked-public-cta-link";
import { buttonVariants } from "@/components/ui/button";
import { buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

export function SeoIntentPage({ page }: { page: PublicIntentPage }) {
  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildWebPageSchema({
          title: page.title,
          description: page.description,
          path: page.path,
          primaryQuestion: page.answerQuestion,
          primaryAnswer: page.answerText
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/home" },
          { name: page.title, path: page.path }
        ])}
      />
      <JsonLd data={buildFaqSchema(page.faqItems)} />

      <section className="public-hero-spacing relative overflow-hidden rounded-[2.05rem] border border-border/80 bg-card/60 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />
        <div className="relative max-w-5xl space-y-6">
          <p className="premium-kicker">{page.eyebrow}</p>
          <h1 className="font-display text-4xl leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-7xl">
            {page.heroTitle}
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-white/82 sm:text-xl">
            {page.heroCopy}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedPublicCtaLink
              href="/membership"
              label="Explore Membership"
              source="intent"
              showArrow
              className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
            />
            <TrackedPublicCtaLink
              href="/audit"
              label="Run the Founder Audit"
              source="intent"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            />
          </div>
        </div>
      </section>

      <AnswerBlock
        label="What this page answers"
        question={page.answerQuestion}
        answer={page.answerText}
      />

      <section className="public-section">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.8rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft sm:p-6">
            <p className="premium-kicker">The problem</p>
            <h2 className="mt-4 font-display text-3xl text-foreground">{page.problemTitle}</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{page.problemCopy}</p>
          </article>

          <article className="rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6">
            <p className="premium-kicker">The BCN alternative</p>
            <h2 className="mt-4 font-display text-3xl text-foreground">{page.alternativeTitle}</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{page.alternativeCopy}</p>
          </article>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {page.fitItems.map((item) => (
            <div
              key={item}
              className="rounded-[1.25rem] border border-border/80 bg-card/70 px-4 py-4 text-sm text-foreground shadow-panel-soft"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {page.focusSections?.length ? (
        <section className="public-section">
          <div className="grid gap-5 lg:grid-cols-2">
            {page.focusSections.map((section) => (
              <article
                key={section.title}
                className="rounded-[1.8rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft sm:p-6"
              >
                <p className="premium-kicker">{section.label}</p>
                <h2 className="mt-4 font-display text-3xl text-foreground">{section.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted">{section.copy}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {page.relatedLinks?.length ? (
        <section className="public-section-tight">
          <div className="rounded-[1.65rem] border border-border/80 bg-card/62 p-5 shadow-panel-soft">
            <p className="premium-kicker">Related public pages</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-border/80 bg-background/24 px-4 py-3 text-sm text-silver transition-colors hover:border-gold/28 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <HowBcnWorksSection />
      <TrustTrailSection />
      <PrivacyBoundaryNote />
      <FAQSection
        label="Questions"
        title="Clear answers before you step closer"
        description="Short answers for owners comparing BCN with other business networking or private network options."
        items={page.faqItems}
      />
      <TwoPathCta source="intent" />
    </div>
  );
}
