import { FounderServiceBillingType, FounderServiceIntakeMode, PrismaClient } from "@prisma/client";

const FOUNDER_SERVICES = [
  {
    slug: "growth-architect-clarity-audit",
    title: "Clarity Audit",
    shortDescription:
      "A full review of the business, structure, and positioning so the next move becomes clearer.",
    fullDescription:
      "Every piece of work starts here. I review the business properly, show you what is getting in the way, and give you clear direction before anything deeper is discussed.",
    includes: [
      "Full audit",
      "Structured findings",
      "Strategy call",
      "Clear direction"
    ],
    ctaLabel: "Apply For Clarity Audit",
    price: 19900,
    billingType: FounderServiceBillingType.ONE_TIME,
    intakeMode: FounderServiceIntakeMode.APPLICATION,
    position: 0
  },
  {
    slug: "growth-architect-growth-strategy",
    title: "Strategy Session",
    shortDescription:
      "A focused 1:1 session to solve a specific problem and build a clearer path forward.",
    fullDescription:
      "This is for business owners who need direct thinking around a specific commercial issue, decision, or block. It stays focused, practical, and tied to what needs to move next.",
    includes: [
      "Deep dive call",
      "Problem breakdown",
      "Clear next steps"
    ],
    ctaLabel: "Apply For Strategy Session",
    price: 40000,
    billingType: FounderServiceBillingType.ONE_TIME,
    intakeMode: FounderServiceIntakeMode.APPLICATION,
    position: 1
  },
  {
    slug: "growth-architect-full-growth-architect",
    title: "Growth Architect",
    shortDescription:
      "Ongoing support for business owners who want structure, clarity, and consistent direction.",
    fullDescription:
      "This is ongoing direct support for a small number of businesses that want me involved across decisions, structure, and momentum over time.",
    includes: [
      "Ongoing guidance",
      "Structured thinking",
      "Support across decisions and growth"
    ],
    ctaLabel: "Apply For Growth Architect",
    price: 100000,
    billingType: FounderServiceBillingType.MONTHLY_RETAINER,
    intakeMode: FounderServiceIntakeMode.APPLICATION,
    position: 2
  }
] as const;

function toStripePriceId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.startsWith("price_") ? trimmed : undefined;
}

function resolveFounderServiceStripePriceId(slug: string): string | undefined {
  switch (slug) {
    case "growth-architect-clarity-audit":
      return toStripePriceId(process.env.STRIPE_FOUNDER_CLARITY_AUDIT_PRICE_ID);
    case "growth-architect-growth-strategy":
      return toStripePriceId(process.env.STRIPE_FOUNDER_STRATEGY_SESSION_PRICE_ID);
    case "growth-architect-full-growth-architect":
      return (
        toStripePriceId(process.env.STRIPE_FOUNDER_GROWTH_ARCHITECT_MONTHLY_PRICE_ID) ??
        toStripePriceId(process.env.STRIPE_FOUNDER_GROWTH_ARCHITECT_PRICE_ID)
      );
    default:
      return undefined;
  }
}

export async function seedFounderServices(prisma: PrismaClient): Promise<void> {
  for (const service of FOUNDER_SERVICES) {
    const stripePriceId = resolveFounderServiceStripePriceId(service.slug);

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
        stripePriceId,
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
        stripePriceId: stripePriceId ?? null,
        active: true
      }
    });
  }

  await prisma.founderService.updateMany({
    where: {
      slug: {
        notIn: FOUNDER_SERVICES.map((service) => service.slug)
      }
    },
    data: {
      active: false
    }
  });
}
