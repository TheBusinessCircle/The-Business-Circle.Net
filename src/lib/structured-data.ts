import { TREV_FOUNDER_CONTENT } from "@/config/founder";
import { SITE_CONFIG } from "@/config/site";
import { absoluteUrl, nonEmpty } from "@/lib/utils";

type FaqSchemaItem = {
  question: string;
  answer: string;
};

type PublicSiteSchemaInput = {
  supportEmail?: string;
};

type BreadcrumbSchemaItem = {
  name: string;
  path: string;
};

type InsightArticleSchemaInput = {
  title: string;
  description: string;
  path: string;
  publishedAt: Date;
  keywords?: string[];
};

type CollectionPageSchemaInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  itemPaths?: string[];
};

export function buildPublicSiteSchemaGraph(input: PublicSiteSchemaInput = {}) {
  const sameAs = Object.values(SITE_CONFIG.social).filter(nonEmpty);
  const supportEmail = input.supportEmail ?? SITE_CONFIG.supportEmail;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
        description: SITE_CONFIG.description,
        email: supportEmail,
        sameAs,
        founder: {
          "@type": "Person",
          name: TREV_FOUNDER_CONTENT.name,
          alternateName: TREV_FOUNDER_CONTENT.alternateName,
          jobTitle: "Business Growth Architect",
          url: absoluteUrl("/founder")
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: supportEmail,
            url: absoluteUrl("/contact")
          }
        ]
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
        description: SITE_CONFIG.description,
        publisher: {
          "@id": absoluteUrl("/#organization")
        }
      }
    ]
  };
}

export function buildFaqSchema(items: FaqSchemaItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function buildFounderSchema() {
  const sameAs = Object.values(SITE_CONFIG.social).filter(nonEmpty);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: TREV_FOUNDER_CONTENT.name,
    alternateName: TREV_FOUNDER_CONTENT.alternateName,
    jobTitle: "Business Growth Architect",
    url: absoluteUrl("/founder"),
    description: TREV_FOUNDER_CONTENT.title,
    sameAs,
    worksFor: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url
    }
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbSchemaItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function buildInsightArticleSchema(input: InsightArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.publishedAt.toISOString(),
    dateModified: input.publishedAt.toISOString(),
    inLanguage: "en-GB",
    keywords: input.keywords,
    author: {
      "@type": "Person",
      name: TREV_FOUNDER_CONTENT.name,
      url: absoluteUrl("/founder")
    },
    publisher: {
      "@id": absoluteUrl("/#organization")
    },
    isPartOf: {
      "@id": absoluteUrl("/#website")
    }
  };
}

export function buildCollectionPageSchema(input: CollectionPageSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    inLanguage: "en-GB",
    keywords: input.keywords,
    hasPart: input.itemPaths?.map((path) => ({
      "@type": "WebPage",
      url: absoluteUrl(path)
    })),
    isPartOf: {
      "@id": absoluteUrl("/#website")
    }
  };
}
