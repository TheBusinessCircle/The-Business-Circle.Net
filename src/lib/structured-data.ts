import { TREV_FOUNDER_CONTENT } from "@/config/founder";
import { COMPANY_CONFIG } from "@/config/company";
import type { MembershipTier } from "@prisma/client";
import { getMembershipTierDefinition } from "@/config/membership";
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

type WebPageSchemaInput = {
  title: string;
  description: string;
  path: string;
  primaryQuestion?: string;
  primaryAnswer?: string;
};

type MembershipProductTierSchemaInput = {
  tier: MembershipTier;
  monthlyPrice: number;
  annualPrice: number;
  foundingAvailable: boolean;
};

type MembershipProductsSchemaInput = {
  tiers: MembershipProductTierSchemaInput[];
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
        legalName: COMPANY_CONFIG.legalName,
        url: SITE_CONFIG.url,
        description: SITE_CONFIG.description,
        email: supportEmail,
        sameAs,
        areaServed: {
          "@type": "Country",
          name: "United Kingdom"
        },
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

export function buildWebPageSchema(input: WebPageSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    inLanguage: "en-GB",
    isPartOf: {
      "@id": absoluteUrl("/#website")
    },
    publisher: {
      "@id": absoluteUrl("/#organization")
    },
    mainEntity: input.primaryQuestion
      ? {
          "@type": "Question",
          name: input.primaryQuestion,
          acceptedAnswer: {
            "@type": "Answer",
            text: input.primaryAnswer
          }
        }
      : undefined
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

export function buildMembershipProductsSchema(input: MembershipProductsSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@graph": input.tiers.map((item) => {
      const definition = getMembershipTierDefinition(item.tier);
      const tierPath = `/membership?tier=${definition.slug}`;
      const availability = item.foundingAvailable
        ? "https://schema.org/LimitedAvailability"
        : "https://schema.org/InStock";

      return {
        "@type": "Product",
        "@id": absoluteUrl(`${tierPath}#product`),
        name: `${SITE_CONFIG.name} ${definition.name} membership`,
        description: definition.content.description,
        category: "Membership",
        brand: {
          "@id": absoluteUrl("/#organization")
        },
        url: absoluteUrl(tierPath),
        offers: [
          {
            "@type": "Offer",
            name: `${definition.name} monthly membership`,
            url: absoluteUrl(`${tierPath}&period=monthly`),
            price: item.monthlyPrice,
            priceCurrency: "GBP",
            availability,
            seller: {
              "@id": absoluteUrl("/#organization")
            }
          },
          {
            "@type": "Offer",
            name: `${definition.name} annual membership`,
            url: absoluteUrl(`${tierPath}&period=annual`),
            price: item.annualPrice,
            priceCurrency: "GBP",
            availability,
            seller: {
              "@id": absoluteUrl("/#organization")
            }
          }
        ]
      };
    })
  };
}
