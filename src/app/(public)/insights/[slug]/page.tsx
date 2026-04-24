import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Compass, Lock, MoveLeft, NotebookTabs } from "lucide-react";
import { notFound } from "next/navigation";
import { InsightCard, JsonLd } from "@/components/public";
import { PublicTopVisual } from "@/components/visual-media";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildInsightArticleSchema } from "@/lib/structured-data";
import {
  formatInsightDate,
  getInsightTopicClusterBySlug,
  getPublicInsightBySlug,
  getRelatedPublicInsights,
  listPublicInsightSlugs
} from "@/server/insights/insight.service";
import { getVisualMediaPlacement } from "@/server/visual-media";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const lockedPreviewWidths = ["w-11/12", "w-4/5", "w-10/12"] as const;

export const dynamicParams = false;

function createFallbackMetadata(slug: string): Metadata {
  return createPageMetadata({
    title: "Insights",
    description: "Public business insights from The Business Circle.",
    path: `/insights/${slug}`,
    noIndex: true
  });
}

export function generateStaticParams() {
  return listPublicInsightSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const insight = getPublicInsightBySlug(slug);

  if (!insight) {
    return createFallbackMetadata(slug);
  }

  const baseMetadata = createPageMetadata({
    title: insight.metaTitle,
    description: insight.metaDescription,
    path: `/insights/${insight.slug}`
  });

  return {
    ...baseMetadata,
    metadataBase: new URL(SITE_CONFIG.url),
    keywords: [
      insight.keyword,
      insight.category,
      insight.typeLabel,
      "business insights",
      "business strategy"
    ],
    openGraph: {
      ...baseMetadata.openGraph,
      type: "article",
      publishedTime: insight.publishedAt.toISOString(),
      section: insight.category,
      tags: [insight.keyword, insight.typeLabel, insight.tierLabel]
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
  const topicInsights = topicCluster
    ? [
        ...(topicCluster.pillarInsight ? [topicCluster.pillarInsight] : []),
        ...topicCluster.supportingInsights
      ].filter((item) => item.slug !== insight.slug)
    : [];
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
    ...(topicCluster ? [{ name: topicCluster.title, path: topicCluster.href }] : []),
    { name: insight.title, path: `/insights/${insight.slug}` }
  ]);
  const articleSchema = buildInsightArticleSchema({
    title: insight.title,
    description: insight.metaDescription,
    path: `/insights/${insight.slug}`,
    publishedAt: insight.publishedAt,
    keywords: [insight.keyword, insight.category, insight.typeLabel]
  });

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={articleSchema} />

      <div className="space-y-10 pb-14 lg:space-y-12 lg:pb-16">
        <PublicTopVisual
          placement={insightsHeroPlacement}
          eyebrow="Insight Article"
          title={insight.title}
          description={insight.summary}
          tone="anchored"
          fallbackLabel="Insights top visual"
        />

        <div className="space-y-4">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-muted"
          >
            <Link href="/" className="hover:text-foreground">
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

        <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/58 p-8 shadow-panel sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
          <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-gold/18 blur-[110px]" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted">
              <span className="rounded-full border border-border/70 bg-background/28 px-3 py-1">
                Insights
              </span>
              <span className="rounded-full border border-border/70 bg-background/28 px-3 py-1">
                {insight.category}
              </span>
              <span className="rounded-full border border-border/70 bg-background/28 px-3 py-1">
                {insight.typeLabel}
              </span>
              <span className="rounded-full border border-border/70 bg-background/28 px-3 py-1">
                {insight.tierLabel} depth inside membership
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-5xl font-display text-4xl leading-tight text-foreground sm:text-5xl">
                {insight.title}
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-muted">
                {insight.summary}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.08em] text-silver">
              <span>{formatInsightDate(insight.publishedAt)}</span>
              <span>{insight.readMinutes} min read</span>
              <span>Topic focus: {insight.keyword}</span>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="space-y-6">
            <section
              id="introduction"
              className="public-panel scroll-mt-28 space-y-4 p-6 sm:p-8"
            >
              <h2 className="font-display text-3xl text-foreground">Introduction</h2>
              {insight.introduction.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </section>

            <section id="problem" className="public-panel scroll-mt-28 space-y-4 p-6 sm:p-8">
              <h2 className="font-display text-3xl text-foreground">{insight.problemTitle}</h2>
              {insight.problem.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </section>

            <section id="key-insight" className="public-panel scroll-mt-28 space-y-4 p-6 sm:p-8">
              <h2 className="font-display text-3xl text-foreground">{insight.keyInsightTitle}</h2>
              {insight.keyInsight.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </section>

            <section id="breakdown" className="public-panel scroll-mt-28 space-y-6 p-6 sm:p-8">
              <h2 className="font-display text-3xl text-foreground">{insight.breakdownTitle}</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {insight.breakdownItems.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[1.75rem] border border-border/80 bg-background/22 p-5"
                  >
                    <h3 className="font-display text-2xl text-foreground">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="inside-circle"
              className="relative scroll-mt-28 overflow-hidden rounded-[2rem] border border-gold/28 bg-gradient-to-b from-gold/8 via-card/76 to-card/84 p-6 pb-80 shadow-panel sm:p-8 sm:pb-72"
            >
              <div className="space-y-4 select-none blur-[3px] opacity-70">
                {insight.lockedPreviewSections.map((heading) => (
                  <div
                    key={heading}
                    className="rounded-[1.75rem] border border-border/80 bg-background/24 p-5"
                  >
                    <p className="premium-kicker">{heading}</p>
                    <div className="mt-4 space-y-2">
                      {lockedPreviewWidths.map((widthClassName) => (
                        <div
                          key={`${heading}-${widthClassName}`}
                          className={`h-3 rounded-full bg-background/60 ${widthClassName}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
                <div className="rounded-[1.75rem] border border-gold/30 bg-background/94 p-6 shadow-panel backdrop-blur">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                    <Lock size={12} />
                    Membership depth
                  </div>
                  <h2 className="mt-4 font-display text-3xl text-foreground">
                    This is just the surface layer
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                    {insight.lockedDescription} Full frameworks are available inside membership.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {insight.lockedBullets.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border/80 bg-background/22 px-4 py-3 text-sm text-muted"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={insight.recommendedMembershipHref}>
                      <Button size="lg">Go Deeper Inside Membership</Button>
                    </Link>
                    <Link href="/membership">
                      <Button size="lg" variant="outline">
                        View Membership
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section id="inside-topic" className="space-y-6 scroll-mt-28">
              <div className="space-y-2">
                <p className="premium-kicker">Inside This Topic</p>
                <h2 className="font-display text-3xl text-foreground">
                  Keep building the subject properly
                </h2>
                <p className="max-w-3xl text-sm leading-relaxed text-muted">
                  Use the topic page for the wider authority view, then move into membership when you want the deeper structure and execution layer.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Link
                  href={topicCluster?.href ?? "/insights"}
                  className="rounded-[1.75rem] border border-silver/18 bg-card/62 p-5 transition-colors hover:border-silver/30 hover:bg-card/72"
                >
                  <p className="premium-kicker">Topic cluster</p>
                  <h3 className="mt-4 font-display text-2xl text-foreground">
                    {topicCluster ? `Open the full ${topicCluster.title} topic guide` : "Browse topic guides"}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    See the wider problem, the supporting angles, and the structured links around this topic.
                  </p>
                </Link>
                <Link
                  href={insight.recommendedMembershipHref}
                  className="rounded-[1.75rem] border border-gold/24 bg-gradient-to-br from-gold/8 via-card/72 to-card/68 p-5 transition-colors hover:border-gold/34"
                >
                  <p className="premium-kicker">Go deeper inside membership</p>
                  <h3 className="mt-4 font-display text-2xl text-foreground">
                    Full frameworks available inside
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Public insight creates understanding. The member library adds the fuller frameworks, review questions, and practical execution depth.
                  </p>
                </Link>
              </div>

              {topicInsights.length ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {topicInsights.slice(0, 3).map((topicInsight) => (
                    <InsightCard key={topicInsight.slug} insight={topicInsight} />
                  ))}
                </div>
              ) : null}
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <p className="premium-kicker">Read Next</p>
                  <h2 className="font-display text-3xl text-foreground">More insights worth your time</h2>
                </div>
                <Link
                  href="/insights"
                  className="hidden text-sm text-muted transition-colors hover:text-foreground md:inline-flex"
                >
                  Browse all insights
                </Link>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {relatedInsights.map((relatedInsight) => (
                  <InsightCard key={relatedInsight.slug} insight={relatedInsight} />
                ))}
              </div>
            </section>
          </article>

          <aside className="space-y-4">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto overscroll-contain pr-1">
              <section className="public-panel p-5">
                <p className="premium-kicker">Inside This Insight</p>
                <div className="mt-4 space-y-2">
                  {[ 
                    { href: "#introduction", label: "Introduction" },
                    { href: "#problem", label: insight.problemTitle },
                    { href: "#key-insight", label: insight.keyInsightTitle },
                    { href: "#breakdown", label: insight.breakdownTitle },
                    { href: "#inside-circle", label: "Go deeper inside membership" },
                    { href: "#inside-topic", label: "Inside This Topic" }
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block rounded-xl border border-border/80 bg-background/22 px-3 py-3 text-sm text-muted transition-colors hover:border-silver/24 hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </section>

              <section className="public-panel border-silver/22 bg-gradient-to-br from-silver/10 via-card/72 to-card/68 p-5">
                <p className="premium-kicker">Best place to continue</p>
                <h2 className="mt-4 font-display text-2xl text-foreground">
                  Free insight first. Membership depth next.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  This article gives the thinking. Membership gives the fuller framework, the execution layer, and the more structured next step.
                </p>
                <div className="mt-4 rounded-2xl border border-border/80 bg-background/22 px-4 py-3 text-sm text-muted">
                  Source depth: {insight.tierLabel}
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted">
                  <Link
                    href={insight.recommendedMembershipHref}
                    className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <BookOpen size={15} />
                    Go deeper inside membership
                  </Link>
                  <Link
                    href={topicCluster?.href ?? "/insights"}
                    className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <Compass size={15} />
                    {topicCluster ? `Explore the ${topicCluster.title} topic` : "Browse topic guides"}
                  </Link>
                  <Link
                    href="/founder"
                    className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <BookOpen size={15} />
                    Meet the founder behind the platform
                  </Link>
                </div>
              </section>

              {topicCluster ? (
                <section className="public-panel p-5">
                  <p className="premium-kicker">Topic Cluster</p>
                  <h2 className="mt-4 font-display text-2xl text-foreground">{topicCluster.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {topicCluster.description}
                  </p>
                  <Link
                    href={topicCluster.href}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
                  >
                    Open this topic cluster
                    <Compass size={14} />
                  </Link>
                </section>
              ) : null}

              <section className="public-panel p-5">
                <h2 className="inline-flex items-center gap-2 font-display text-2xl text-foreground">
                  <NotebookTabs size={18} className="text-silver" />
                  Source Context
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  This public insight is adapted from a deeper member resource inside the Business Circle library. The public version focuses on understanding. The member version goes further into structure and execution.
                </p>
                <p className="mt-4 text-sm text-muted">{insight.sourceExcerpt}</p>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
