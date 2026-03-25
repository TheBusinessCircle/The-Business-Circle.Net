export type InsightBreakdownItem = {
  title: string;
  description: string;
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
  sourceResourceSlug: string;
  clusterSlug: string;
  clusterTitle: string;
  clusterHref: string;
  isPillar: boolean;
  title: string;
  sourceTitle: string;
  keyword: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: Date;
  readMinutes: number;
  category: string;
  typeLabel: string;
  tierLabel: string;
  sourceExcerpt: string;
  recommendedMembershipHref: string;
  lockedPreviewSections: string[];
};

export type InsightTopicClusterSummary = InsightTopicCluster & {
  href: string;
  articleCount: number;
  pillarInsight: PublicInsightSummary | null;
  supportingInsights: PublicInsightSummary[];
};

export type PublicInsightArticle = PublicInsightSummary & {
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
