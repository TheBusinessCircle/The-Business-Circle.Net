import { FounderServiceBillingType, FounderServiceIntakeMode, PrismaClient } from "@prisma/client";

const FOUNDER_SERVICES = [
  {
    slug: "business-growth-audit",
    title: "Business Growth Audit",
    shortDescription:
      "A focused strategic audit to show what is working, what is missing, and where your best growth opportunities are.",
    fullDescription:
      "A focused strategic audit designed to show what is working, what is missing, and where the biggest growth opportunities are inside your business.",
    includes: [
      "Website review",
      "Visibility review",
      "Trust and credibility review",
      "Customer journey review",
      "Growth opportunity insights",
      "Actionable recommendations"
    ],
    ctaLabel: "Start Growth Audit",
    price: 14900,
    billingType: FounderServiceBillingType.ONE_TIME,
    intakeMode: FounderServiceIntakeMode.CHECKOUT,
    position: 0
  },
  {
    slug: "vibe-method-growth-strategy",
    title: "Strategic Growth Plan",
    shortDescription:
      "A deeper strategic breakdown to build a clearer growth roadmap and sharper business direction.",
    fullDescription:
      "A deeper strategic breakdown for businesses that want more than surface-level advice and need a clearer growth plan.",
    includes: [
      "Full strategic review",
      "Growth architecture",
      "Revenue opportunity mapping",
      "Visibility strategy",
      "Trust-building improvements",
      "Website and positioning guidance",
      "Next-step roadmap"
    ],
    ctaLabel: "Build My Growth Plan",
    price: 49900,
    billingType: FounderServiceBillingType.ONE_TIME,
    intakeMode: FounderServiceIntakeMode.CHECKOUT,
    position: 1
  },
  {
    slug: "business-growth-architect-partnership",
    title: "Business Growth Architect Partnership",
    shortDescription:
      "An ongoing strategic partnership for businesses that want Trev involved in growth planning and decision-making.",
    fullDescription:
      "A higher-level strategic partnership for businesses that want Trev involved on an ongoing basis.",
    includes: [
      "Ongoing strategy input",
      "Growth planning",
      "Website direction",
      "Visibility and positioning advice",
      "Business development support",
      "Partnership and expansion thinking",
      "Hands-on strategic oversight"
    ],
    ctaLabel: "Apply For Partnership",
    price: 120000,
    billingType: FounderServiceBillingType.MONTHLY_RETAINER,
    intakeMode: FounderServiceIntakeMode.CHECKOUT,
    position: 2
  },
  {
    slug: "growth-architect-clarity-audit",
    title: "Clarity Audit",
    shortDescription:
      "Expert clarity on what is holding the business back and what needs to happen next.",
    fullDescription:
      "For business owners who need expert clarity on what is holding the business back, where trust or positioning may be leaking, and what needs to happen next.",
    includes: [
      "Business, website, and offer review",
      "Trust and credibility audit",
      "Customer journey feedback",
      "Positioning review",
      "Key opportunity breakdown",
      "Prioritised next steps"
    ],
    ctaLabel: "Book Clarity Audit",
    price: 50000,
    billingType: FounderServiceBillingType.ONE_TIME,
    intakeMode: FounderServiceIntakeMode.CHECKOUT,
    position: 10
  },
  {
    slug: "growth-architect-growth-strategy",
    title: "Growth Strategy",
    shortDescription:
      "Clearer direction, stronger positioning, and a practical roadmap the business can actually use.",
    fullDescription:
      "For business owners who want stronger positioning, clearer strategic direction, and a practical roadmap that helps the next move feel focused rather than noisy.",
    includes: [
      "Everything in Clarity Audit",
      "Deeper strategic review",
      "Messaging and offer refinement",
      "Visibility and authority recommendations",
      "Conversion improvement guidance",
      "Roadmap with priorities"
    ],
    ctaLabel: "Build My Strategy",
    price: 100000,
    billingType: FounderServiceBillingType.ONE_TIME,
    intakeMode: FounderServiceIntakeMode.CHECKOUT,
    position: 11
  },
  {
    slug: "growth-architect-full-growth-architect",
    title: "Full Ecosystem Build",
    shortDescription:
      "Application-based strategic support for businesses that need a wider ecosystem build, not just a single tactic.",
    fullDescription:
      "For founders who need Trev's highest level of strategic input across the wider business ecosystem, with fit and scope agreed after review.",
    includes: [
      "Everything in Growth Strategy",
      "Full business ecosystem review",
      "Deeper brand, website, and trust alignment",
      "Funnel and service structure recommendations",
      "Scale-focused growth planning",
      "Founder-level strategic direction"
    ],
    ctaLabel: "Apply / Enquire",
    price: 0,
    billingType: FounderServiceBillingType.ONE_TIME,
    intakeMode: FounderServiceIntakeMode.APPLICATION,
    position: 12
  }
] as const;

export async function seedFounderServices(prisma: PrismaClient): Promise<void> {
  for (const service of FOUNDER_SERVICES) {
    await prisma.founderService.upsert({
      where: { slug: service.slug },
      update: {
        title: service.title,
        shortDescription: service.shortDescription,
        fullDescription: service.fullDescription,
        includes: [...service.includes],
        ctaLabel: service.ctaLabel,
        price: service.price,
        billingType: service.billingType,
        intakeMode: service.intakeMode,
        position: service.position,
        active: true
      },
      create: {
        slug: service.slug,
        title: service.title,
        shortDescription: service.shortDescription,
        fullDescription: service.fullDescription,
        includes: [...service.includes],
        ctaLabel: service.ctaLabel,
        price: service.price,
        billingType: service.billingType,
        intakeMode: service.intakeMode,
        position: service.position,
        active: true
      }
    });
  }
}
