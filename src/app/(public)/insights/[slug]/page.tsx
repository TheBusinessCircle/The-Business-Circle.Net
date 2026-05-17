import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Lock, MoveLeft, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { InsightCard, InsightsRoomCta, JsonLd } from "@/components/public";
import { PublicTopVisual } from "@/components/visual-media";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildInsightArticleSchema } from "@/lib/structured-data";
import {
  formatInsightDate,
  getInsightTopicClusterBySlug,
  getPublicInsightBySlug,
  getRelatedPublicInsights
} from "@/server/insights/insight.service";
import { getVisualMediaPlacement } from "@/server/visual-media";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

function createFallbackMetadata(slug: string): Metadata {
  return createPageMetadata({
    title: "Insights",
    description: "Public business insights from The Business Circle Network.",
    path: `/insights/${slug}`,
    noIndex: true
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const insight = getPublicInsightBySlug(slug);

  if (!insight) {
    return createFallbackMetadata(slug);
  }

  const baseMetadata = createPageMetadata({
    title: insight.seoTitle,
    description: insight.seoDescription,
    path: `/insights/${insight.slug}`,
    keywords: [
      insight.keyword,
      insight.category,
      ...insight.relatedIntentKeywords,
      "business owner insights",
      "founder clarity"
    ]
  });

  return {
    ...baseMetadata,
    metadataBase: new URL(SITE_CONFIG.url),
    openGraph: {
      ...baseMetadata.openGraph,
      type: "article",
      publishedTime: insight.publishedAt.toISOString(),
      section: insight.category,
      tags: insight.relatedIntentKeywords
    }
  };
}

export default async function InsightArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const insight = getPublicInsightBySlug(slug);

  if (!insight) {
    notFound();
  }

  const relatedInsights = getRelatedPublicInsights(insight.slug, 3);
  const topicCluster = getInsightTopicClusterBySlug(insight.clusterSlug);
  const insightsHeroPlacement = await getVisualMediaPlacement("intelligence.hero");
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/home" },
    { name: "Insights", path: "/insights" },
    ...(topicCluster ? [{ name: topicCluster.title, path: topicCluster.href }] : []),
    { name: insight.title, path: `/insights/${insight.slug}` }
  ]);
  const articleSchema = buildInsightArticleSchema({
    title: insight.title,
    description: insight.seoDescription,
    path: `/insights/${insight.slug}`,
    publishedAt: insight.publishedAt,
    keywords: [insight.keyword, insight.category, ...insight.relatedIntentKeywords]
  });

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={articleSchema} />

      <div className="public-page-stack">
        <PublicTopVisual
          placement={insightsHeroPlacement}
          eyebrow="Public Insight Preview"
          title={insight.title}
          description={insight.excerpt}
          tone="anchored"
        />

        <div className="space-y-4">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-muted"
          >
            <Link href="/home" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link href="/insights" className="hover:text-foreground">
              Insights
            </Link>
            <span>/</span>
            {topicCluster ? (
              <>
                <Link href={topicCluster.href} className="hover:text-foreground">
                  {topicCluster.title}
                </Link>
                <span>/</span>
              </>
            ) : null}
            <span className="text-foreground">{insight.title}</span>
          </nav>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <MoveLeft size={14} />
            Back to Insights
          </Link>
        </div>

        <section className="public-hero-spacing relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/58 shadow-panel">
          <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted">
              <span className="rounded-full border border-border/70 bg-background/28 px-3 py-1">
                {insight.category}
              </span>
              <span className="rounded-full border border-border/70 bg-background/28 px-3 py-1">
                {insight.typeLabel}
              </span>
              <span className="rounded-full border border-border/70 bg-background/28 px-3 py-1">
                {insight.memberDepthLabel}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-5xl font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
                {insight.title}
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-white/80">
                {insight.excerpt}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.08em] text-silver">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} />
                {formatInsightDate(insight.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} />
                {insight.readingTime} min read
              </span>
              <span>Public preview</span>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="space-y-6">
            <section className="rounded-[1.85rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-6 shadow-gold-soft sm:p-8">
              <p className="premium-kicker">Answer first</p>
              <h2 className="mt-4 font-display text-3xl text-foreground">
                The short answer
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/82 sm:text-lg">
                {insight.aeoSummary}
              </p>
            </section>

            <section className="public-panel space-y-4 p-6 sm:p-8">
              <p className="premium-kicker">Opening note</p>
              <h2 className="font-display text-3xl text-foreground">
                The public signal
              </h2>
              {insight.publicIntro.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </section>

            {insight.publicPreviewSections.map((section) => (
              <section key={section.heading} className="public-panel space-y-4 p-6 sm:p-8">
                <h2 className="font-display text-3xl text-foreground">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <section className="public-panel space-y-5 p-6 sm:p-8">
              <p className="premium-kicker">Public takeaways</p>
              <h2 className="font-display text-3xl text-foreground">
                Three useful points to keep
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                {insight.publicTakeaways.map((takeaway) => (
                  <div
                    key={takeaway}
                    className="rounded-[1.25rem] border border-border/80 bg-background/24 px-4 py-4 text-sm leading-relaxed text-muted"
                  >
                    {takeaway}
                  </div>
                ))}
              </div>
            </section>

            <InsightsRoomCta />

            <section className="relative overflow-hidden rounded-[2rem] border border-gold/28 bg-gradient-to-b from-gold/10 via-card/78 to-card/88 p-6 shadow-panel sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.2),transparent_42%)]" />
              <div className="relative grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                    <Lock size={12} />
                    Member depth
                  </div>
                  <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                    {insight.fadeCtaTitle}
                  </h2>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                    {insight.fadeCtaText}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href={insight.recommendedMembershipHref}>
                      <Button size="lg">
                        {insight.ctaLabel}
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </Link>
                    <Link href="/audit">
                      <Button size="lg" variant="outline">
                        Run The Founder Audit
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-silver/16 bg-background/24 p-4">
                  <p className="premium-kicker">Continues inside</p>
                  <div className="mt-4 space-y-3">
                    {insight.lockedPreviewSections.map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-border/80 bg-card/42 px-4 py-3 text-sm text-silver"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="space-y-2">
                <p className="premium-kicker">Read next</p>
                <h2 className="font-display text-3xl text-foreground">
                  Related public insights
                </h2>
              </div>
              {relatedInsights.length ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {relatedInsights.map((relatedInsight) => (
                    <InsightCard key={relatedInsight.slug} insight={relatedInsight} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  More related public insights will appear as the daily bank publishes.
                </p>
              )}
            </section>
          </article>

          <aside className="space-y-4">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto overscroll-contain pr-1">
              <section className="public-panel p-5">
                <h2 className="inline-flex items-center gap-2 font-display text-2xl text-foreground">
                  <Sparkles size={18} className="text-silver" />
                  Internal routes
                </h2>
                <div className="mt-4 space-y-2">
                  {insight.internalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-xl border border-border/80 bg-background/22 px-3 py-3 text-sm text-muted transition-colors hover:border-silver/24 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="public-panel border-silver/22 bg-gradient-to-br from-silver/10 via-card/72 to-card/68 p-5">
                <p className="premium-kicker">Why this stops here</p>
                <h2 className="mt-4 font-display text-2xl text-foreground">
                  The full resource is member-only.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  This page only sends the public preview to the browser. The full framework,
                  action plan, checklist and implementation guidance live behind authentication
                  and tier access.
                </p>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
