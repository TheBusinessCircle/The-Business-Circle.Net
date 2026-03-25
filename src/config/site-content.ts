import { z } from "zod";
import { SITE_CONFIG } from "@/config/site";

const faqItemSchema = z.object({
  question: z.string().trim().min(10).max(160),
  answer: z.string().trim().min(24).max(520)
});

const proofItemSchema = z.object({
  eyebrow: z.string().trim().min(4).max(48),
  title: z.string().trim().min(10).max(120),
  description: z.string().trim().min(24).max(320)
});

const membershipNarrativeSchema = z.object({
  whoItsFor: z.string().trim().min(24).max(320),
  outcomes: z.string().trim().min(24).max(320),
  whyChoose: z.string().trim().min(24).max(320)
});

export const HOME_PROOF_ITEM_COUNT = 3;
export const HOME_FAQ_COUNT = 6;
export const MEMBERSHIP_FAQ_COUNT = 5;

export const siteContentSchemas = {
  home: z.object({
    heroSupportLine: z.string().trim().min(12).max(180),
    heroTitle: z.string().trim().min(10).max(180),
    heroSubtitle: z.string().trim().min(24).max(480),
    whyTitle: z.string().trim().min(10).max(140),
    whyDescription: z.string().trim().min(24).max(480),
    vibeTitle: z.string().trim().min(10).max(140),
    vibeDescription: z.string().trim().min(24).max(420),
    audienceTitle: z.string().trim().min(10).max(140),
    audienceDescription: z.string().trim().min(24).max(360),
    benefitsTitle: z.string().trim().min(10).max(140),
    benefitsDescription: z.string().trim().min(24).max(360),
    differenceTitle: z.string().trim().min(10).max(140),
    differenceDescription: z.string().trim().min(24).max(420),
    proofTitle: z.string().trim().min(10).max(140),
    proofDescription: z.string().trim().min(24).max(360),
    proofItems: z.array(proofItemSchema).length(HOME_PROOF_ITEM_COUNT),
    faqTitle: z.string().trim().min(10).max(140),
    faqDescription: z.string().trim().min(24).max(360),
    faqs: z.array(faqItemSchema).length(HOME_FAQ_COUNT),
    ctaTitle: z.string().trim().min(10).max(180),
    ctaDescription: z.string().trim().min(24).max(360)
  }),
  about: z.object({
    intro: z.string().trim().min(24).max(420)
  }),
  membership: z.object({
    intro: z.string().trim().min(24).max(420),
    standardCopy: z.string().trim().min(24).max(320),
    innerCircleCopy: z.string().trim().min(24).max(320),
    standard: membershipNarrativeSchema,
    innerCircle: membershipNarrativeSchema,
    comparisonTitle: z.string().trim().min(10).max(140),
    comparisonDescription: z.string().trim().min(24).max(360),
    faqTitle: z.string().trim().min(10).max(140),
    faqDescription: z.string().trim().min(24).max(360),
    faqs: z.array(faqItemSchema).length(MEMBERSHIP_FAQ_COUNT),
    ctaTitle: z.string().trim().min(10).max(180),
    ctaDescription: z.string().trim().min(24).max(360)
  }),
  footer: z.object({
    brandBlurb: z.string().trim().min(24).max(320),
    supportEmail: z.string().trim().email().max(160),
    supportLine: z.string().trim().min(8).max(160),
    trustLine: z.string().trim().min(12).max(220),
    founderLine: z.string().trim().min(12).max(220),
    bottomLine: z.string().trim().min(12).max(220)
  })
} as const;

export type SiteContentSlug = keyof typeof siteContentSchemas;

type SiteContentSchemaMap = typeof siteContentSchemas;

export type SiteContentValueMap = {
  [K in SiteContentSlug]: z.infer<SiteContentSchemaMap[K]>;
};

export const SITE_CONTENT_TITLES: Record<SiteContentSlug, string> = {
  home: "Homepage Content",
  about: "About Page Content",
  membership: "Membership Page Content",
  footer: "Footer Content"
};

export const siteContentDefaults: SiteContentValueMap = {
  home: {
    heroSupportLine: "Founder-led membership. Calm structure. Clearer business growth for founders who want a better room around the business.",
    heroTitle: "A private business environment where founders can think clearly, feel they belong, and grow with more certainty",
    heroSubtitle:
      "The Business Circle Network is a live, structured environment for business owners who want stronger context, better people around them, and a calmer route to momentum. If you have outgrown noisy founder spaces, you are in the right place here.",
    whyTitle: "Why The Business Circle Network exists",
    whyDescription:
      "Too many businesses are trying to grow inside fragmented advice, shallow networking, and noisy communities. The Business Circle Network was created to bring structure, trust, founder-led thinking, and better business relationships into one serious environment.",
    vibeTitle: "The network is shaped by a clear strategic lens",
    vibeDescription:
      "Trev's work focuses on how businesses are seen, how they are trusted, and how they expand with more intention.",
    audienceTitle: "Who The Network is built for",
    audienceDescription:
      "This ecosystem is designed for growth-ready businesses that want sharper thinking, better relationships, and a stronger environment around their next phase.",
    benefitsTitle: "What members actually get",
    benefitsDescription:
      "Membership is not just access to a community. It is access to a better business environment built around practical support, trusted people, and meaningful growth tools.",
    differenceTitle: "More than networking. More than content. More than community.",
    differenceDescription:
      "The Business Circle Network combines founder-led direction, curated relationships, practical resources, and clear progression in one working environment.",
    proofTitle: "Proof, wins, and member outcomes",
    proofDescription:
      "This section is designed for verified testimonials, founder results, collaboration stories, and member wins managed through the admin content system.",
    proofItems: [
      {
        eyebrow: "Ready for real proof",
        title: "Member wins and business milestones",
        description:
          "Use this space for approved growth stories, traction updates, client wins, and practical breakthroughs from inside the network."
      },
      {
        eyebrow: "Ready for real proof",
        title: "Collaboration stories that created momentum",
        description:
          "Feature trusted introductions, partnerships, referrals, and aligned collaborations that started through The Business Circle Network."
      },
      {
        eyebrow: "Ready for real proof",
        title: "Founder outcomes worth sharing",
        description:
          "Highlight how members gained clarity, stronger positioning, better trust signals, or faster execution through the ecosystem."
      }
    ],
    faqTitle: "Questions founders usually ask before joining",
    faqDescription:
      "Straight answers about fit, membership, collaboration, Inner Circle, and how the network works.",
    faqs: [
      {
        question: "Who is The Business Circle Network for?",
        answer:
          "It is built for founders, business owners, startups, local businesses, service-led firms, community-led businesses, and established companies that want better strategy, stronger trust, and more useful growth relationships."
      },
      {
        question: "Is this just another networking group?",
        answer:
          "No. Networking is part of the value, but the network is designed as a broader growth ecosystem with strategy, resources, accountability, community, collaboration opportunities, and founder-led direction."
      },
      {
        question: "Can members collaborate with each other?",
        answer:
          "Yes. Collaboration is a core part of the experience. Members can build partnerships, referrals, introductions, support exchanges, and aligned opportunities through the directory, community, and events."
      },
      {
        question: "Is it only for online businesses?",
        answer:
          "No. The network is intentionally broader than that. It supports local businesses, founder-led companies, service providers, startups, and established businesses that want stronger visibility, trust, and expansion."
      },
      {
        question: "What makes Inner Circle different?",
        answer:
          "Inner Circle adds private strategic access, deeper founder-level conversation, premium resources, and a more focused environment for businesses that want more depth and proximity."
      },
      {
        question: "Can I start at one level and move up later?",
        answer:
          "Yes. Many members begin with Foundation to access the core ecosystem, then move into Inner Circle or Core when they want more strategic depth and closer access."
      }
    ],
    ctaTitle: "Join a business network built for clearer thinking and stronger momentum",
    ctaDescription:
      "Enter at the level that fits your stage and build inside a more trusted, structured environment."
  },
  about: {
    intro:
      "The Business Circle Network exists to help business owners grow through practical strategy, better relationships, stronger trust, and consistent execution."
  },
  membership: {
    intro:
      "Choose the level that fits your current stage. Foundation gives you the structure. Inner Circle adds focus. Core adds the closest strategic layer. The aim is to choose the right room now, not the deepest room by default.",
    standardCopy:
      "Foundation is for business owners who want the full network, practical resources, and a better room around the next phase without overcomplicating the decision.",
    innerCircleCopy:
      "Inner Circle is for founders who want stronger signal, more private context, and a more focused environment than Foundation alone. It is the smartest next step when Foundation is already useful.",
    standard: {
      whoItsFor:
        "Best for businesses that want structure, community, visibility, and practical growth support without overcomplicating the journey.",
      outcomes:
        "Build sharper foundations through resources, relationships, events, and everyday collaboration inside the wider ecosystem.",
      whyChoose:
        "Choose Foundation when you want the full core environment, strong value, and an easy place to start with room to upgrade later."
    },
    innerCircle: {
      whoItsFor:
        "Best for founders and operators who want deeper strategic conversation, private access, and a more focused growth environment.",
      outcomes:
        "Gain premium support through private channels, advanced resources, exclusive sessions, and higher-trust founder proximity.",
      whyChoose:
        "Businesses move into Inner Circle when they want more focus, more private depth, and more useful context around what comes next. It should feel like a natural progression, not a leap."
    },
    comparisonTitle: "Compare the depth, not just the features",
    comparisonDescription:
      "Both plans connect you to the ecosystem. Inner Circle adds private strategic depth for businesses that want a more premium layer of access and support.",
    faqTitle: "Membership questions, answered clearly",
    faqDescription:
      "Everything you need to understand plan fit, flexibility, collaboration, and future upgrades.",
    faqs: [
      {
        question: "How do I know which membership level is right for me?",
        answer:
          "Foundation is the right starting point if you want the full core network and a strong business environment. Inner Circle is for businesses that want deeper strategic access, and Core is for businesses that want the highest level of proximity and discussion depth."
      },
      {
        question: "Can I move up later?",
        answer:
          "Yes. You can start with Foundation, build inside the ecosystem, and move into Inner Circle or Core later when you want more strategic depth and private access."
      },
      {
        question: "Do both plans include collaboration opportunities?",
        answer:
          "Yes. Both tiers include access to collaboration pathways across the network. Inner Circle adds more private and premium strategic spaces on top."
      },
      {
        question: "Is Inner Circle only for large or established businesses?",
        answer:
          "No. Inner Circle is about the depth of support you want, not just size. It suits founders and operators who value more focused conversation, private access, and premium strategic guidance."
      },
      {
        question: "What gives the membership long-term value?",
        answer:
          "The value comes from being inside a stronger environment over time: better decisions, stronger trust, better people around you, structured resources, and access that can deepen as the business grows."
      }
    ],
    ctaTitle: "Choose the membership depth that matches your next phase",
    ctaDescription:
      "Start with the level that fits your stage today and move deeper when your business needs more strategic access."
  },
  footer: {
    brandBlurb:
      "A founder-led business growth ecosystem where ambitious businesses build with better strategy, stronger trust, curated relationships, and more useful momentum.",
    supportEmail: SITE_CONFIG.supportEmail,
    supportLine: "Support, partnerships, member success, and founder enquiries",
    trustLine: "Private membership. Founder-led standards. Structured growth support.",
    founderLine: "Led by Trev Newton, Business Growth Architect.",
    bottomLine:
      "Built for founders, business owners, startups, local businesses, and established brands."
  }
};

export const SITE_CONTENT_SLUGS = Object.keys(siteContentSchemas) as SiteContentSlug[];

export function isSiteContentSlug(value: string): value is SiteContentSlug {
  return SITE_CONTENT_SLUGS.includes(value as SiteContentSlug);
}

export const SITE_CONTENT_REVALIDATION_PATHS: Record<SiteContentSlug, string[]> = {
  home: ["/", "/join"],
  about: ["/about"],
  membership: ["/", "/membership", "/join"],
  footer: [
    "/",
    "/about",
    "/membership",
    "/join",
    "/contact",
    "/founder",
    "/privacy-policy",
    "/terms-of-service",
    "/cookie-policy"
  ]
};
