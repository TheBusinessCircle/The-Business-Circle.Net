import { ChannelAccessLevel, MembershipTier, PrismaClient } from "@prisma/client";

const categoryRows = [
  { name: "Startup", slug: "startup", description: "Foundational resources for early-stage businesses.", sortOrder: 0 },
  { name: "Marketing", slug: "marketing", description: "Acquisition, positioning, and messaging resources.", sortOrder: 1 },
  { name: "Productivity", slug: "productivity", description: "Execution and operational productivity resources.", sortOrder: 2 },
  { name: "Finance", slug: "finance", description: "Finance and cashflow systems resources.", sortOrder: 3 },
  { name: "Systems", slug: "systems", description: "Process, SOP, and automation resources.", sortOrder: 4 },
  { name: "Growth", slug: "growth", description: "Scaling playbooks and growth strategy resources.", sortOrder: 5 },
  { name: "Education", slug: "education", description: "Learning pathways and capability-building resources.", sortOrder: 6 },
  { name: "Strategy", slug: "strategy", description: "Strategic planning and founder decision frameworks.", sortOrder: 7 }
] as const;

const channelRows = [
  {
    name: "introductions",
    slug: "introductions",
    description: "Introduce yourself and your business journey.",
    topic: "Member onboarding",
    position: 0,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "general-chat",
    slug: "general-chat",
    description: "General founder and business conversations.",
    topic: "Community discussion",
    position: 1,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "wins-and-progress",
    slug: "wins-and-progress",
    description: "Share weekly wins and accountability updates.",
    topic: "Progress tracking",
    position: 2,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "collaboration",
    slug: "collaboration",
    description: "Find partners and collaboration opportunities.",
    topic: "Partnerships",
    position: 3,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "marketing",
    slug: "marketing",
    description: "Campaigns, positioning, and channel strategy.",
    topic: "Marketing support",
    position: 4,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "business-support",
    slug: "business-support",
    description: "Operational and strategic support from members.",
    topic: "Business operations",
    position: 5,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "inner-circle-chat",
    slug: "inner-circle-chat",
    description: "Private Inner Circle discussions.",
    topic: "Premium member discussion",
    position: 6,
    accessTier: MembershipTier.INNER_CIRCLE,
    accessLevel: ChannelAccessLevel.INNER_CIRCLE,
    isPrivate: true
  },
  {
    name: "founder-strategy",
    slug: "founder-strategy",
    description: "Deep strategic founder conversations.",
    topic: "Advanced strategy",
    position: 7,
    accessTier: MembershipTier.INNER_CIRCLE,
    accessLevel: ChannelAccessLevel.INNER_CIRCLE,
    isPrivate: true
  },
  {
    name: "premium-discussions",
    slug: "premium-discussions",
    description: "The calmest room for higher-level discussion, sharper decisions, and founder proximity.",
    topic: "Core discussion",
    position: 8,
    accessTier: MembershipTier.CORE,
    accessLevel: ChannelAccessLevel.INNER_CIRCLE,
    isPrivate: true
  }
] as const;

const siteContentRows = [
  {
    slug: "home",
    title: "Home Page",
    sections: {
      heroTitle: "Build Faster With The Right Business Circle Around You",
      heroSubtitle:
        "A private ecosystem for founders, startups, and established businesses to collaborate, learn, and scale together."
    }
  },
  {
    slug: "about",
    title: "About Page",
    sections: {
      mission:
        "Help founders and business owners grow with strategy, accountability, and high-trust collaboration."
    }
  },
  {
    slug: "membership",
    title: "Membership Page",
    sections: {
      standard: "Core resources, member directory, and community channels.",
      innerCircle: "Premium channels, advanced resources, and strategy calls."
    }
  }
] as const;

export async function seedBootstrapCatalog(prisma: PrismaClient): Promise<void> {
  await Promise.all(
    categoryRows.map((row) =>
      prisma.category.upsert({
        where: { slug: row.slug },
        update: {
          name: row.name,
          description: row.description,
          sortOrder: row.sortOrder,
          isActive: true
        },
        create: {
          name: row.name,
          slug: row.slug,
          description: row.description,
          sortOrder: row.sortOrder,
          isActive: true
        }
      })
    )
  );

  await Promise.all(
    channelRows.map((row) =>
      prisma.channel.upsert({
        where: { slug: row.slug },
        update: {
          name: row.name,
          description: row.description,
          topic: row.topic,
          position: row.position,
          accessTier: row.accessTier,
          accessLevel: row.accessLevel,
          isPrivate: row.isPrivate,
          isArchived: false
        },
        create: {
          name: row.name,
          slug: row.slug,
          description: row.description,
          topic: row.topic,
          position: row.position,
          accessTier: row.accessTier,
          accessLevel: row.accessLevel,
          isPrivate: row.isPrivate,
          isArchived: false
        }
      })
    )
  );

  await Promise.all(
    siteContentRows.map((row) =>
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
}
