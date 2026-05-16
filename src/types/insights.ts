export type InsightBreakdownItem = {
  title: string;
  description: string;
};

export type PublicInsightPreviewSection = {
  heading: string;
  body: string[];
};

export type PublicInsightInternalLink = {
  label: string;
  href: string;
};

export type PublicInsightSeed = {
  slug: string;
  sourceResourceSlug: string;
  clusterSlug: string;
  isPillar?: boolean;
  title: string;
  keyword: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  readMinutes: number;
  introduction: string[];
  problemTitle: string;
  problem: string[];
  keyInsightTitle: string;
  keyInsight: string[];
  breakdownTitle: string;
  breakdownItems: InsightBreakdownItem[];
  lockedTitle: string;
  lockedDescription: string;
  lockedBullets: string[];
  relatedSlugs: string[];
};

export type InsightTopicCluster = {
  slug: string;
  title: string;
  description: string;
  supportLine: string;
  keyword: string;
};

export type PublicInsightSummary = {
  slug: string;
  memberResourceSlug: string;
  clusterSlug: string;
  clusterTitle: string;
  clusterHref: string;
  isPillar: boolean;
  title: string;
  excerpt: string;
  keyword: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: Date;
  publishedAtDate: string;
  readingTime: number;
  category: string;
  typeLabel: string;
  tierLabel: string;
  memberDepthLabel: string;
  recommendedMembershipHref: string;
  lockedPreviewSections: string[];
  relatedIntentKeywords: string[];
};

export type InsightTopicClusterSummary = InsightTopicCluster & {
  href: string;
  articleCount: number;
  pillarInsight: PublicInsightSummary | null;
  supportingInsights: PublicInsightSummary[];
};

export type PublicInsightArticle = PublicInsightSummary & {
  aeoSummary: string;
  publicIntro: string[];
  publicPreviewSections: PublicInsightPreviewSection[];
  publicTakeaways: string[];
  fadeCtaTitle: string;
  fadeCtaText: string;
  ctaLabel: string;
  ctaHref: string;
  internalLinks: PublicInsightInternalLink[];
  relatedInsightSlugs: string[];
};
