import {
  BusinessStage,
  ChannelAccessLevel,
  EventAccessLevel,
  MembershipTier,
  Prisma,
  PrismaClient,
  ResourceBlockType,
  ResourceStatus,
  Role,
  SubscriptionStatus
} from "@prisma/client";
import { hash } from "bcryptjs";

type DemoUserSeed = {
  email: string;
  name: string;
  role: Role;
  membershipTier: MembershipTier;
  subscriptionStatus: SubscriptionStatus;
  suspended?: boolean;
  profile: {
    headline: string;
    bio: string;
    location: string;
    experience: string;
    website?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
    collaborationNeeds: string;
    collaborationOffers: string;
    partnershipInterests: string;
    collaborationTags: string[];
    isPublic: boolean;
  };
  business: {
    companyName: string;
    slug: string;
    description: string;
    industry: string;
    services: string;
    stage: BusinessStage;
    location: string;
    website?: string;
    teamSize?: number;
    foundedYear?: number;
    isPublic: boolean;
  };
};

type DemoResourceSeed = {
  title: string;
  slug: string;
  summary: string;
  categorySlug: string;
  authorEmail: string;
  status: ResourceStatus;
  accessTier: MembershipTier;
  estimatedReadMinutes: number;
  publishedDaysAgo?: number;
  tags: string[];
  stageLabels: string[];
  relatedSlugs: string[];
  media?: {
    imageUrl?: string;
    videoUrl?: string;
    downloadUrl?: string;
  };
};

type DemoEventSeed = {
  title: string;
  slug: string;
  description: string;
  hostEmail: string;
  hostName: string;
  daysFromNow: number;
  startHourUtc: number;
  startMinuteUtc: number;
  durationMinutes: number;
  accessTier: MembershipTier;
  meetingLink?: string;
  location?: string;
  timezone: string;
  capacity?: number;
};

type BlockSeed = {
  type: ResourceBlockType;
  heading: string;
  content: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
};

type SeededUserRecord = {
  id: string;
  email: string;
  name: string;
  role: Role;
  membershipTier: MembershipTier;
};

type ResourceRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
};

type ChannelMessageBlueprint = {
  authorEmail: string;
  content: string;
  minutesAgo: number;
  attachments?: Prisma.InputJsonValue;
};

const DEMO_MEMBER_PASSWORD = process.env.DEMO_MEMBER_PASSWORD ?? "DemoPass123!";
const DEFAULT_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const DEFAULT_DOWNLOAD_BASE = "https://example.com/downloads";

const CATEGORY_ROWS = [
  {
    name: "Startup",
    slug: "startup",
    description: "Foundational resources for early-stage businesses.",
    colorHex: "#2F5EA3",
    sortOrder: 0
  },
  {
    name: "Marketing",
    slug: "marketing",
    description: "Acquisition, positioning, and messaging resources.",
    colorHex: "#A3782F",
    sortOrder: 1
  },
  {
    name: "Productivity",
    slug: "productivity",
    description: "Execution, focus, and operational productivity systems.",
    colorHex: "#2F8A74",
    sortOrder: 2
  },
  {
    name: "Finance",
    slug: "finance",
    description: "Cashflow, forecasting, and financial control playbooks.",
    colorHex: "#7A5CC9",
    sortOrder: 3
  },
  {
    name: "Systems",
    slug: "systems",
    description: "Process, SOP, and delegation frameworks.",
    colorHex: "#4E6A84",
    sortOrder: 4
  },
  {
    name: "Growth",
    slug: "growth",
    description: "Scaling strategy, expansion, and growth operations.",
    colorHex: "#A84F4F",
    sortOrder: 5
  },
  {
    name: "Education",
    slug: "education",
    description: "Learning loops and capability-building resources.",
    colorHex: "#5A7896",
    sortOrder: 6
  },
  {
    name: "Strategy",
    slug: "strategy",
    description: "Founder decision systems and strategic frameworks.",
    colorHex: "#B58B35",
    sortOrder: 7
  }
] as const;

const CHANNEL_ROWS = [
  {
    name: "introductions",
    slug: "introductions",
    description: "Introduce your company and growth priorities.",
    topic: "Member introductions",
    accessTier: MembershipTier.FOUNDATION,
    isPrivate: false,
    position: 0
  },
  {
    name: "general-chat",
    slug: "general-chat",
    description: "Focused business conversations across the network.",
    topic: "General community discussion",
    accessTier: MembershipTier.FOUNDATION,
    isPrivate: false,
    position: 1
  },
  {
    name: "wins-and-progress",
    slug: "wins-and-progress",
    description: "Share traction, milestones, and accountability updates.",
    topic: "Weekly wins",
    accessTier: MembershipTier.FOUNDATION,
    isPrivate: false,
    position: 2
  },
  {
    name: "collaboration",
    slug: "collaboration",
    description: "Partnership opportunities and referral requests.",
    topic: "Collaboration opportunities",
    accessTier: MembershipTier.FOUNDATION,
    isPrivate: false,
    position: 3
  },
  {
    name: "marketing",
    slug: "marketing",
    description: "Campaigns, messaging, and channel strategy support.",
    topic: "Marketing support",
    accessTier: MembershipTier.FOUNDATION,
    isPrivate: false,
    position: 4
  },
  {
    name: "business-support",
    slug: "business-support",
    description: "Operational support, hiring, finance, and execution.",
    topic: "Business support",
    accessTier: MembershipTier.FOUNDATION,
    isPrivate: false,
    position: 5
  },
  {
    name: "inner-circle-chat",
    slug: "inner-circle-chat",
    description: "Private Inner Circle founder discussions.",
    topic: "Premium member discussion",
    accessTier: MembershipTier.INNER_CIRCLE,
    isPrivate: true,
    position: 6
  },
  {
    name: "founder-strategy",
    slug: "founder-strategy",
    description: "Advanced strategic conversations for premium members.",
    topic: "Founder strategy",
    accessTier: MembershipTier.INNER_CIRCLE,
    isPrivate: true,
    position: 7
  },
  {
    name: "premium-discussions",
    slug: "premium-discussions",
    description: "The calmest room for higher-level discussion, sharper decisions, and founder proximity.",
    topic: "Core discussion",
    accessTier: MembershipTier.CORE,
    isPrivate: true,
    position: 8
  }
] as const;

const SITE_CONTENT_ROWS: Array<{
  slug: string;
  title: string;
  sections: Prisma.InputJsonValue;
}> = [
  {
    slug: "home",
    title: "Homepage Content",
    sections: {
      heroTitle: "Build Faster With The Right Business Circle Around You",
      heroSubtitle:
        "A private ecosystem where founders, startups, and established companies grow through strategic collaboration, practical execution, and accountability.",
      ctaTitle: "Join founders building with sharper strategy and stronger collaboration",
      ctaDescription:
        "Access a premium business network focused on real relationships, practical resources, and measurable growth momentum."
    }
  },
  {
    slug: "about",
    title: "About Page Content",
    sections: {
      intro:
        "The Business Circle Network was built to give business owners a high-trust environment for strategic conversations, practical learning, and collaborative growth."
    }
  },
  {
    slug: "membership",
    title: "Membership Page Content",
    sections: {
      intro:
        "Foundation membership (GBP 30/month) gives complete access to core resources and the member ecosystem. Inner Circle (GBP 60/month) unlocks deeper private discussion, and Core (GBP 120/month) adds the highest level of proximity and strategic access.",
      standardCopy:
        "Resource library, founder directory, community channels, events, and structured collaboration opportunities.",
      innerCircleCopy:
        "Premium strategy vault, private Inner Circle channels, exclusive calls, and advanced growth discussions."
    }
  },
  {
    slug: "footer",
    title: "Footer Content",
    sections: {
      brandBlurb:
        "A private founder network where business operators scale through strategy, accountability, and meaningful collaboration.",
      supportEmail: "support@businesscircle.network",
      supportLine: "Support, partnerships, and member success enquiries",
      bottomLine: "Built for founders, startups, and established businesses."
    }
  }
];

const STAGE_SLUGS: Record<string, string> = {
  IDEA: "idea",
  STARTUP: "startup",
  GROWTH: "growth",
  SCALE: "scale",
  ESTABLISHED: "established"
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toTitleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function avatarFor(name: string): string {
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function atDaysFromNow(base: Date, days: number, hourUtc: number, minuteUtc = 0): Date {
  const value = new Date(base);
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return value;
}

function minutesAgo(base: Date, amount: number): Date {
  return new Date(base.getTime() - amount * 60_000);
}

function resolveAccessLevel(tier: MembershipTier): ChannelAccessLevel {
  return tier === MembershipTier.FOUNDATION
    ? ChannelAccessLevel.MEMBERS
    : ChannelAccessLevel.INNER_CIRCLE;
}

function resolveEventAccessLevel(tier: MembershipTier): EventAccessLevel {
  return tier === MembershipTier.FOUNDATION
    ? EventAccessLevel.MEMBERS
    : EventAccessLevel.INNER_CIRCLE;
}

function resolveDemoStripePriceId(tier: MembershipTier): string {
  if (tier === MembershipTier.CORE) {
    return process.env.STRIPE_CORE_PRICE_ID ?? "price_core_demo";
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return process.env.STRIPE_INNER_CIRCLE_PRICE_ID ?? "price_inner_circle_demo";
  }

  return (
    process.env.STRIPE_FOUNDATION_PRICE_ID ??
    process.env.STRIPE_STANDARD_PRICE_ID ??
    "price_foundation_demo"
  );
}

function resolveDemoStripeProductId(tier: MembershipTier): string {
  if (tier === MembershipTier.CORE) {
    return "prod_demo_core";
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return "prod_demo_inner_circle";
  }

  return "prod_demo_foundation";
}

function subscriptionWindow(status: SubscriptionStatus, now: Date) {
  if (status === SubscriptionStatus.TRIALING) {
    return {
      currentPeriodStart: atDaysFromNow(now, -4, 9),
      currentPeriodEnd: atDaysFromNow(now, 10, 9),
      trialStart: atDaysFromNow(now, -4, 9),
      trialEnd: atDaysFromNow(now, 10, 9),
      canceledAt: null,
      cancelAtPeriodEnd: false
    };
  }

  if (status === SubscriptionStatus.PAST_DUE || status === SubscriptionStatus.UNPAID) {
    return {
      currentPeriodStart: atDaysFromNow(now, -30, 9),
      currentPeriodEnd: atDaysFromNow(now, -2, 9),
      trialStart: null,
      trialEnd: null,
      canceledAt: null,
      cancelAtPeriodEnd: false
    };
  }

  if (status === SubscriptionStatus.CANCELED) {
    return {
      currentPeriodStart: atDaysFromNow(now, -45, 9),
      currentPeriodEnd: atDaysFromNow(now, -12, 9),
      trialStart: null,
      trialEnd: null,
      canceledAt: atDaysFromNow(now, -12, 9),
      cancelAtPeriodEnd: true
    };
  }

  return {
    currentPeriodStart: atDaysFromNow(now, -14, 9),
    currentPeriodEnd: atDaysFromNow(now, 16, 9),
    trialStart: null,
    trialEnd: null,
    canceledAt: null,
    cancelAtPeriodEnd: false
  };
}

function stageTagFromLabel(label: string): { name: string; slug: string } | null {
  const normalized = label.trim().toUpperCase();
  const knownSlug = STAGE_SLUGS[normalized];

  if (knownSlug) {
    return {
      name: toTitleCase(normalized.toLowerCase()),
      slug: knownSlug
    };
  }

  const slug = normalizeSlug(label);
  if (!slug) {
    return null;
  }

  return {
    name: toTitleCase(label),
    slug
  };
}

function buildDemoUsers(adminEmail: string): DemoUserSeed[] {
  return [
    {
      email: adminEmail,
      name: "Platform Admin",
      role: Role.ADMIN,
      membershipTier: MembershipTier.INNER_CIRCLE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Business Circle Platform Administrator",
        bio: "Oversees member success systems, community quality, and platform operations.",
        location: "London, UK",
        experience: "12+ years operating founder communities",
        website: "https://businesscircle.network",
        linkedin: "https://linkedin.com/company/businesscircle",
        collaborationNeeds: "Feedback on onboarding, referrals, and member retention.",
        collaborationOffers: "Strategic introductions and platform support.",
        partnershipInterests: "Hosts, consultants, and implementation specialists.",
        collaborationTags: ["operations", "community", "systems"],
        isPublic: false
      },
      business: {
        companyName: "The Business Circle Network",
        slug: "the-business-circle-network",
        description: "Private professional ecosystem for business owners and operators.",
        industry: "Community Platform",
        services: "Membership network, strategic support, events",
        stage: BusinessStage.ESTABLISHED,
        location: "London, UK",
        website: "https://businesscircle.network",
        teamSize: 14,
        foundedYear: 2021,
        isPublic: false
      }
    },
    {
      email: "clara.bennett@northbridgeadvisory.co",
      name: "Clara Bennett",
      role: Role.INNER_CIRCLE,
      membershipTier: MembershipTier.CORE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Operator Advising Founder-Led Firms Through Scaling Decisions",
        bio: "Supports leadership teams with decision architecture, senior operating rhythm, and commercial discipline.",
        location: "London, UK",
        experience: "14 years in strategic operations",
        website: "https://northbridgeadvisory.co",
        linkedin: "https://linkedin.com/in/clarabennett",
        collaborationNeeds: "Introductions to specialist partners in finance, legal, and people operations.",
        collaborationOffers: "Strategic planning, operating cadence design, and decision support.",
        partnershipInterests: "Selective advisory collaborations with operators serving established founders.",
        collaborationTags: ["strategy", "operations", "leadership"],
        isPublic: true
      },
      business: {
        companyName: "Northbridge Advisory",
        slug: "northbridge-advisory",
        description: "Strategic operating advisory for founder-led companies moving into a more structured growth phase.",
        industry: "Strategic Advisory",
        services: "Operating cadence, decision support, strategic planning",
        stage: BusinessStage.ESTABLISHED,
        location: "London, UK",
        website: "https://northbridgeadvisory.co",
        teamSize: 9,
        foundedYear: 2018,
        isPublic: true
      }
    },
    {
      email: "samir.ali@operatorfoundry.io",
      name: "Samir Ali",
      role: Role.INNER_CIRCLE,
      membershipTier: MembershipTier.CORE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Founder Building Calm Operating Systems for Scaling Teams",
        bio: "Works with multi-service businesses that need better structure, decision quality, and team accountability.",
        location: "Oxford, UK",
        experience: "12 years in founder operations",
        website: "https://operatorfoundry.io",
        linkedin: "https://linkedin.com/in/samirali",
        collaborationNeeds: "Private peer discussion around leadership bandwidth and scaling risk.",
        collaborationOffers: "Systems audits, delivery structure, and leadership process design.",
        partnershipInterests: "Long-term collaborations with finance and commercial strategy specialists.",
        collaborationTags: ["systems", "delivery", "scaling"],
        isPublic: true
      },
      business: {
        companyName: "Operator Foundry",
        slug: "operator-foundry",
        description: "Operating systems partner for founder-led firms building stronger structure and calmer growth.",
        industry: "Business Operations",
        services: "Operating systems, delivery design, leadership support",
        stage: BusinessStage.SCALE,
        location: "Oxford, UK",
        website: "https://operatorfoundry.io",
        teamSize: 6,
        foundedYear: 2020,
        isPublic: true
      }
    },
    {
      email: "aisha.khan@northstarhq.com",
      name: "Aisha Khan",
      role: Role.INNER_CIRCLE,
      membershipTier: MembershipTier.INNER_CIRCLE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "B2B SaaS Founder Scaling Enterprise Revenue",
        bio: "Building sales workflow software for distributed revenue teams across the UK and US.",
        location: "Manchester, UK",
        experience: "8 years in SaaS growth",
        website: "https://northstarhq.com",
        linkedin: "https://linkedin.com/in/aishakhan",
        collaborationNeeds: "Peer review on enterprise go-to-market expansion.",
        collaborationOffers: "Pricing model design and outbound strategy.",
        partnershipInterests: "Joint workshops with RevOps and CRM partners.",
        collaborationTags: ["saas", "pricing", "enterprise-sales"],
        isPublic: true
      },
      business: {
        companyName: "Northstar HQ",
        slug: "northstar-hq",
        description: "Revenue workflow platform for B2B teams moving upmarket.",
        industry: "SaaS",
        services: "Sales workflow software",
        stage: BusinessStage.SCALE,
        location: "Manchester, UK",
        website: "https://northstarhq.com",
        teamSize: 37,
        foundedYear: 2019,
        isPublic: true
      }
    },
    {
      email: "daniel.brooks@brooksandco.studio",
      name: "Daniel Brooks",
      role: Role.INNER_CIRCLE,
      membershipTier: MembershipTier.INNER_CIRCLE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Agency Operator Focused on Margin and Delivery",
        bio: "Helps service firms move from founder-dependent delivery to repeatable operations.",
        location: "Bristol, UK",
        experience: "11 years in agency operations",
        website: "https://brooksandco.studio",
        linkedin: "https://linkedin.com/in/danielbrooks",
        collaborationNeeds: "Partnerships with finance and data specialists.",
        collaborationOffers: "Offer architecture, SOP design, delivery systems.",
        partnershipInterests: "Referral partnerships and co-delivery retainers.",
        collaborationTags: ["agency", "operations", "delivery"],
        isPublic: true
      },
      business: {
        companyName: "Brooks & Co Studio",
        slug: "brooks-and-co-studio",
        description: "Strategic growth partner for service businesses and agencies.",
        industry: "Agency Services",
        services: "Positioning, offers, delivery systems",
        stage: BusinessStage.GROWTH,
        location: "Bristol, UK",
        website: "https://brooksandco.studio",
        teamSize: 19,
        foundedYear: 2017,
        isPublic: true
      }
    },
    {
      email: "maya.thompson@thompsoncommerce.com",
      name: "Maya Thompson",
      role: Role.INNER_CIRCLE,
      membershipTier: MembershipTier.INNER_CIRCLE,
      subscriptionStatus: SubscriptionStatus.TRIALING,
      profile: {
        headline: "Ecommerce CEO Building Multi-Brand Operations",
        bio: "Leads growth across consumer brands with strong retention and cash discipline.",
        location: "Leeds, UK",
        experience: "9 years in ecommerce leadership",
        website: "https://thompsoncommerce.com",
        linkedin: "https://linkedin.com/in/mayathompson",
        collaborationNeeds: "Introductions to creative strategy specialists.",
        collaborationOffers: "Retention programs and hiring frameworks.",
        partnershipInterests: "Co-marketing with complementary brands.",
        collaborationTags: ["ecommerce", "retention", "hiring"],
        isPublic: true
      },
      business: {
        companyName: "Thompson Commerce Group",
        slug: "thompson-commerce-group",
        description: "Portfolio of consumer brands across UK and EU markets.",
        industry: "Ecommerce",
        services: "Direct-to-consumer retail",
        stage: BusinessStage.ESTABLISHED,
        location: "Leeds, UK",
        website: "https://thompsoncommerce.com",
        teamSize: 54,
        foundedYear: 2016,
        isPublic: true
      }
    },
    {
      email: "oliver.grant@elevensystems.io",
      name: "Oliver Grant",
      role: Role.INNER_CIRCLE,
      membershipTier: MembershipTier.INNER_CIRCLE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Systems Architect for Scaling Founder Teams",
        bio: "Designs KPI architecture, operating cadence, and decision systems for leadership teams.",
        location: "London, UK",
        experience: "13 years in operations and analytics",
        website: "https://elevensystems.io",
        linkedin: "https://linkedin.com/in/olivergrant",
        collaborationNeeds: "Feedback on premium advisory packaging.",
        collaborationOffers: "KPI architecture and operating cadence design.",
        partnershipInterests: "Bundled advisory engagements with growth partners.",
        collaborationTags: ["systems", "analytics", "strategy"],
        isPublic: true
      },
      business: {
        companyName: "Eleven Systems",
        slug: "eleven-systems",
        description: "Operational intelligence advisory for growth-stage founders.",
        industry: "Business Consulting",
        services: "KPI architecture and reporting systems",
        stage: BusinessStage.SCALE,
        location: "London, UK",
        website: "https://elevensystems.io",
        teamSize: 11,
        foundedYear: 2018,
        isPublic: true
      }
    },
    {
      email: "priya.shah@ledgerline.co",
      name: "Priya Shah",
      role: Role.INNER_CIRCLE,
      membershipTier: MembershipTier.INNER_CIRCLE,
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
      profile: {
        headline: "CFO Advisor for Founder-Led Companies",
        bio: "Supports founders with cashflow visibility, margin planning, and capital allocation decisions.",
        location: "Birmingham, UK",
        experience: "15 years in finance leadership",
        website: "https://ledgerline.co",
        linkedin: "https://linkedin.com/in/priyashah",
        collaborationNeeds: "Partnerships with legal and tax specialists.",
        collaborationOffers: "Cashflow systems and board reporting support.",
        partnershipInterests: "Fractional CFO and ops partnerships.",
        collaborationTags: ["finance", "cashflow", "cfo"],
        isPublic: true
      },
      business: {
        companyName: "Ledgerline Advisory",
        slug: "ledgerline-advisory",
        description: "Finance advisory for founder-led and scaling businesses.",
        industry: "Financial Services",
        services: "Forecasting, reporting, capital planning",
        stage: BusinessStage.SCALE,
        location: "Birmingham, UK",
        website: "https://ledgerline.co",
        teamSize: 7,
        foundedYear: 2020,
        isPublic: true
      }
    },
    {
      email: "nathan.reed@reedgrowth.co",
      name: "Nathan Reed",
      role: Role.MEMBER,
      membershipTier: MembershipTier.FOUNDATION,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Founder Building a Productized Service Business",
        bio: "Helps B2B founders tighten acquisition systems and improve pipeline consistency.",
        location: "Liverpool, UK",
        experience: "6 years in growth consulting",
        website: "https://reedgrowth.co",
        linkedin: "https://linkedin.com/in/nathanreed",
        collaborationNeeds: "Partnerships with CRM implementation experts.",
        collaborationOffers: "Demand generation audits and channel testing.",
        partnershipInterests: "Co-delivered growth sprints.",
        collaborationTags: ["growth", "consulting", "pipeline"],
        isPublic: true
      },
      business: {
        companyName: "Reed Growth Co",
        slug: "reed-growth-co",
        description: "Demand generation and growth systems for B2B services.",
        industry: "Consulting",
        services: "Demand generation, messaging, funnels",
        stage: BusinessStage.GROWTH,
        location: "Liverpool, UK",
        website: "https://reedgrowth.co",
        teamSize: 6,
        foundedYear: 2021,
        isPublic: true
      }
    },
    {
      email: "sophie.miller@creatorops.io",
      name: "Sophie Miller",
      role: Role.MEMBER,
      membershipTier: MembershipTier.FOUNDATION,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Growth Operations Lead",
        bio: "Builds backend systems for service-led media businesses and education products.",
        location: "Glasgow, UK",
        experience: "7 years in growth operations",
        website: "https://creatorops.io",
        instagram: "https://instagram.com/creatorops",
        linkedin: "https://linkedin.com/in/sophiemiller",
        collaborationNeeds: "Partnerships with production and content teams.",
        collaborationOffers: "Product launches and backend automation.",
        partnershipInterests: "Operational collaborations and curriculum partnerships.",
        collaborationTags: ["operations", "automation", "launches"],
        isPublic: true
      },
      business: {
        companyName: "CreatorOps",
        slug: "creatorops",
        description: "Operational partner for service-led education and media ventures.",
        industry: "Media and Education",
        services: "Operations, launches, systems",
        stage: BusinessStage.GROWTH,
        location: "Glasgow, UK",
        website: "https://creatorops.io",
        teamSize: 8,
        foundedYear: 2020,
        isPublic: true
      }
    },
    {
      email: "liam.carter@buildsignal.app",
      name: "Liam Carter",
      role: Role.MEMBER,
      membershipTier: MembershipTier.FOUNDATION,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      profile: {
        headline: "Technical Founder Shipping Internal Tools",
        bio: "Building workflow tools for project-heavy businesses and implementation teams.",
        location: "Nottingham, UK",
        experience: "5 years in product and engineering",
        website: "https://buildsignal.app",
        linkedin: "https://linkedin.com/in/liamcarter",
        collaborationNeeds: "Pilot customers in services and consulting.",
        collaborationOffers: "Workflow automation and technical advisory.",
        partnershipInterests: "Product partnerships with operators and agencies.",
        collaborationTags: ["product", "automation", "saas"],
        isPublic: true
      },
      business: {
        companyName: "BuildSignal",
        slug: "buildsignal",
        description: "Workflow software for service teams managing client delivery.",
        industry: "SaaS",
        services: "Workflow automation tools",
        stage: BusinessStage.STARTUP,
        location: "Nottingham, UK",
        website: "https://buildsignal.app",
        teamSize: 4,
        foundedYear: 2023,
        isPublic: true
      }
    },
    {
      email: "grace.wilson@metriclane.io",
      name: "Grace Wilson",
      role: Role.MEMBER,
      membershipTier: MembershipTier.FOUNDATION,
      subscriptionStatus: SubscriptionStatus.TRIALING,
      profile: {
        headline: "Growth Analyst for Founder-Led Teams",
        bio: "Translates marketing and sales data into weekly operator decisions.",
        location: "Edinburgh, UK",
        experience: "6 years in growth analytics",
        website: "https://metriclane.io",
        linkedin: "https://linkedin.com/in/gracewilson",
        collaborationNeeds: "Partnerships with paid media specialists.",
        collaborationOffers: "Dashboard audits and conversion analysis.",
        partnershipInterests: "Embedded analytics retainers.",
        collaborationTags: ["analytics", "growth", "dashboards"],
        isPublic: true
      },
      business: {
        companyName: "MetricLane",
        slug: "metriclane",
        description: "Analytics support for founder-led growth teams.",
        industry: "Analytics",
        services: "Reporting, attribution, conversion insights",
        stage: BusinessStage.GROWTH,
        location: "Edinburgh, UK",
        website: "https://metriclane.io",
        teamSize: 5,
        foundedYear: 2022,
        isPublic: true
      }
    },
    {
      email: "ben.harper@harperstudio.co",
      name: "Ben Harper",
      role: Role.MEMBER,
      membershipTier: MembershipTier.FOUNDATION,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      suspended: true,
      profile: {
        headline: "Brand Strategist for Service Businesses",
        bio: "Previously active in the network and currently paused while restructuring his offer.",
        location: "Cardiff, UK",
        experience: "10 years in brand strategy",
        website: "https://harperstudio.co",
        linkedin: "https://linkedin.com/in/benharper",
        collaborationNeeds: "Partnerships with performance marketing operators.",
        collaborationOffers: "Brand positioning and messaging strategy.",
        partnershipInterests: "Joint offers for agency clients.",
        collaborationTags: ["branding", "positioning", "services"],
        isPublic: true
      },
      business: {
        companyName: "Harper Studio",
        slug: "harper-studio",
        description: "Brand and positioning consultancy for service companies.",
        industry: "Brand Consulting",
        services: "Positioning, brand strategy, messaging",
        stage: BusinessStage.ESTABLISHED,
        location: "Cardiff, UK",
        website: "https://harperstudio.co",
        teamSize: 3,
        foundedYear: 2018,
        isPublic: true
      }
    },
    {
      email: "emily.ward@wardventures.io",
      name: "Emily Ward",
      role: Role.MEMBER,
      membershipTier: MembershipTier.FOUNDATION,
      subscriptionStatus: SubscriptionStatus.UNPAID,
      profile: {
        headline: "Founder Building an Education Venture",
        bio: "Launching cohort-based learning programs for small business operators.",
        location: "Brighton, UK",
        experience: "4 years in digital education",
        website: "https://wardventures.io",
        linkedin: "https://linkedin.com/in/emilyward",
        collaborationNeeds: "Introductions to distribution partners.",
        collaborationOffers: "Curriculum design and cohort facilitation.",
        partnershipInterests: "Co-created programs with niche experts.",
        collaborationTags: ["education", "cohorts", "curriculum"],
        isPublic: true
      },
      business: {
        companyName: "Ward Ventures",
        slug: "ward-ventures",
        description: "Education products for founder and operator skill building.",
        industry: "Education",
        services: "Cohorts, workshops, learning products",
        stage: BusinessStage.STARTUP,
        location: "Brighton, UK",
        website: "https://wardventures.io",
        teamSize: 2,
        foundedYear: 2024,
        isPublic: true
      }
    }
  ];
}

function buildDemoResources(adminEmail: string): DemoResourceSeed[] {
  return [
    {
      title: "Founder Operating System: First 90 Days",
      slug: "founder-operating-system-first-90-days",
      summary:
        "A practical operating system for founders who need structure, visibility, and weekly execution rhythm.",
      categorySlug: "startup",
      authorEmail: "oliver.grant@elevensystems.io",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 12,
      publishedDaysAgo: 22,
      tags: ["Operations", "Planning", "Weekly Review"],
      stageLabels: ["STARTUP"],
      relatedSlugs: ["sop-stack-for-delegation-without-drift", "quarterly-growth-review-scorecard"]
    },
    {
      title: "Conversion Messaging Framework for Founders",
      slug: "conversion-messaging-framework-founders",
      summary:
        "Refine offer messaging that converts qualified leads without overpromising or discount dependency.",
      categorySlug: "marketing",
      authorEmail: "daniel.brooks@brooksandco.studio",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 10,
      publishedDaysAgo: 19,
      tags: ["Messaging", "Positioning", "Acquisition"],
      stageLabels: ["GROWTH"],
      relatedSlugs: ["quarterly-growth-review-scorecard", "inner-circle-market-expansion-war-room"]
    },
    {
      title: "Leadership Deep Work Rhythm",
      slug: "leadership-deep-work-rhythm",
      summary:
        "A weekly focus architecture to protect leadership capacity while execution volume increases.",
      categorySlug: "productivity",
      authorEmail: "aisha.khan@northstarhq.com",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 8,
      publishedDaysAgo: 17,
      tags: ["Focus", "Leadership", "Execution"],
      stageLabels: ["SCALE"],
      relatedSlugs: ["founder-learning-loop-debriefs", "founder-operating-system-first-90-days"]
    },
    {
      title: "Cashflow Command Dashboard Template",
      slug: "cashflow-command-dashboard-template",
      summary:
        "Design a cashflow command dashboard that keeps runway, margin, and hiring decisions visible every week.",
      categorySlug: "finance",
      authorEmail: "grace.wilson@metriclane.io",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 11,
      publishedDaysAgo: 14,
      tags: ["Cashflow", "Dashboards", "Runway"],
      stageLabels: ["GROWTH"],
      relatedSlugs: ["inner-circle-capital-allocation-playbook"]
    },
    {
      title: "SOP Stack for Delegation Without Drift",
      slug: "sop-stack-for-delegation-without-drift",
      summary:
        "Build a lean SOP stack that preserves quality and speed as team ownership expands.",
      categorySlug: "systems",
      authorEmail: "nathan.reed@reedgrowth.co",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 9,
      publishedDaysAgo: 13,
      tags: ["SOP", "Delegation", "Quality"],
      stageLabels: ["SCALE"],
      relatedSlugs: ["founder-operating-system-first-90-days"]
    },
    {
      title: "Quarterly Growth Review Scorecard",
      slug: "quarterly-growth-review-scorecard",
      summary:
        "Use a quarterly scorecard to align growth targets, channel decisions, and resource allocation.",
      categorySlug: "growth",
      authorEmail: "maya.thompson@thompsoncommerce.com",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 9,
      publishedDaysAgo: 12,
      tags: ["Scorecards", "Growth", "KPIs"],
      stageLabels: ["GROWTH"],
      relatedSlugs: ["conversion-messaging-framework-founders", "inner-circle-acquisition-scenario-modeling"]
    },
    {
      title: "Founder Learning Loop and Team Debriefs",
      slug: "founder-learning-loop-and-team-debriefs",
      summary:
        "A repeatable debrief loop to convert project outcomes into sharper team capability.",
      categorySlug: "education",
      authorEmail: "sophie.miller@creatorops.io",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 7,
      publishedDaysAgo: 10,
      tags: ["Debrief", "Learning", "Team Development"],
      stageLabels: ["STARTUP"],
      relatedSlugs: ["leadership-deep-work-rhythm"]
    },
    {
      title: "Decision Journaling for Strategic Clarity",
      slug: "decision-journaling-for-strategic-clarity",
      summary:
        "Track strategic decisions with context and assumptions to improve leadership quality over time.",
      categorySlug: "strategy",
      authorEmail: "priya.shah@ledgerline.co",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.FOUNDATION,
      estimatedReadMinutes: 8,
      publishedDaysAgo: 9,
      tags: ["Decision Making", "Leadership", "Strategy"],
      stageLabels: ["ESTABLISHED"],
      relatedSlugs: ["founder-operating-system-first-90-days"]
    },
    {
      title: "Inner Circle: Acquisition Scenario Modeling",
      slug: "inner-circle-acquisition-scenario-modeling",
      summary:
        "Premium scenario-modeling framework to stress-test acquisition channels before scaling spend.",
      categorySlug: "strategy",
      authorEmail: "aisha.khan@northstarhq.com",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.INNER_CIRCLE,
      estimatedReadMinutes: 14,
      publishedDaysAgo: 7,
      tags: ["Scenario Planning", "Acquisition", "Strategy"],
      stageLabels: ["SCALE"],
      relatedSlugs: ["inner-circle-capital-allocation-playbook", "inner-circle-market-expansion-war-room"]
    },
    {
      title: "Inner Circle: Capital Allocation Playbook",
      slug: "inner-circle-capital-allocation-playbook",
      summary:
        "A premium capital allocation model for balancing growth bets, cash reserves, and hiring pace.",
      categorySlug: "finance",
      authorEmail: "oliver.grant@elevensystems.io",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.INNER_CIRCLE,
      estimatedReadMinutes: 13,
      publishedDaysAgo: 6,
      tags: ["Capital Allocation", "Finance", "Executive Decisions"],
      stageLabels: ["ESTABLISHED"],
      relatedSlugs: ["inner-circle-acquisition-scenario-modeling"]
    },
    {
      title: "Inner Circle: Market Expansion War Room",
      slug: "inner-circle-market-expansion-war-room",
      summary:
        "Premium expansion planning framework for entering new markets without operational fragility.",
      categorySlug: "growth",
      authorEmail: "maya.thompson@thompsoncommerce.com",
      status: ResourceStatus.PUBLISHED,
      accessTier: MembershipTier.INNER_CIRCLE,
      estimatedReadMinutes: 15,
      publishedDaysAgo: 4,
      tags: ["Expansion", "Market Entry", "Execution"],
      stageLabels: ["SCALE"],
      relatedSlugs: ["inner-circle-acquisition-scenario-modeling", "conversion-messaging-framework-founders"]
    },
    {
      title: "Premium Talent Density Handbook",
      slug: "premium-talent-density-handbook",
      summary:
        "Draft premium handbook for building lean, high-output teams with role clarity and accountability.",
      categorySlug: "education",
      authorEmail: adminEmail,
      status: ResourceStatus.DRAFT,
      accessTier: MembershipTier.INNER_CIRCLE,
      estimatedReadMinutes: 16,
      tags: ["Hiring", "Leadership", "Culture"],
      stageLabels: ["GROWTH"],
      relatedSlugs: ["leadership-deep-work-rhythm"]
    }
  ];
}

function buildDemoEvents(): DemoEventSeed[] {
  return [
    {
      title: "Founder Networking Sprint",
      slug: "founder-networking-sprint",
      description:
        "Structured member networking focused on partnerships, intros, and current growth priorities.",
      hostEmail: "daniel.brooks@brooksandco.studio",
      hostName: "Daniel Brooks",
      daysFromNow: 3,
      startHourUtc: 17,
      startMinuteUtc: 0,
      durationMinutes: 60,
      accessTier: MembershipTier.FOUNDATION,
      meetingLink: "https://meet.google.com/networking-sprint-demo",
      timezone: "Europe/London",
      capacity: 120
    },
    {
      title: "Marketing Systems Roundtable",
      slug: "marketing-systems-roundtable",
      description:
        "Founder roundtable on channel performance, conversion flow bottlenecks, and campaign diagnostics.",
      hostEmail: "nathan.reed@reedgrowth.co",
      hostName: "Nathan Reed",
      daysFromNow: 6,
      startHourUtc: 16,
      startMinuteUtc: 30,
      durationMinutes: 75,
      accessTier: MembershipTier.FOUNDATION,
      meetingLink: "https://meet.google.com/marketing-roundtable-demo",
      timezone: "Europe/London"
    },
    {
      title: "Operations and Cashflow Office Hours",
      slug: "operations-and-cashflow-office-hours",
      description:
        "Practical office hours for founders navigating margin pressure, reporting cadence, and hiring tradeoffs.",
      hostEmail: "priya.shah@ledgerline.co",
      hostName: "Priya Shah",
      daysFromNow: 10,
      startHourUtc: 18,
      startMinuteUtc: 0,
      durationMinutes: 90,
      accessTier: MembershipTier.FOUNDATION,
      meetingLink: "https://meet.google.com/ops-cashflow-demo",
      timezone: "Europe/London"
    },
    {
      title: "Inner Circle Strategy Call",
      slug: "inner-circle-strategy-call",
      description:
        "Monthly premium strategy call focused on high-leverage decisions and execution priorities.",
      hostEmail: "aisha.khan@northstarhq.com",
      hostName: "Aisha Khan",
      daysFromNow: 4,
      startHourUtc: 14,
      startMinuteUtc: 0,
      durationMinutes: 75,
      accessTier: MembershipTier.INNER_CIRCLE,
      meetingLink: "https://meet.google.com/inner-circle-strategy-demo",
      timezone: "Europe/London",
      capacity: 45
    },
    {
      title: "Inner Circle Expansion War Room",
      slug: "inner-circle-expansion-war-room",
      description:
        "Premium working session for market expansion strategy, risk mapping, and operational sequencing.",
      hostEmail: "maya.thompson@thompsoncommerce.com",
      hostName: "Maya Thompson",
      daysFromNow: 8,
      startHourUtc: 15,
      startMinuteUtc: 0,
      durationMinutes: 90,
      accessTier: MembershipTier.INNER_CIRCLE,
      meetingLink: "https://meet.google.com/inner-circle-expansion-demo",
      timezone: "Europe/London",
      capacity: 35
    },
    {
      title: "Inner Circle London Founder Dinner",
      slug: "inner-circle-london-founder-dinner",
      description:
        "In-person premium founder dinner for strategic relationships and long-term partnership development.",
      hostEmail: "oliver.grant@elevensystems.io",
      hostName: "Oliver Grant",
      daysFromNow: 14,
      startHourUtc: 18,
      startMinuteUtc: 30,
      durationMinutes: 120,
      accessTier: MembershipTier.INNER_CIRCLE,
      location: "Mayfair, London",
      timezone: "Europe/London",
      capacity: 24
    },
    {
      title: "Core Decision Room",
      slug: "core-decision-room",
      description:
        "Private Core session for working through one high-consequence business decision with sharper structure and less noise.",
      hostEmail: "clara.bennett@northbridgeadvisory.co",
      hostName: "Clara Bennett",
      daysFromNow: 5,
      startHourUtc: 11,
      startMinuteUtc: 30,
      durationMinutes: 75,
      accessTier: MembershipTier.CORE,
      meetingLink: "https://meet.google.com/core-decision-room-demo",
      timezone: "Europe/London",
      capacity: 18
    },
    {
      title: "Core Operator Session",
      slug: "core-operator-session",
      description:
        "Focused Core working session on structure, leadership bandwidth, and the practical decisions that shape the next stage.",
      hostEmail: "samir.ali@operatorfoundry.io",
      hostName: "Samir Ali",
      daysFromNow: 12,
      startHourUtc: 17,
      startMinuteUtc: 30,
      durationMinutes: 90,
      accessTier: MembershipTier.CORE,
      meetingLink: "https://meet.google.com/core-operator-session-demo",
      timezone: "Europe/London",
      capacity: 16
    }
  ];
}

function buildMessageBlueprints(adminEmail: string): Record<string, ChannelMessageBlueprint[]> {
  return {
    introductions: [
      {
        authorEmail: "nathan.reed@reedgrowth.co",
        content:
          "Hi everyone, Nathan here. I run Reed Growth Co and I am focused on improving qualified pipeline quality this quarter.",
        minutesAgo: 220
      },
      {
        authorEmail: "sophie.miller@creatorops.io",
        content:
          "Welcome Nathan. I work with service-led teams on launch systems and would love to compare onboarding flows.",
        minutesAgo: 206
      },
      {
        authorEmail: "aisha.khan@northstarhq.com",
        content:
          "Great to have you in. If you are experimenting with outbound narratives, I can share the framework we are using this month.",
        minutesAgo: 194
      },
      {
        authorEmail: adminEmail,
        content:
          "Welcome to the network. Please post your current priority and what kind of collaboration support you want from members.",
        minutesAgo: 182
      }
    ],
    "general-chat": [
      {
        authorEmail: "liam.carter@buildsignal.app",
        content: "Quick question: what is everyone using for weekly leadership scorecards right now?",
        minutesAgo: 165
      },
      {
        authorEmail: "oliver.grant@elevensystems.io",
        content:
          "We use a 5-metric operating scorecard tied directly to decision owners. I can post a lightweight template.",
        minutesAgo: 156
      },
      {
        authorEmail: "grace.wilson@metriclane.io",
        content:
          "I recommend separating leading indicators from lagging indicators in that scorecard to avoid noisy decisions.",
        minutesAgo: 149
      },
      {
        authorEmail: "daniel.brooks@brooksandco.studio",
        content: "Agreed. Clarity improves when each metric has a single accountable owner.",
        minutesAgo: 144
      }
    ],
    "wins-and-progress": [
      {
        authorEmail: "maya.thompson@thompsoncommerce.com",
        content:
          "Win this week: we improved repeat purchase rate by 11 percent after tightening post-purchase journey timing.",
        minutesAgo: 132
      },
      {
        authorEmail: "nathan.reed@reedgrowth.co",
        content:
          "Nice result. We closed two retained clients this week after restructuring our discovery call sequence.",
        minutesAgo: 127
      },
      {
        authorEmail: "sophie.miller@creatorops.io",
        content:
          "We shipped a new launch SOP and cut execution chaos significantly. Happy to share the checklist if useful.",
        minutesAgo: 121
      }
    ],
    collaboration: [
      {
        authorEmail: "priya.shah@ledgerline.co",
        content:
          "Looking for a referral partner focused on post-acquisition integration support for founder-led companies.",
        minutesAgo: 112
      },
      {
        authorEmail: "daniel.brooks@brooksandco.studio",
        content:
          "I can help there. We run integration playbooks for service businesses after small acquisitions.",
        minutesAgo: 108
      },
      {
        authorEmail: "aisha.khan@northstarhq.com",
        content:
          "If anyone needs enterprise outreach support, my team can share our latest outbound qualification script.",
        minutesAgo: 103
      }
    ],
    marketing: [
      {
        authorEmail: "grace.wilson@metriclane.io",
        content: "Our webinar funnel is underperforming in week-two follow-up. Any suggestions on retention emails?",
        minutesAgo: 94
      },
      {
        authorEmail: "nathan.reed@reedgrowth.co",
        content:
          "Try segmenting by buying signal strength. We saw a material improvement once sequence logic was split by intent.",
        minutesAgo: 89
      },
      {
        authorEmail: "sophie.miller@creatorops.io",
        content:
          "Also test shorter CTA windows with clearer action language. We improved click-through by simplifying options.",
        minutesAgo: 84
      }
    ],
    "business-support": [
      {
        authorEmail: "liam.carter@buildsignal.app",
        content:
          "Requesting advice on first operations hire. Should I prioritize delivery management or customer success first?",
        minutesAgo: 72
      },
      {
        authorEmail: "oliver.grant@elevensystems.io",
        content:
          "Start with whichever role unblocks your highest recurring bottleneck. For most founders that is delivery consistency.",
        minutesAgo: 67
      },
      {
        authorEmail: "maya.thompson@thompsoncommerce.com",
        content:
          "Agree. We hired delivery leadership first and it immediately gave the founder more strategic capacity.",
        minutesAgo: 63
      }
    ],
    "inner-circle-chat": [
      {
        authorEmail: "aisha.khan@northstarhq.com",
        content:
          "Inner Circle prompt: what single strategic bet are you committing to for the next 60 days?",
        minutesAgo: 54
      },
      {
        authorEmail: "oliver.grant@elevensystems.io",
        content:
          "Our bet is reducing sales cycle variance by tightening pre-demo qualification and proposal framing.",
        minutesAgo: 49
      },
      {
        authorEmail: "maya.thompson@thompsoncommerce.com",
        content:
          "For us, it is market expansion sequencing. We are prioritizing one channel deeply before adding complexity.",
        minutesAgo: 45
      }
    ],
    "founder-strategy": [
      {
        authorEmail: "priya.shah@ledgerline.co",
        content:
          "Sharing a decision model for growth investment pacing versus reserve targets. Feedback welcome before the call.",
        minutesAgo: 36,
        attachments: {
          type: "link",
          label: "Capital pacing worksheet",
          url: "https://example.com/templates/capital-pacing"
        } as Prisma.InputJsonValue
      },
      {
        authorEmail: "aisha.khan@northstarhq.com",
        content:
          "Useful structure. I suggest adding scenario triggers for CAC volatility before approving budget ramps.",
        minutesAgo: 31
      },
      {
        authorEmail: adminEmail,
        content:
          "Great discussion. We will use this as a working model in the next premium strategy call.",
        minutesAgo: 27
      }
    ],
    "premium-discussions": [
      {
        authorEmail: "clara.bennett@northbridgeadvisory.co",
        content:
          "Sharing the decision memo structure we use before committing senior time or capital to a new direction.",
        minutesAgo: 20
      },
      {
        authorEmail: "samir.ali@operatorfoundry.io",
        content:
          "This has helped us slow down enough to separate real strategic moves from reactive activity.",
        minutesAgo: 16
      },
      {
        authorEmail: adminEmail,
        content:
          "Use this room for the decisions that carry real consequence. Keep the context clear and the question specific.",
        minutesAgo: 11
      }
    ]
  };
}

function buildResourceBlocks(
  seed: DemoResourceSeed,
  authorName: string,
  relatedResources: ResourceRecord[]
): BlockSeed[] {
  const imageUrl =
    seed.media?.imageUrl ??
    `https://placehold.co/1200x720/0D1B2A/E6E8EC?text=${encodeURIComponent(seed.title)}`;
  const videoUrl = seed.media?.videoUrl ?? DEFAULT_VIDEO_URL;
  const downloadUrl = seed.media?.downloadUrl ?? `${DEFAULT_DOWNLOAD_BASE}/${seed.slug}.pdf`;

  const relatedItems = relatedResources.map((resource) => ({
    label: resource.title,
    url: `/dashboard/resources/${resource.slug}`,
    description: resource.summary.slice(0, 140)
  }));

  return [
    {
      type: ResourceBlockType.TEXT,
      heading: "Overview",
      content: {
        section: "overview",
        text: `${seed.summary} This resource is designed for practical implementation, not theory.`
      }
    },
    {
      type: ResourceBlockType.CHECKLIST,
      heading: "Who It Helps",
      content: {
        section: "who-it-helps",
        items: [
          "Founders who need clearer operating decisions each week",
          "Leaders responsible for team execution and accountability",
          "Businesses transitioning from reactive to strategic operations"
        ]
      }
    },
    {
      type: ResourceBlockType.STEPS,
      heading: "When to Use It",
      content: {
        section: "when-to-use-it",
        steps: [
          "Run this framework during planning cycles or execution resets.",
          "Apply it when strategic decisions are stalling due to unclear priorities.",
          "Revisit monthly to tighten cadence, ownership, and follow-through."
        ]
      }
    },
    {
      type: ResourceBlockType.CHECKLIST,
      heading: "Key Questions",
      content: {
        section: "key-questions",
        items: [
          "Which decisions create the highest leverage this quarter?",
          "Where are bottlenecks caused by unclear ownership?",
          "What single metric confirms this strategy is working?"
        ]
      }
    },
    {
      type: ResourceBlockType.TEXT,
      heading: "Implementation Notes",
      content: {
        section: "implementation-notes",
        text: "Keep implementation lightweight. Assign one owner per action and review progress weekly."
      }
    },
    {
      type: ResourceBlockType.CALLOUT,
      heading: "Common Mistakes",
      content: {
        section: "common-mistakes",
        title: "Avoid complexity before consistency",
        text: "Most teams fail by adding tools and meetings before basic ownership and review cadence is stable.",
        tone: "warning"
      }
    },
    {
      type: ResourceBlockType.STEPS,
      heading: "Action Steps",
      content: {
        section: "action-steps",
        steps: [
          "Define success metric and accountable owner.",
          "Set a weekly review cadence.",
          "Document key assumptions and update based on evidence."
        ]
      }
    },
    {
      type: ResourceBlockType.DOWNLOAD,
      heading: "Download",
      content: {
        section: "action-steps",
        url: downloadUrl,
        label: "Download Implementation Template",
        description: "Editable worksheet for internal execution and review.",
        fileType: "PDF",
        fileSize: "1.2 MB"
      }
    },
    {
      type: ResourceBlockType.LINKS,
      heading: "Tools / Frameworks",
      content: {
        section: "tools-frameworks",
        items: [
          {
            label: "Weekly Execution Scoreboard",
            url: "https://example.com/templates/execution-scoreboard",
            description: "Simple weekly scorecard template."
          },
          {
            label: "Decision Journal Template",
            url: "https://example.com/templates/decision-journal",
            description: "Track assumptions, decisions, and outcomes."
          }
        ]
      }
    },
    {
      type: ResourceBlockType.IMAGE,
      heading: "Implementation Snapshot",
      content: {
        section: "implementation-notes",
        url: imageUrl,
        alt: `${seed.title} visual snapshot`,
        caption: "Example operating view used during weekly implementation."
      }
    },
    {
      type: ResourceBlockType.VIDEO,
      heading: "Walkthrough",
      content: {
        section: "implementation-notes",
        url: videoUrl,
        title: `${seed.title} walkthrough`,
        caption: "Brief implementation walkthrough from the resource author."
      }
    },
    {
      type: ResourceBlockType.QUOTE,
      heading: "Key Takeaways",
      content: {
        section: "key-takeaways",
        quote: "Clarity compounds only when converted into repeatable operating habits.",
        author: authorName,
        role: "Business Circle Network member"
      }
    },
    {
      type: ResourceBlockType.LINKS,
      heading: "Related Resources",
      metadata: {
        system: "related-resources",
        source: "seed"
      } as Prisma.InputJsonValue,
      content: {
        section: "related-resources",
        relatedResourceIds: relatedResources.map((resource) => resource.id),
        items: relatedItems
      }
    }
  ];
}

export async function seedDemoContent(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const adminEmail = normalizeEmail(
    process.env.ADMIN_EMAIL ?? "admin@businesscircle.network"
  );
  const users = buildDemoUsers(adminEmail);
  const resources: DemoResourceSeed[] = [];
  const events = buildDemoEvents();
  const memberPasswordHash = await hash(DEMO_MEMBER_PASSWORD, 10);
  const adminPasswordHash =
    process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD !== DEMO_MEMBER_PASSWORD
      ? await hash(process.env.ADMIN_PASSWORD, 10)
      : memberPasswordHash;

  await Promise.all(
    CATEGORY_ROWS.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          colorHex: category.colorHex,
          sortOrder: category.sortOrder,
          isActive: true
        },
        create: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          colorHex: category.colorHex,
          sortOrder: category.sortOrder,
          isActive: true
        }
      })
    )
  );

  const seededUsers = new Map<string, SeededUserRecord>();

  for (const [index, userSeed] of users.entries()) {
    const email = normalizeEmail(userSeed.email);
    const userPasswordHash =
      userSeed.role === Role.ADMIN ? adminPasswordHash : memberPasswordHash;
    const window = subscriptionWindow(userSeed.subscriptionStatus, now);
    const customerKey = `${index + 1}${normalizeSlug(email.replace("@", "-"))
      .replace(/-/g, "")
      .slice(0, 22)}`;
    const priceId = resolveDemoStripePriceId(userSeed.membershipTier);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: userSeed.name,
        image: avatarFor(userSeed.name),
        passwordHash: userPasswordHash,
        role: userSeed.role,
        membershipTier: userSeed.membershipTier,
        suspended: Boolean(userSeed.suspended),
        suspendedAt: userSeed.suspended ? now : null
      },
      create: {
        email,
        name: userSeed.name,
        image: avatarFor(userSeed.name),
        passwordHash: userPasswordHash,
        role: userSeed.role,
        membershipTier: userSeed.membershipTier,
        suspended: Boolean(userSeed.suspended),
        suspendedAt: userSeed.suspended ? now : null
      }
    });

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        headline: userSeed.profile.headline,
        bio: userSeed.profile.bio,
        location: userSeed.profile.location,
        experience: userSeed.profile.experience,
        website: userSeed.profile.website ?? null,
        instagram: userSeed.profile.instagram ?? null,
        linkedin: userSeed.profile.linkedin ?? null,
        tiktok: userSeed.profile.tiktok ?? null,
        collaborationNeeds: userSeed.profile.collaborationNeeds,
        collaborationOffers: userSeed.profile.collaborationOffers,
        partnershipInterests: userSeed.profile.partnershipInterests,
        collaborationTags: userSeed.profile.collaborationTags,
        isPublic: userSeed.profile.isPublic
      },
      create: {
        userId: user.id,
        headline: userSeed.profile.headline,
        bio: userSeed.profile.bio,
        location: userSeed.profile.location,
        experience: userSeed.profile.experience,
        website: userSeed.profile.website ?? null,
        instagram: userSeed.profile.instagram ?? null,
        linkedin: userSeed.profile.linkedin ?? null,
        tiktok: userSeed.profile.tiktok ?? null,
        collaborationNeeds: userSeed.profile.collaborationNeeds,
        collaborationOffers: userSeed.profile.collaborationOffers,
        partnershipInterests: userSeed.profile.partnershipInterests,
        collaborationTags: userSeed.profile.collaborationTags,
        isPublic: userSeed.profile.isPublic
      }
    });

    await prisma.business.upsert({
      where: { profileId: profile.id },
      update: {
        companyName: userSeed.business.companyName,
        slug: userSeed.business.slug,
        description: userSeed.business.description,
        industry: userSeed.business.industry,
        services: userSeed.business.services,
        stage: userSeed.business.stage,
        location: userSeed.business.location,
        website: userSeed.business.website ?? null,
        teamSize: userSeed.business.teamSize ?? null,
        foundedYear: userSeed.business.foundedYear ?? null,
        isPublic: userSeed.business.isPublic
      },
      create: {
        profileId: profile.id,
        companyName: userSeed.business.companyName,
        slug: userSeed.business.slug,
        description: userSeed.business.description,
        industry: userSeed.business.industry,
        services: userSeed.business.services,
        stage: userSeed.business.stage,
        location: userSeed.business.location,
        website: userSeed.business.website ?? null,
        teamSize: userSeed.business.teamSize ?? null,
        foundedYear: userSeed.business.foundedYear ?? null,
        isPublic: userSeed.business.isPublic
      }
    });

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        stripeCustomerId: `cus_demo_${customerKey}`,
        stripeSubscriptionId: `sub_demo_${customerKey}`,
        stripeProductId: resolveDemoStripeProductId(userSeed.membershipTier),
        stripePriceId: priceId,
        status: userSeed.subscriptionStatus,
        tier: userSeed.membershipTier,
        currentPeriodStart: window.currentPeriodStart,
        currentPeriodEnd: window.currentPeriodEnd,
        trialStart: window.trialStart,
        trialEnd: window.trialEnd,
        canceledAt: window.canceledAt,
        cancelAtPeriodEnd: window.cancelAtPeriodEnd,
        metadata: {
          source: "seed-demo",
          seededAt: now.toISOString(),
          userRole: userSeed.role
        } as Prisma.InputJsonValue
      },
      create: {
        userId: user.id,
        stripeCustomerId: `cus_demo_${customerKey}`,
        stripeSubscriptionId: `sub_demo_${customerKey}`,
        stripeProductId: resolveDemoStripeProductId(userSeed.membershipTier),
        stripePriceId: priceId,
        status: userSeed.subscriptionStatus,
        tier: userSeed.membershipTier,
        currentPeriodStart: window.currentPeriodStart,
        currentPeriodEnd: window.currentPeriodEnd,
        trialStart: window.trialStart,
        trialEnd: window.trialEnd,
        canceledAt: window.canceledAt,
        cancelAtPeriodEnd: window.cancelAtPeriodEnd,
        metadata: {
          source: "seed-demo",
          seededAt: now.toISOString(),
          userRole: userSeed.role
        } as Prisma.InputJsonValue
      }
    });

    seededUsers.set(email, {
      id: user.id,
      email,
      name: user.name ?? userSeed.name,
      role: user.role,
      membershipTier: user.membershipTier
    });
  }

  const adminUser = seededUsers.get(adminEmail);
  if (!adminUser) {
    throw new Error("Failed to seed admin user for demo dataset.");
  }

  await Promise.all(
    CHANNEL_ROWS.map((channel) =>
      prisma.channel.upsert({
        where: { slug: channel.slug },
        update: {
          name: channel.name,
          description: channel.description,
          topic: channel.topic,
          accessTier: channel.accessTier,
          accessLevel: resolveAccessLevel(channel.accessTier),
          isPrivate: channel.isPrivate,
          isArchived: false,
          position: channel.position,
          createdById: adminUser.id
        },
        create: {
          name: channel.name,
          slug: channel.slug,
          description: channel.description,
          topic: channel.topic,
          accessTier: channel.accessTier,
          accessLevel: resolveAccessLevel(channel.accessTier),
          isPrivate: channel.isPrivate,
          isArchived: false,
          position: channel.position,
          createdById: adminUser.id
        }
      })
    )
  );

  const categoryRows = await prisma.category.findMany({
    where: {
      slug: {
        in: CATEGORY_ROWS.map((category) => category.slug)
      }
    },
    select: {
      id: true,
      slug: true
    }
  });
  const categoryIdBySlug = new Map(categoryRows.map((category) => [category.slug, category.id]));
  const resourceMap = new Map<string, ResourceRecord>();

  for (const resourceSeed of resources) {
    const categoryId = categoryIdBySlug.get(resourceSeed.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category for resource seed '${resourceSeed.slug}'.`);
    }

    const author = seededUsers.get(normalizeEmail(resourceSeed.authorEmail));
    if (!author) {
      throw new Error(`Missing author '${resourceSeed.authorEmail}' for resource '${resourceSeed.slug}'.`);
    }

    const publishedAt =
      resourceSeed.status === ResourceStatus.PUBLISHED
        ? atDaysFromNow(now, -(resourceSeed.publishedDaysAgo ?? 1), 9)
        : null;

    const resource = await prisma.resource.upsert({
      where: { slug: resourceSeed.slug },
      update: {
        title: resourceSeed.title,
        summary: resourceSeed.summary,
        coverImage: resourceSeed.media?.imageUrl ?? null,
        status: resourceSeed.status,
        accessTier: resourceSeed.accessTier,
        categoryId,
        authorId: author.id,
        estimatedReadMinutes: resourceSeed.estimatedReadMinutes,
        publishedAt,
        archivedAt: null
      },
      create: {
        title: resourceSeed.title,
        slug: resourceSeed.slug,
        summary: resourceSeed.summary,
        coverImage: resourceSeed.media?.imageUrl ?? null,
        status: resourceSeed.status,
        accessTier: resourceSeed.accessTier,
        categoryId,
        authorId: author.id,
        estimatedReadMinutes: resourceSeed.estimatedReadMinutes,
        publishedAt,
        archivedAt: null
      }
    });

    resourceMap.set(resourceSeed.slug, {
      id: resource.id,
      slug: resource.slug,
      title: resource.title,
      summary: resource.summary
    });
  }

  for (const resourceSeed of resources) {
    const resource = resourceMap.get(resourceSeed.slug);
    if (!resource) {
      continue;
    }

    const explicitTags = resourceSeed.tags
      .map((name) => {
        const slug = normalizeSlug(name);
        if (!slug) {
          return null;
        }
        return { name: toTitleCase(name), slug };
      })
      .filter(isDefined);
    const stageTags = resourceSeed.stageLabels.map(stageTagFromLabel).filter(isDefined);
    const tagsBySlug = new Map<string, { name: string; slug: string }>();
    for (const tag of [...explicitTags, ...stageTags]) {
      tagsBySlug.set(tag.slug, tag);
    }
    const tags = Array.from(tagsBySlug.values()).slice(0, 30);

    const authorName =
      seededUsers.get(normalizeEmail(resourceSeed.authorEmail))?.name ?? "Business Circle Team";
    const relatedResources = resourceSeed.relatedSlugs
      .map((slug) => resourceMap.get(slug))
      .filter(isDefined)
      .slice(0, 8);
    const blocks = buildResourceBlocks(resourceSeed, authorName, relatedResources);

    await prisma.resourceTag.deleteMany({
      where: { resourceId: resource.id }
    });
    await prisma.resourceBlock.deleteMany({
      where: { resourceId: resource.id }
    });

    if (tags.length) {
      await prisma.resourceTag.createMany({
        data: tags.map((tag) => ({
          resourceId: resource.id,
          name: tag.name,
          slug: tag.slug
        }))
      });
    }

    if (blocks.length) {
      await prisma.resourceBlock.createMany({
        data: blocks.map((block, index) => ({
          resourceId: resource.id,
          type: block.type,
          heading: block.heading,
          position: index,
          content: block.content,
          metadata: block.metadata ?? undefined
        }))
      });
    }
  }

  for (const eventSeed of events) {
    const host = seededUsers.get(normalizeEmail(eventSeed.hostEmail));
    if (!host) {
      continue;
    }

    const startAt = atDaysFromNow(
      now,
      eventSeed.daysFromNow,
      eventSeed.startHourUtc,
      eventSeed.startMinuteUtc
    );
    const endAt = new Date(startAt.getTime() + eventSeed.durationMinutes * 60_000);

    await prisma.event.upsert({
      where: { slug: eventSeed.slug },
      update: {
        title: eventSeed.title,
        description: eventSeed.description,
        hostId: host.id,
        hostName: eventSeed.hostName,
        startAt,
        endAt,
        timezone: eventSeed.timezone,
        meetingLink: eventSeed.meetingLink ?? null,
        location: eventSeed.location ?? null,
        capacity: eventSeed.capacity ?? null,
        accessTier: eventSeed.accessTier,
        accessLevel: resolveEventAccessLevel(eventSeed.accessTier),
        isCancelled: false
      },
      create: {
        title: eventSeed.title,
        slug: eventSeed.slug,
        description: eventSeed.description,
        hostId: host.id,
        hostName: eventSeed.hostName,
        startAt,
        endAt,
        timezone: eventSeed.timezone,
        meetingLink: eventSeed.meetingLink ?? null,
        location: eventSeed.location ?? null,
        capacity: eventSeed.capacity ?? null,
        accessTier: eventSeed.accessTier,
        accessLevel: resolveEventAccessLevel(eventSeed.accessTier),
        isCancelled: false
      }
    });
  }

  await Promise.all(
    SITE_CONTENT_ROWS.map((row) =>
      prisma.siteContent.upsert({
        where: { slug: row.slug },
        update: {
          title: row.title,
          sections: row.sections
        },
        create: {
          slug: row.slug,
          title: row.title,
          sections: row.sections
        }
      })
    )
  );

  const channels = await prisma.channel.findMany({
    where: {
      slug: {
        in: CHANNEL_ROWS.map((channel) => channel.slug)
      },
      isArchived: false
    },
    select: {
      id: true,
      slug: true
    }
  });
  const channelBySlug = new Map(channels.map((channel) => [channel.slug, channel.id]));
  const messageBlueprints = buildMessageBlueprints(adminEmail);

  for (const [channelSlug, messages] of Object.entries(messageBlueprints)) {
    const channelId = channelBySlug.get(channelSlug);
    if (!channelId) {
      continue;
    }

    const existingCount = await prisma.message.count({
      where: {
        channelId,
        deletedAt: null
      }
    });
    if (existingCount > 0) {
      continue;
    }

    const orderedMessages = [...messages].sort((a, b) => b.minutesAgo - a.minutesAgo);

    for (const messageSeed of orderedMessages) {
      const author = seededUsers.get(normalizeEmail(messageSeed.authorEmail));
      if (!author) {
        continue;
      }

      const createdAt = minutesAgo(now, messageSeed.minutesAgo);

      await prisma.message.create({
        data: {
          channelId,
          userId: author.id,
          content: messageSeed.content,
          ...(isDefined(messageSeed.attachments)
            ? { attachments: messageSeed.attachments }
            : {}),
          createdAt,
          updatedAt: createdAt
        }
      });
    }
  }

  const existingSeedContacts = await prisma.contactSubmission.count({
    where: {
      sourcePath: "/seed/demo"
    }
  });
  if (existingSeedContacts === 0) {
    const contactRows = [
      {
        name: "Alex Morgan",
        email: "alex.morgan@example.org",
        company: "Morgan Advisory",
        subject: "Partnership enquiry",
        message:
          "I run a founder finance advisory and would like to discuss a partner workshop for your Inner Circle members.",
        sourcePath: "/seed/demo",
        userId: seededUsers.get("priya.shah@ledgerline.co")?.id ?? null,
        handledById: adminUser.id,
        isResolved: true,
        resolvedAt: atDaysFromNow(now, -3, 9),
        notes: "Good fit for Q2 partner workshop shortlist."
      },
      {
        name: "Chloe Bennett",
        email: "chloe.bennett@example.org",
        company: "Bennett Studio",
        subject: "Membership question",
        message:
          "Could you clarify whether Inner Circle includes private strategy calls for agency owners?",
        sourcePath: "/seed/demo",
        userId: null,
        handledById: null,
        isResolved: false,
        resolvedAt: null,
        notes: null
      },
      {
        name: "Tom Harris",
        email: "tom.harris@example.org",
        company: "Harris Ventures",
        subject: "Speaking opportunity",
        message:
          "I can host a practical session on sales process design for founder-led teams if useful for your event calendar.",
        sourcePath: "/seed/demo",
        userId: seededUsers.get("nathan.reed@reedgrowth.co")?.id ?? null,
        handledById: null,
        isResolved: false,
        resolvedAt: null,
        notes: null
      }
    ] as const;

    for (const row of contactRows) {
      await prisma.contactSubmission.create({
        data: {
          name: row.name,
          email: row.email,
          company: row.company,
          subject: row.subject,
          message: row.message,
          sourcePath: row.sourcePath,
          userId: row.userId,
          handledById: row.handledById,
          isResolved: row.isResolved,
          resolvedAt: row.resolvedAt,
          notes: row.notes
        }
      });
    }
  }

  console.info(
    `[seed] Demo dataset ready: ${seededUsers.size} users, ${resources.length} resources, ${events.length} events.`
  );
}

