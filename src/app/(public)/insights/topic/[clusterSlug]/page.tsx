import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, MoveLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { InsightCard, JsonLd } from "@/components/public";
import { PublicTopVisual } from "@/components/visual-media";
import { Button } from "@/components/ui/button";
import { INSIGHT_TOPIC_PILLARS } from "@/config/insight-pillars";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema
} from "@/lib/structured-data";
import {
  getInsightTopicClusterBySlug,
  listInsightTopicClusters,
  listInsightTopicClusterSlugs
} from "@/server/insights/insight.service";
import { getVisualMediaPlacement } from "@/server/visual-media";

type PageProps = {
  params: Promise<{ clusterSlug: string }>;
};

export const dynamicParams = false;

function createFallbackMetadata(clusterSlug: string): Metadata {
  return {
    ...createPageMetadata({
      title: "Insights Topic",
      description: "Business insight topic area from The Business Circle.",
      path: `/insights/topic/${clusterSlug}`,
      noIndex: true
    }),
    metadataBase: new URL(SITE_CONFIG.url)
  };
}

export function generateStaticParams() {
  return listInsightTopicClusterSlugs().map((clusterSlug) => ({ clusterSlug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clusterSlug } = await params;
  const cluster = getInsightTopicClusterBySlug(clusterSlug);

  if (!cluster) {
    return createFallbackMetadata(clusterSlug);
  }

  const pillar = INSIGHT_TOPIC_PILLARS[cluster.slug];

  return {
    ...createPageMetadata({
      title: pillar.headline,
      description: cluster.description,
      path: cluster.href
    }),
    metadataBase: new URL(SITE_CONFIG.url)
  };
}

export default async function InsightTopicClusterPage({ params }: PageProps) {
  const { clusterSlug } = await params;
  const cluster = getInsightTopicClusterBySlug(clusterSlug);

  if (!cluster) {
    notFound();
  }

  const pillar = INSIGHT_TOPIC_PILLARS[cluster.slug];
  const insightsHeroPlacement = await getVisualMediaPlacement("intelligence.hero");
  const membershipPath =
    cluster.pillarInsight?.recommendedMembershipHref ?? `/membership?from=${cluster.href}`;
  const relatedClusters = listInsightTopicClusters()
    .filter((item) => item.slug !== cluster.slug)
    .slice(0, 3);
  const clusterInsights = [
    ...(cluster.pillarInsight ? [cluster.pillarInsight] : []),
    ...cluster.supportingInsights
  ];
  const [featuredSupportingInsight, ...remainingSupportingInsights] = clusterInsights;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/home" },
    { name: "Insights", path: "/insights" },
    { name: cluster.title, path: cluster.href }
  ]);
  const collectionPageSchema = buildCollectionPageSchema({
    title: cluster.title,
    description: cluster.description,
    path: cluster.href,
    keywords: [cluster.keyword, cluster.title, "business insights"],
    itemPaths: clusterInsights.map((insight) => `/insights/${insight.slug}`)
  });

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={collectionPageSchema} />

      <div className="space-y-20 pb-28 lg:space-y-28 lg:pb-36">
        <PublicTopVisual
          placement={insightsHeroPlacement}
          eyebrow="Insight Topic"
          title={pillar.headline}
          description={cluster.description}
          tone="anchored"
        />

        <div className="space-y-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Link href="/home" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link href="/insights" className="hover:text-foreground">
              Insights
            </Link>
            <span>/</span>
            <span className="text-foreground">{cluster.title}</span>
          </nav>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <MoveLeft size={14} />
            Back to Insights
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/58 px-6 py-28 shadow-panel sm:px-8 lg:px-10 lg:py-36">
          <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />
          <div className="relative space-y-5">
            <p className="premium-kicker">You&apos;re In The Insights Layer</p>
            <h1 className="max-w-5xl font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
              {pillar.headline}
            </h1>
            {pillar.introduction.map((paragraph) => (
              <p key={paragraph} className="max-w-3xl text-lg leading-relaxed text-white/80">
                {paragraph}
              </p>
            ))}
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-silver">
              <span>Topic guide</span>
              <span>{cluster.articleCount} related article{cluster.articleCount === 1 ? "" : "s"}</span>
              <span>Topic focus: {cluster.keyword}</span>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          {pillar.sections.map((section) => {
            const supportingArticles = clusterInsights.filter((insight) =>
              section.supportingArticleSlugs.includes(insight.slug)
            );

            return (
              <article key={section.title} className="public-panel space-y-5 p-6 sm:p-8">
                <div className="space-y-3">
                  <p className="premium-kicker">{section.description}</p>
                  <h2 className="font-display text-3xl text-foreground">{section.title}</h2>
                </div>
                <div className="space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-base leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {supportingArticles.length ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {supportingArticles.map((insight) => (
                      <Link
                        key={insight.slug}
                        href={`/insights/${insight.slug}`}
                        className="rounded-[1.5rem] border border-border/80 bg-background/22 px-5 py-4 transition-colors hover:border-silver/22 hover:bg-background/30"
                      >
                        <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Related article</p>
                        <p className="mt-2 text-base font-medium text-foreground">{insight.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{insight.summary}</p>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {featuredSupportingInsight ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <p className="premium-kicker">Most relevant right now</p>
              <h2 className="font-display text-3xl text-foreground">Build this topic more fully</h2>
            </div>
            <InsightCard insight={featuredSupportingInsight} featured />
            {remainingSupportingInsights.length ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {remainingSupportingInsights.map((insight) => (
                  <InsightCard key={insight.slug} insight={insight} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {relatedClusters.length ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <p className="premium-kicker">Browse related topics</p>
              <h2 className="font-display text-3xl text-foreground">Keep exploring connected business growth topics</h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted">
                Strong topic coverage works better when connected problems are easy to continue
                into, not left as isolated articles.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {relatedClusters.map((relatedCluster) => (
                <Link
                  key={relatedCluster.slug}
                  href={relatedCluster.href}
                  className="rounded-[1.75rem] border border-border/80 bg-card/62 p-5 transition-colors hover:border-silver/24 hover:bg-card/72"
                >
                  <p className="premium-kicker">{relatedCluster.keyword}</p>
                  <h3 className="mt-4 font-display text-2xl text-foreground">{relatedCluster.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{relatedCluster.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="public-panel border-silver/22 bg-gradient-to-br from-silver/10 via-card/72 to-card/68 p-6">
          <p className="premium-kicker">Continue The Topic</p>
          <h2 className="mt-4 font-display text-3xl text-foreground">
            Continue the conversation inside The Business Circle
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Public topic guides help you understand the landscape. Membership is where owners can
            discuss the real decisions, compare context, and keep the next move connected to the
            wider environment.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={membershipPath}>
              <Button>
                Join The Business Circle
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
            <Link href="/membership">
              <Button variant="outline">
                <Compass size={14} className="mr-2" />
                View Membership Options
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
