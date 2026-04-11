import "server-only";

import type Stripe from "stripe";
import {
  BillingDiscountAppliesTo,
  BillingDiscountTag,
  BillingDiscountType,
  BillingInterval,
  BillingPriceBillingType,
  BillingProductCategory,
  BillingSyncStatus,
  FounderServiceBillingType,
  MembershipTier,
  Prisma
} from "@prisma/client";
import {
  MEMBERSHIP_TIER_ORDER,
  getMembershipBillingPlan,
  getMembershipPlanKey,
  getMembershipTierContent,
  resolveMembershipPriceFromStripePriceId
} from "@/config/membership";
import type {
  BillingCatalogDiscountModel,
  BillingCatalogProductModel,
  FounderControlModel,
  ManagedMembershipPlan
} from "@/types";
import { GROWTH_ARCHITECT_SERVICE_SLUGS } from "@/lib/founder";
import { db } from "@/lib/db";
import { nonEmpty, slugify } from "@/lib/utils";
import { requireStripeClient } from "@/server/stripe/client";

type BillingClient = typeof db | Prisma.TransactionClient;

type UpsertBillingProductInput = {
  productId?: string;
  name: string;
  category: BillingProductCategory;
  description: string;
  active: boolean;
  membershipTier?: MembershipTier | null;
  founderServiceId?: string | null;
};

type UpsertBillingPriceInput = {
  priceId?: string;
  productId: string;
  name: string;
  amount: number;
  currency: string;
  billingType: BillingPriceBillingType;
  interval?: BillingInterval | null;
  isFounderPrice: boolean;
  active: boolean;
};

type CreateBillingDiscountInput = {
  code: string;
  name?: string;
  type: BillingDiscountType;
  value: number;
  appliesTo: BillingDiscountAppliesTo;
  usageLimit?: number | null;
  expiresAt?: Date | null;
  active?: boolean;
  tag?: BillingDiscountTag;
  specificProductId?: string | null;
};

type UpdateFounderControlInput = {
  productId: string;
  founderLimit: number;
  active: boolean;
};

const FOUNDING_SETTINGS_ID = "default";
const DEFAULT_CURRENCY = "GBP";

const FOUNDING_SETTINGS_SELECT = {
  id: true,
  enabled: true,
  foundationEnabled: true,
  innerCircleEnabled: true,
  coreEnabled: true,
  foundationLimit: true,
  innerCircleLimit: true,
  coreLimit: true,
  foundationClaimed: true,
  innerCircleClaimed: true,
  coreClaimed: true
} satisfies Prisma.FoundingOfferSettingsSelect;

function toMinorUnitsFromMajor(amount: number) {
  return Math.round(amount * 100);
}

function toMajorUnitsFromMinor(amount: number) {
  return amount / 100;
}

function membershipIntervalToBillingInterval(
  interval: "monthly" | "annual"
): BillingInterval {
  return interval === "annual" ? BillingInterval.YEAR : BillingInterval.MONTH;
}

function billingIntervalToMembershipInterval(
  interval: BillingInterval | null | undefined
): "monthly" | "annual" {
  return interval === BillingInterval.YEAR ? "annual" : "monthly";
}

function founderVariantFlag(variant: "standard" | "founding") {
  return variant === "founding";
}

function founderServiceProductName(input: { slug: string; title: string }) {
  if (input.slug === "growth-architect-full-growth-architect") {
    return "Growth Architect (Monthly)";
  }

  return input.title;
}

function toStripePriceId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed?.startsWith("price_") ? trimmed : null;
}

function founderServiceEnvStripePriceId(slug: string): string | null {
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
      return null;
  }
}

function founderServicePriceName(
  billingType: FounderServiceBillingType
) {
  return billingType === FounderServiceBillingType.MONTHLY_RETAINER
    ? "Monthly"
    : "One-time";
}

function founderServiceBillingTypeFromPrice(
  billingType: BillingPriceBillingType
): FounderServiceBillingType {
  return billingType === BillingPriceBillingType.RECURRING
    ? FounderServiceBillingType.MONTHLY_RETAINER
    : FounderServiceBillingType.ONE_TIME;
}

function founderSettingsForTier(input: {
  settings: Prisma.FoundingOfferSettingsGetPayload<{ select: typeof FOUNDING_SETTINGS_SELECT }>;
  tier: MembershipTier;
}) {
  switch (input.tier) {
    case MembershipTier.INNER_CIRCLE:
      return {
        founderLimit: input.settings.innerCircleLimit,
        currentCount: input.settings.innerCircleClaimed,
        active: input.settings.enabled && input.settings.innerCircleEnabled
      };
    case MembershipTier.CORE:
      return {
        founderLimit: input.settings.coreLimit,
        currentCount: input.settings.coreClaimed,
        active: input.settings.enabled && input.settings.coreEnabled
      };
    default:
      return {
        founderLimit: input.settings.foundationLimit,
        currentCount: input.settings.foundationClaimed,
        active: input.settings.enabled && input.settings.foundationEnabled
      };
  }
}

async function getOrCreateFoundingSettingsRow(client: BillingClient) {
  return client.foundingOfferSettings.upsert({
    where: {
      id: FOUNDING_SETTINGS_ID
    },
    update: {},
    create: {
      id: FOUNDING_SETTINGS_ID
    },
    select: FOUNDING_SETTINGS_SELECT
  });
}

function membershipProductDefaults(tier: MembershipTier) {
  const label =
    tier === MembershipTier.CORE
      ? "Core Membership"
      : tier === MembershipTier.INNER_CIRCLE
        ? "Inner Circle Membership"
        : "Foundation Membership";
  const slug =
    tier === MembershipTier.CORE
      ? "core-membership"
      : tier === MembershipTier.INNER_CIRCLE
        ? "inner-circle-membership"
        : "foundation-membership";

  return {
    slug,
    name: label,
    category: BillingProductCategory.MEMBERSHIP,
    membershipTier: tier,
    description: getMembershipTierContent(tier).description,
    active: true,
    founderServiceId: null as string | null,
    stripeProductId: null as string | null
  };
}

function membershipPriceDefaults(tier: MembershipTier) {
  return [
    {
      name: "Monthly",
      amount: toMinorUnitsFromMajor(
        getMembershipBillingPlan(tier, "standard", "monthly").checkoutPrice
      ),
      currency: DEFAULT_CURRENCY,
      billingType: BillingPriceBillingType.RECURRING,
      interval: BillingInterval.MONTH,
      isFounderPrice: false,
      active: true,
      stripePriceId: getMembershipBillingPlan(tier, "standard", "monthly").stripePriceId
    },
    {
      name: "Annual",
      amount: toMinorUnitsFromMajor(
        getMembershipBillingPlan(tier, "standard", "annual").checkoutPrice
      ),
      currency: DEFAULT_CURRENCY,
      billingType: BillingPriceBillingType.RECURRING,
      interval: BillingInterval.YEAR,
      isFounderPrice: false,
      active: true,
      stripePriceId: getMembershipBillingPlan(tier, "standard", "annual").stripePriceId
    },
    {
      name: "Founder Monthly",
      amount: toMinorUnitsFromMajor(
        getMembershipBillingPlan(tier, "founding", "monthly").checkoutPrice
      ),
      currency: DEFAULT_CURRENCY,
      billingType: BillingPriceBillingType.RECURRING,
      interval: BillingInterval.MONTH,
      isFounderPrice: true,
      active: true,
      stripePriceId: getMembershipBillingPlan(tier, "founding", "monthly").stripePriceId
    },
    {
      name: "Founder Annual",
      amount: toMinorUnitsFromMajor(
        getMembershipBillingPlan(tier, "founding", "annual").checkoutPrice
      ),
      currency: DEFAULT_CURRENCY,
      billingType: BillingPriceBillingType.RECURRING,
      interval: BillingInterval.YEAR,
      isFounderPrice: true,
      active: true,
      stripePriceId: getMembershipBillingPlan(tier, "founding", "annual").stripePriceId
    }
  ] as const;
}

async function ensureBillingProductRecord(
  client: BillingClient,
  input: {
    slug: string;
    name: string;
    category: BillingProductCategory;
    membershipTier: MembershipTier | null;
    founderServiceId: string | null;
    description: string;
    active: boolean;
    stripeProductId: string | null;
  }
) {
  const existing = await client.billingProduct.findFirst({
    where: {
      OR: [
        { slug: input.slug },
        input.membershipTier ? { membershipTier: input.membershipTier } : null,
        input.founderServiceId ? { founderServiceId: input.founderServiceId } : null
      ].filter(nonEmpty)
    }
  });

  if (!existing) {
    return client.billingProduct.create({
      data: {
        slug: input.slug,
        name: input.name,
        category: input.category,
        membershipTier: input.membershipTier,
        founderServiceId: input.founderServiceId,
        description: input.description,
        active: input.active,
        stripeProductId: input.stripeProductId,
        syncStatus: input.stripeProductId ? BillingSyncStatus.SYNCED : BillingSyncStatus.MISSING
      }
    });
  }

  return client.billingProduct.update({
    where: {
      id: existing.id
    },
    data: {
      category: input.category,
      membershipTier: input.membershipTier,
      founderServiceId: input.founderServiceId,
      stripeProductId: existing.stripeProductId ?? input.stripeProductId ?? undefined,
      syncStatus:
        existing.stripeProductId || input.stripeProductId
          ? existing.syncStatus
          : BillingSyncStatus.MISSING
    }
  });
}

async function ensureBillingPriceRecord(
  client: BillingClient,
  input: {
    productId: string;
    name: string;
    amount: number;
    currency: string;
    billingType: BillingPriceBillingType;
    interval: BillingInterval | null;
    isFounderPrice: boolean;
    active: boolean;
    stripePriceId: string;
  }
) {
  const existingRows = await client.billingPrice.findMany({
    where: {
      productId: input.productId,
      name: input.name,
      interval: input.interval,
      isFounderPrice: input.isFounderPrice
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }]
  });
  const activeRow = existingRows.find((row) => row.active) ?? null;

  if (!activeRow) {
    return client.billingPrice.create({
      data: {
        productId: input.productId,
        name: input.name,
        amount: input.amount,
        currency: input.currency,
        billingType: input.billingType,
        interval: input.interval,
        isFounderPrice: input.isFounderPrice,
        active: input.active,
        stripePriceId: input.stripePriceId || null,
        syncStatus: input.stripePriceId ? BillingSyncStatus.SYNCED : BillingSyncStatus.MISSING
      }
    });
  }

  if (!activeRow.stripePriceId && input.stripePriceId) {
    return client.billingPrice.update({
      where: {
        id: activeRow.id
      },
      data: {
        stripePriceId: input.stripePriceId,
        syncStatus: BillingSyncStatus.SYNCED,
        syncError: null
      }
    });
  }

  if (input.stripePriceId && activeRow.stripePriceId !== input.stripePriceId) {
    return client.billingPrice.update({
      where: {
        id: activeRow.id
      },
      data: {
        stripePriceId: input.stripePriceId,
        syncStatus: BillingSyncStatus.SYNCED,
        syncError: null
      }
    });
  }

  return activeRow;
}

async function ensureMembershipCatalog(client: BillingClient) {
  for (const tier of MEMBERSHIP_TIER_ORDER) {
    const product = await ensureBillingProductRecord(client, membershipProductDefaults(tier));

    for (const price of membershipPriceDefaults(tier)) {
      await ensureBillingPriceRecord(client, {
        productId: product.id,
        ...price
      });
    }
  }
}

async function ensureFounderServiceCatalog(client: BillingClient) {
  const services = await client.founderService.findMany({
    where: {
      active: true,
      slug: {
        in: [...GROWTH_ARCHITECT_SERVICE_SLUGS]
      }
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      price: true,
      currency: true,
      billingType: true,
      stripeProductId: true,
      stripePriceId: true
    }
  });

  for (const service of services) {
    const envStripePriceId = founderServiceEnvStripePriceId(service.slug);
    const product = await ensureBillingProductRecord(client, {
      slug: `${service.slug}-product`,
      name: founderServiceProductName(service),
      category: BillingProductCategory.SERVICE,
      membershipTier: null,
      founderServiceId: service.id,
      description: service.shortDescription,
      active: true,
      stripeProductId: service.stripeProductId
    });

    await ensureBillingPriceRecord(client, {
      productId: product.id,
      name: founderServicePriceName(service.billingType),
      amount: service.price,
      currency: service.currency,
      billingType:
        service.billingType === FounderServiceBillingType.MONTHLY_RETAINER
          ? BillingPriceBillingType.RECURRING
          : BillingPriceBillingType.ONE_TIME,
      interval:
        service.billingType === FounderServiceBillingType.MONTHLY_RETAINER
          ? BillingInterval.MONTH
          : null,
      isFounderPrice: false,
      active: true,
      stripePriceId: envStripePriceId ?? service.stripePriceId ?? ""
    });

    await updateLinkedFounderServiceFromCatalog(client, product.id);
  }
}

async function syncFounderSettingsFromLaunchState(client: BillingClient) {
  const settings = await getOrCreateFoundingSettingsRow(client);
  const products = await client.billingProduct.findMany({
    where: {
      category: BillingProductCategory.MEMBERSHIP,
      membershipTier: {
        in: [...MEMBERSHIP_TIER_ORDER]
      }
    },
    select: {
      id: true,
      membershipTier: true
    }
  });

  for (const product of products) {
    if (!product.membershipTier) {
      continue;
    }

    const next = founderSettingsForTier({
      settings,
      tier: product.membershipTier
    });

    await client.founderSettings.upsert({
      where: {
        productId: product.id
      },
      update: {
        founderLimit: next.founderLimit,
        currentCount: next.currentCount,
        active: next.active
      },
      create: {
        productId: product.id,
        founderLimit: next.founderLimit,
        currentCount: next.currentCount,
        active: next.active
      }
    });
  }
}

export async function ensureBillingCatalogSeeded() {
  await db.$transaction(async (tx) => {
    await ensureMembershipCatalog(tx);
    await ensureFounderServiceCatalog(tx);
    await syncFounderSettingsFromLaunchState(tx);
  });
}

function mapFounderControl(
  control: {
    id: string;
    productId: string;
    founderLimit: number;
    currentCount: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null
): FounderControlModel | null {
  if (!control) {
    return null;
  }

  return {
    ...control,
    remainingCount: Math.max(0, control.founderLimit - control.currentCount)
  };
}

function sortBillingProducts(left: BillingCatalogProductModel, right: BillingCatalogProductModel) {
  const leftRank =
    left.category === BillingProductCategory.MEMBERSHIP
      ? MEMBERSHIP_TIER_ORDER.indexOf(left.membershipTier ?? MembershipTier.FOUNDATION)
      : 1000;
  const rightRank =
    right.category === BillingProductCategory.MEMBERSHIP
      ? MEMBERSHIP_TIER_ORDER.indexOf(right.membershipTier ?? MembershipTier.FOUNDATION)
      : 1000;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.name.localeCompare(right.name, "en-GB");
}

export async function listBillingCatalogProducts(): Promise<BillingCatalogProductModel[]> {
  await ensureBillingCatalogSeeded();

  const products = await db.billingProduct.findMany({
    include: {
      founderService: {
        select: {
          id: true,
          slug: true,
          title: true
        }
      },
      prices: {
        orderBy: [{ active: "desc" }, { createdAt: "desc" }]
      },
      founderSettings: true
    }
  });

  return products
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      membershipTier: product.membershipTier,
      founderServiceId: product.founderServiceId,
      description: product.description,
      active: product.active,
      stripeProductId: product.stripeProductId,
      syncStatus: product.syncStatus,
      syncError: product.syncError,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      founderService: product.founderService,
      prices: product.prices,
      founderSettings: mapFounderControl(product.founderSettings)
    }))
    .sort(sortBillingProducts);
}

export async function listBillingCatalogDiscounts(): Promise<BillingCatalogDiscountModel[]> {
  await ensureBillingCatalogSeeded();

  const discounts = await db.billingDiscount.findMany({
    include: {
      specificProduct: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }]
  });

  return discounts;
}

function fallbackManagedMembershipPlan(
  tier: MembershipTier,
  billingVariant: "standard" | "founding",
  billingInterval: "monthly" | "annual"
): ManagedMembershipPlan {
  const fallback = getMembershipBillingPlan(tier, billingVariant, billingInterval);

  return {
    tier,
    billingVariant,
    billingInterval,
    amountMinor: toMinorUnitsFromMajor(fallback.checkoutPrice),
    checkoutPrice: fallback.checkoutPrice,
    monthlyEquivalentPrice: fallback.monthlyEquivalentPrice,
    stripePriceId: fallback.stripePriceId,
    planKey: fallback.planKey
  };
}

function findMatchingBillingPrice(input: {
  prices: Array<{
    amount: number;
    interval: BillingInterval | null;
    isFounderPrice: boolean;
    active: boolean;
    stripePriceId: string | null;
  }>;
  interval: BillingInterval;
  isFounderPrice: boolean;
}) {
  return (
    input.prices.find(
      (price) =>
        price.active &&
        price.interval === input.interval &&
        price.isFounderPrice === input.isFounderPrice
    ) ?? null
  );
}

export async function resolveManagedMembershipPlan(
  tier: MembershipTier,
  billingVariant: "standard" | "founding",
  billingInterval: "monthly" | "annual"
): Promise<ManagedMembershipPlan> {
  await ensureBillingCatalogSeeded();

  const product = await db.billingProduct.findFirst({
    where: {
      membershipTier: tier
    },
    include: {
      prices: {
        orderBy: [{ active: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!product) {
    return fallbackManagedMembershipPlan(tier, billingVariant, billingInterval);
  }

  const selectedInterval = membershipIntervalToBillingInterval(billingInterval);
  const selectedFounderFlag = founderVariantFlag(billingVariant);
  const selected = findMatchingBillingPrice({
    prices: product.prices,
    interval: selectedInterval,
    isFounderPrice: selectedFounderFlag
  });
  const monthly = findMatchingBillingPrice({
    prices: product.prices,
    interval: BillingInterval.MONTH,
    isFounderPrice: selectedFounderFlag
  });
  const annual = findMatchingBillingPrice({
    prices: product.prices,
    interval: BillingInterval.YEAR,
    isFounderPrice: selectedFounderFlag
  });

  if (!selected || !selected.stripePriceId) {
    return fallbackManagedMembershipPlan(tier, billingVariant, billingInterval);
  }

  const fallback = fallbackManagedMembershipPlan(tier, billingVariant, billingInterval);
  const selectedAmount = toMajorUnitsFromMinor(selected.amount);
  const monthlyAmount = monthly ? toMajorUnitsFromMinor(monthly.amount) : fallback.checkoutPrice;
  const annualAmount = annual ? toMajorUnitsFromMinor(annual.amount) : fallback.checkoutPrice;

  return {
    tier,
    billingVariant,
    billingInterval,
    amountMinor: selected.amount,
    checkoutPrice: selectedAmount,
    monthlyEquivalentPrice:
      billingInterval === "annual" ? annualAmount / 12 : monthlyAmount,
    stripePriceId: selected.stripePriceId,
    planKey: getMembershipPlanKey(tier, billingVariant, billingInterval)
  };
}

export async function resolveManagedMembershipPlanFromStripePriceId(
  priceId: string | null | undefined
): Promise<ManagedMembershipPlan> {
  if (!priceId) {
    return fallbackManagedMembershipPlan(MembershipTier.FOUNDATION, "standard", "monthly");
  }

  await ensureBillingCatalogSeeded();

  const row = await db.billingPrice.findFirst({
    where: {
      stripePriceId: priceId
    },
    include: {
      product: {
        include: {
          prices: {
            orderBy: [{ active: "desc" }, { createdAt: "desc" }]
          }
        }
      }
    }
  });

  if (!row?.product.membershipTier) {
    const fallback = resolveMembershipPriceFromStripePriceId(priceId);
    return {
      tier: fallback.tier,
      billingVariant: fallback.billingVariant,
      billingInterval: fallback.billingInterval,
      amountMinor: toMinorUnitsFromMajor(fallback.checkoutPrice),
      checkoutPrice: fallback.checkoutPrice,
      monthlyEquivalentPrice: fallback.monthlyEquivalentPrice,
      stripePriceId: fallback.stripePriceId,
      planKey: fallback.planKey
    };
  }

  const billingVariant = row.isFounderPrice ? "founding" : "standard";
  const billingInterval = billingIntervalToMembershipInterval(row.interval);
  const annual = findMatchingBillingPrice({
    prices: row.product.prices,
    interval: BillingInterval.YEAR,
    isFounderPrice: row.isFounderPrice
  });
  const checkoutPrice = toMajorUnitsFromMinor(row.amount);
  const annualAmount = annual ? toMajorUnitsFromMinor(annual.amount) : checkoutPrice;

  return {
    tier: row.product.membershipTier,
    billingVariant,
    billingInterval,
    amountMinor: row.amount,
    checkoutPrice,
    monthlyEquivalentPrice:
      billingInterval === "annual" ? annualAmount / 12 : checkoutPrice,
    stripePriceId: row.stripePriceId ?? priceId,
    planKey: getMembershipPlanKey(row.product.membershipTier, billingVariant, billingInterval)
  };
}

export async function resolveManagedMembershipTierFromStripePriceId(
  priceId: string | null | undefined
) {
  const plan = await resolveManagedMembershipPlanFromStripePriceId(priceId);
  return plan.tier;
}

async function updateLinkedFounderServiceFromCatalog(
  client: BillingClient,
  productId: string
) {
  const product = await client.billingProduct.findUnique({
    where: {
      id: productId
    },
    include: {
      prices: {
        where: {
          active: true
        },
        orderBy: [{ createdAt: "desc" }]
      }
    }
  });

  if (!product?.founderServiceId) {
    return;
  }

  const activePrice = product.prices[0] ?? null;
  if (!activePrice) {
    return;
  }

  await client.founderService.update({
    where: {
      id: product.founderServiceId
    },
    data: {
      price: activePrice.amount,
      currency: activePrice.currency.toUpperCase(),
      billingType: founderServiceBillingTypeFromPrice(activePrice.billingType),
      stripeProductId: product.stripeProductId ?? undefined,
      stripePriceId: activePrice.stripePriceId ?? undefined
    }
  });
}

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase() || DEFAULT_CURRENCY;
}

export async function upsertBillingProduct(input: UpsertBillingProductInput) {
  await ensureBillingCatalogSeeded();

  const payload = {
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    active: input.active,
    membershipTier: input.membershipTier ?? null,
    founderServiceId: input.founderServiceId ?? null,
    syncStatus: BillingSyncStatus.MISSING,
    syncError: null
  } satisfies Prisma.BillingProductUncheckedUpdateInput;

  if (input.productId) {
    return db.billingProduct.update({
      where: {
        id: input.productId
      },
      data: payload
    });
  }

  const baseSlug = slugify(input.name);
  let slug = baseSlug;
  let counter = 1;
  while (
    await db.billingProduct.findUnique({
      where: {
        slug
      },
      select: {
        id: true
      }
    })
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return db.billingProduct.create({
    data: {
      slug,
      ...payload
    }
  });
}

function priceDefinitionChanged(
  existing: {
    amount: number;
    currency: string;
    billingType: BillingPriceBillingType;
    interval: BillingInterval | null;
    isFounderPrice: boolean;
    name: string;
  },
  input: UpsertBillingPriceInput
) {
  return (
    existing.amount !== input.amount ||
    normalizeCurrency(existing.currency) !== normalizeCurrency(input.currency) ||
    existing.billingType !== input.billingType ||
    (existing.interval ?? null) !== (input.interval ?? null) ||
    existing.isFounderPrice !== input.isFounderPrice ||
    existing.name !== input.name.trim()
  );
}

export async function upsertBillingPrice(input: UpsertBillingPriceInput) {
  await ensureBillingCatalogSeeded();

  return db.$transaction(async (tx) => {
    const product = await tx.billingProduct.findUnique({
      where: {
        id: input.productId
      },
      select: {
        id: true
      }
    });

    if (!product) {
      throw new Error("product-not-found");
    }

    const payload = {
      name: input.name.trim(),
      amount: Math.max(0, input.amount),
      currency: normalizeCurrency(input.currency),
      billingType: input.billingType,
      interval:
        input.billingType === BillingPriceBillingType.ONE_TIME
          ? null
          : input.interval ?? BillingInterval.MONTH,
      isFounderPrice: input.isFounderPrice,
      active: input.active,
      syncStatus: BillingSyncStatus.MISSING,
      syncError: null
    };

    if (!input.priceId) {
      if (payload.active) {
        await tx.billingPrice.updateMany({
          where: {
            productId: product.id,
            name: payload.name,
            interval: payload.interval,
            isFounderPrice: payload.isFounderPrice,
            active: true
          },
          data: {
            active: false,
            syncStatus: BillingSyncStatus.MISSING,
            syncError: null
          }
        });
      }

      const created = await tx.billingPrice.create({
        data: {
          productId: product.id,
          ...payload
        }
      });
      await updateLinkedFounderServiceFromCatalog(tx, product.id);
      return created;
    }

    const existing = await tx.billingPrice.findUnique({
      where: {
        id: input.priceId
      }
    });

    if (!existing) {
      throw new Error("price-not-found");
    }

    const definitionChanged = priceDefinitionChanged(existing, input);

    if (!definitionChanged || !existing.stripePriceId) {
      const updated = await tx.billingPrice.update({
        where: {
          id: existing.id
        },
        data: payload
      });
      await updateLinkedFounderServiceFromCatalog(tx, product.id);
      return updated;
    }

    if (payload.active) {
      await tx.billingPrice.updateMany({
        where: {
          productId: product.id,
          name: payload.name,
          interval: payload.interval,
          isFounderPrice: payload.isFounderPrice,
          active: true
        },
        data: {
          active: false,
          syncStatus: BillingSyncStatus.MISSING,
          syncError: null
        }
      });
    }

    await tx.billingPrice.update({
      where: {
        id: existing.id
      },
      data: {
        active: false,
        syncStatus: BillingSyncStatus.MISSING,
        syncError: null
      }
    });

    const created = await tx.billingPrice.create({
      data: {
        productId: product.id,
        ...payload
      }
    });
    await updateLinkedFounderServiceFromCatalog(tx, product.id);
    return created;
  });
}

function stripePromotionExpiry(value: Date | null | undefined) {
  return value ? Math.floor(value.getTime() / 1000) : undefined;
}

export async function createBillingDiscountWithStripe(input: CreateBillingDiscountInput) {
  await ensureBillingCatalogSeeded();

  const stripe = requireStripeClient();
  const specificProduct = input.specificProductId
    ? await db.billingProduct.findUnique({
        where: {
          id: input.specificProductId
        },
        select: {
          id: true,
          stripeProductId: true
        }
      })
    : null;

  if (input.specificProductId && !specificProduct?.stripeProductId) {
    await syncBillingCatalogWithStripe({
      productIds: [input.specificProductId]
    });
  }

  const refreshedSpecificProduct =
    input.specificProductId && !specificProduct?.stripeProductId
      ? await db.billingProduct.findUnique({
          where: {
            id: input.specificProductId
          },
          select: {
            stripeProductId: true
          }
        })
      : specificProduct;

  const coupon = await stripe.coupons.create({
    duration: "forever",
    percent_off: input.type === BillingDiscountType.PERCENTAGE ? input.value : undefined,
    amount_off: input.type === BillingDiscountType.FIXED ? input.value : undefined,
    currency: input.type === BillingDiscountType.FIXED ? DEFAULT_CURRENCY.toLowerCase() : undefined,
    name: input.name?.trim() || input.code.trim().toUpperCase(),
    applies_to:
      input.appliesTo === BillingDiscountAppliesTo.SPECIFIC_PRODUCT &&
      refreshedSpecificProduct?.stripeProductId
        ? {
            products: [refreshedSpecificProduct.stripeProductId]
          }
        : undefined,
    metadata: {
      code: input.code.trim().toUpperCase(),
      appliesTo: input.appliesTo,
      tag: input.tag ?? BillingDiscountTag.MANUAL
    }
  });

  const promotionCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: input.code.trim().toUpperCase(),
    active: input.active ?? true,
    max_redemptions: input.usageLimit ?? undefined,
    expires_at: stripePromotionExpiry(input.expiresAt)
  });

  return db.billingDiscount.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name?.trim() || null,
      type: input.type,
      value: input.value,
      appliesTo: input.appliesTo,
      specificProductId: input.specificProductId ?? null,
      usageLimit: input.usageLimit ?? null,
      expiresAt: input.expiresAt ?? null,
      active: input.active ?? true,
      tag: input.tag ?? BillingDiscountTag.MANUAL,
      stripeCouponId: coupon.id,
      stripePromotionCodeId: promotionCode.id
    }
  });
}

export async function updateBillingDiscountActiveState(input: {
  discountId: string;
  active: boolean;
}) {
  const discount = await db.billingDiscount.findUnique({
    where: {
      id: input.discountId
    }
  });

  if (!discount) {
    throw new Error("discount-not-found");
  }

  if (discount.stripePromotionCodeId) {
    const stripe = requireStripeClient();
    await stripe.promotionCodes.update(discount.stripePromotionCodeId, {
      active: input.active
    });
  }

  return db.billingDiscount.update({
    where: {
      id: input.discountId
    },
    data: {
      active: input.active
    }
  });
}

export async function updateFounderControl(input: UpdateFounderControlInput) {
  await ensureBillingCatalogSeeded();

  const limit = Math.max(0, input.founderLimit);

  return db.$transaction(async (tx) => {
    const product = await tx.billingProduct.findUnique({
      where: {
        id: input.productId
      },
      select: {
        id: true,
        membershipTier: true
      }
    });

    if (!product?.membershipTier) {
      throw new Error("founder-control-not-supported");
    }

    const existing = await getOrCreateFoundingSettingsRow(tx);
    const claimed =
      product.membershipTier === MembershipTier.CORE
        ? existing.coreClaimed
        : product.membershipTier === MembershipTier.INNER_CIRCLE
          ? existing.innerCircleClaimed
          : existing.foundationClaimed;

    if (claimed > limit) {
      throw new Error("founding-limit-below-claimed");
    }

    await tx.foundingOfferSettings.update({
      where: {
        id: existing.id
      },
      data:
        product.membershipTier === MembershipTier.CORE
          ? {
              coreLimit: limit,
              coreEnabled: input.active
            }
          : product.membershipTier === MembershipTier.INNER_CIRCLE
            ? {
                innerCircleLimit: limit,
                innerCircleEnabled: input.active
              }
            : {
                foundationLimit: limit,
                foundationEnabled: input.active
              }
    });

    await syncFounderSettingsFromLaunchState(tx);

    return tx.founderSettings.findUnique({
      where: {
        productId: product.id
      }
    });
  });
}

function buildStripeProductMetadata(product: {
  id: string;
  slug: string;
  category: BillingProductCategory;
  membershipTier: MembershipTier | null;
  founderService: {
    slug: string;
  } | null;
}) {
  return {
    billingProductId: product.id,
    billingProductSlug: product.slug,
    billingProductCategory: product.category,
    membershipTier: product.membershipTier ?? "",
    founderServiceSlug: product.founderService?.slug ?? ""
  };
}

function buildStripePriceMetadata(input: {
  productId: string;
  priceId: string;
  name: string;
  membershipTier: MembershipTier | null;
  founderServiceSlug: string | null;
}) {
  return {
    billingProductId: input.productId,
    billingPriceId: input.priceId,
    billingPriceName: input.name,
    membershipTier: input.membershipTier ?? "",
    founderServiceSlug: input.founderServiceSlug ?? ""
  };
}

function stripeObjectId(
  value: string | Stripe.Product | Stripe.Price | Stripe.DeletedProduct | null | undefined
) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return "id" in value ? value.id : null;
}

async function resolveProductIdFromExistingStripePrice(
  stripe: Stripe,
  prices: Array<{ stripePriceId: string | null }>
) {
  for (const price of prices) {
    if (!price.stripePriceId) {
      continue;
    }

    try {
      const stripePrice = await stripe.prices.retrieve(price.stripePriceId);
      return stripeObjectId(stripePrice.product);
    } catch {
      continue;
    }
  }

  return null;
}

function expectedStripeInterval(input: {
  billingType: BillingPriceBillingType;
  interval: BillingInterval | null;
}) {
  if (input.billingType !== BillingPriceBillingType.RECURRING) {
    return null;
  }

  return input.interval === BillingInterval.YEAR ? "year" : "month";
}

async function syncSingleBillingPrice(input: {
  stripe: Stripe;
  product: {
    id: string;
    membershipTier: MembershipTier | null;
    founderService: { slug: string } | null;
  };
  stripeProductId: string;
  price: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    billingType: BillingPriceBillingType;
    interval: BillingInterval | null;
    active: boolean;
    stripePriceId: string | null;
  };
}) {
  const { stripe, product, stripeProductId, price } = input;

  let existingStripePrice: Stripe.Price | null = null;
  if (price.stripePriceId) {
    try {
      existingStripePrice = await stripe.prices.retrieve(price.stripePriceId);
    } catch {
      existingStripePrice = null;
    }
  }

  if (!price.active) {
    if (existingStripePrice?.active) {
      await stripe.prices.update(existingStripePrice.id, { active: false });
    }

    await db.billingPrice.update({
      where: {
        id: price.id
      },
      data: {
        syncStatus: BillingSyncStatus.SYNCED,
        syncError: null
      }
    });

    return price.stripePriceId;
  }

  const expectedInterval = expectedStripeInterval({
    billingType: price.billingType,
    interval: price.interval
  });
  const existingProductId = stripeObjectId(existingStripePrice?.product);
  const canReuse =
    existingStripePrice &&
    existingStripePrice.active &&
    existingStripePrice.unit_amount === price.amount &&
    existingStripePrice.currency.toUpperCase() === normalizeCurrency(price.currency) &&
    existingProductId === stripeProductId &&
    (existingStripePrice.recurring?.interval ?? null) === expectedInterval;

  if (canReuse) {
    await db.billingPrice.update({
      where: {
        id: price.id
      },
      data: {
        syncStatus: BillingSyncStatus.SYNCED,
        syncError: null
      }
    });

    return existingStripePrice?.id ?? price.stripePriceId;
  }

  if (existingStripePrice?.active) {
    await stripe.prices.update(existingStripePrice.id, {
      active: false
    });
  }

  const createdPrice = await stripe.prices.create({
    currency: normalizeCurrency(price.currency).toLowerCase(),
    unit_amount: price.amount,
    product: stripeProductId,
    recurring: expectedInterval
      ? {
          interval: expectedInterval
        }
      : undefined,
    metadata: buildStripePriceMetadata({
      productId: product.id,
      priceId: price.id,
      name: price.name,
      membershipTier: product.membershipTier,
      founderServiceSlug: product.founderService?.slug ?? null
    })
  });

  await db.billingPrice.update({
    where: {
      id: price.id
    },
    data: {
      stripePriceId: createdPrice.id,
      syncStatus: BillingSyncStatus.SYNCED,
      syncError: null
    }
  });

  return createdPrice.id;
}

export async function syncBillingCatalogWithStripe(options?: { productIds?: string[] }) {
  await ensureBillingCatalogSeeded();

  const stripe = requireStripeClient();
  const products = await db.billingProduct.findMany({
    where: options?.productIds?.length
      ? {
          id: {
            in: options.productIds
          }
        }
      : undefined,
    include: {
      founderService: {
        select: {
          slug: true
        }
      },
      prices: {
        orderBy: [{ active: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  const synced: Array<{
    id: string;
    name: string;
    stripeProductId: string | null;
  }> = [];

  for (const product of products) {
    try {
      const derivedStripeProductId =
        product.stripeProductId ??
        (await resolveProductIdFromExistingStripePrice(stripe, product.prices));
      const stripeProduct = derivedStripeProductId
        ? await stripe.products
            .update(derivedStripeProductId, {
              name: product.name,
              description: product.description || undefined,
              active: product.active,
              metadata: buildStripeProductMetadata(product)
            })
            .catch(() =>
              stripe.products.create({
                name: product.name,
                description: product.description || undefined,
                active: product.active,
                metadata: buildStripeProductMetadata(product)
              })
            )
        : await stripe.products.create({
            name: product.name,
            description: product.description || undefined,
            active: product.active,
            metadata: buildStripeProductMetadata(product)
          });

      await db.billingProduct.update({
        where: {
          id: product.id
        },
        data: {
          stripeProductId: stripeProduct.id,
          syncStatus: BillingSyncStatus.SYNCED,
          syncError: null
        }
      });

      for (const price of product.prices) {
        try {
          await syncSingleBillingPrice({
            stripe,
            product,
            stripeProductId: stripeProduct.id,
            price
          });
        } catch (error) {
          await db.billingPrice.update({
            where: {
              id: price.id
            },
            data: {
              syncStatus: BillingSyncStatus.ERROR,
              syncError: error instanceof Error ? error.message : "Unable to sync Stripe price."
            }
          });
        }
      }

      await updateLinkedFounderServiceFromCatalog(db, product.id);

      synced.push({
        id: product.id,
        name: product.name,
        stripeProductId: stripeProduct.id
      });
    } catch (error) {
      await db.billingProduct.update({
        where: {
          id: product.id
        },
        data: {
          syncStatus: BillingSyncStatus.ERROR,
          syncError: error instanceof Error ? error.message : "Unable to sync Stripe product."
        }
      });
    }
  }

  return synced;
}
