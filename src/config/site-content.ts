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
    heroSupportLine: "Founder-led membership. Calm structure. A better room for business owners building with intent.",
    heroTitle: "A private business environment where owners can think clearly, place themselves properly, and move with more certainty",
    heroSubtitle:
      "The Business Circle Network is a structured private business environment for business owners who want stronger context, better people around them, and a calmer route to momentum. If you have outgrown noisy founder spaces, you are in the right place here.",
    whyTitle: "Why The Business Circle Network exists",
    whyDescription:
      "Too many businesses are trying to grow inside fragmented advice, shallow networking, and noisy spaces. The Business Circle Network was created to bring structure, trust, founder-led thinking, and better business relationships into one serious environment.",
    vibeTitle: "The environment is shaped by a clear strategic lens",
    vibeDescription:
      "Trev's work focuses on how businesses are seen, how they are trusted, and how they expand with more intention.",
    audienceTitle: "Who the environment is built for",
    audienceDescription:
      "This is for business owners building with intent who want sharper thinking, better relationships, and a stronger environment around the next phase.",
    benefitsTitle: "What members actually get",
    benefitsDescription:
      "Membership is not just access to another member area. It is entry into a better business environment built around practical support, trusted people, and meaningful growth tools.",
    differenceTitle: "More than networking. More than content. More than activity.",
    differenceDescription:
      "The Business Circle Network combines founder-led direction, curated relationships, practical resources, and clear progression inside one working environment.",
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
      "Short answers about fit, rooms, pricing, collaboration, and what happens after joining.",
    faqs: [
      {
        question: "Who is The Business Circle Network for?",
        answer:
          "It is built for business owners building with intent who want a calmer, more structured environment around growth, decisions, and relationships."
      },
      {
        question: "Is this just another networking group?",
        answer:
          "No. The point is not broad access or constant activity. It is a private business environment with clearer placement, better conversation, and more useful progression over time."
      },
      {
        question: "Can members collaborate with each other?",
        answer:
          "Yes. Collaboration happens through the environment when fit, trust, and context are clear. That can include introductions, referrals, partnerships, and commercially useful conversations."
      },
      {
        question: "Is it only for online businesses?",
        answer:
          "No. It suits business owners across service, local, online, and established businesses, provided they want a more structured room around the work."
      },
      {
        question: "What makes Inner Circle different?",
        answer:
          "Inner Circle is a tighter room with stronger context, deeper discussion, and more selective access for businesses that need more depth than Foundation."
      },
      {
        question: "Can I start at one level and move up later?",
        answer:
          "Yes. Many members start in Foundation, then move into Inner Circle or Core when the business needs a tighter room, stronger proximity, or more protected discussion."
      }
    ],
    ctaTitle: "Enter a private business environment built for clearer thinking and stronger momentum",
    ctaDescription:
      "Enter at the level that fits your stage and build inside a more trusted, structured environment."
  },
  about: {
    intro:
      "The Business Circle Network exists to give business owners building with intent a calmer, more useful private business environment for clearer strategy, stronger relationships, better trust, and more consistent momentum."
  },
  membership: {
    intro:
      "Choose the room that fits the business now. Foundation gives you the base environment. Inner Circle tightens the room. Core protects the highest-context layer. The aim is the right fit now, not the deepest tier by default.",
    standardCopy:
      "Foundation is for business owners who want the full base environment, practical resources, and a better room around the next phase without overcomplicating the decision.",
    innerCircleCopy:
      "Inner Circle is for owners who want stronger signal, more protected context, and a tighter environment than Foundation alone. It is the natural next step when Foundation is already useful.",
    standard: {
      whoItsFor:
        "Best for businesses that want structure, visibility, and practical support without overcomplicating the journey.",
      outcomes:
        "Build sharper foundations through resources, relationships, events, and structured interaction inside the wider environment.",
      whyChoose:
        "Choose Foundation when you want the full base environment, strong value, and a clear place to start with room to move deeper later."
    },
    innerCircle: {
      whoItsFor:
        "Best for founders and operators who want deeper strategic conversation, more protected access, and a more focused environment.",
      outcomes:
        "Gain stronger support through protected spaces, advanced resources, exclusive sessions, and closer founder proximity.",
      whyChoose:
        "Businesses move into Inner Circle when they want a tighter room, stronger context, and more useful depth around what comes next. It should feel like progression, not a leap."
    },
    comparisonTitle: "Compare the depth, not just the features",
    comparisonDescription:
      "Each tier sits inside the same environment. Inner Circle and Core add tighter access, stronger context, and more protected discussion when the business needs it.",
    faqTitle: "Membership questions, answered clearly",
    faqDescription:
      "Clear answers on room fit, flexibility, progression, and what changes as you move deeper.",
    faqs: [
      {
        question: "How do I know which membership level is right for me?",
        answer:
          "Foundation is the right start when the business needs a stronger base environment. Inner Circle suits businesses wanting a tighter room and deeper discussion. Core is for operators who need the calmest room and the strongest context."
      },
      {
        question: "Can I move up later?",
        answer:
          "Yes. You can start with Foundation, then move into Inner Circle or Core later when the business needs more protected access, stronger context, or deeper discussion."
      },
      {
        question: "Do both plans include collaboration opportunities?",
        answer:
          "Yes. Collaboration sits inside the wider environment. Deeper tiers add more protected access and stronger context around those relationships."
      },
      {
        question: "Is Inner Circle only for large or established businesses?",
        answer:
          "No. It is not about size alone. It is for businesses that need a tighter room, stronger signal, and more focused discussion than Foundation."
      },
      {
        question: "What gives the membership long-term value?",
        answer:
          "Long-term value comes from being in a better environment over time: clearer decisions, stronger relationships, better context, and access that can deepen as the business grows."
      }
    ],
    ctaTitle: "Choose the room depth that matches your next phase",
    ctaDescription:
      "Start with the room that fits your stage today and move deeper when the business needs more protected access."
  },
  footer: {
    brandBlurb:
      "A founder-led private business environment for owners who want clearer structure, stronger relationships, and steadier momentum.",
    supportEmail: SITE_CONFIG.supportEmail,
    supportLine: "Membership, billing, partnerships, and serious business enquiries",
    trustLine: "Private Business Environment. Clear placement. Founder-led standards.",
    founderLine: "Built and led by Trev Newton.",
    bottomLine:
      "Built for business owners building with intent across the UK."
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
    "/dpia",
    "/privacy-policy",
    "/terms-of-service",
    "/cookie-policy"
  ]
};
