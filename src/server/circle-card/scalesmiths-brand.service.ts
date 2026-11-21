import { Prisma, type CircleCardScaleSmithsBrandTemplate } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { normalizeSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { prisma } from "@/lib/prisma";

const DEFAULT_BRAND = {
  businessName: "ScaleSmiths",
  tagline: "Forge Your Digital Edge",
  businessLogoUrl: null as string | null,
  websiteUrl: "https://scalesmiths.co.uk" as string | null
};

export type ScaleSmithsBrandFields = Pick<
  CircleCardScaleSmithsBrandTemplate,
  "businessName" | "tagline" | "businessLogoUrl" | "websiteUrl"
>;

export async function getScaleSmithsBrandForDb(tx: Prisma.TransactionClient): Promise<ScaleSmithsBrandFields> {
  const existing = await tx.circleCardScaleSmithsBrandTemplate.findUnique({
    where: { id: "main" }
  });
  return existing ? {
    businessName: existing.businessName,
    tagline: existing.tagline,
    businessLogoUrl: existing.businessLogoUrl,
    websiteUrl: existing.websiteUrl
  } : DEFAULT_BRAND;
}

function validateHttpsSite(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.toString().length > 2048) throw new Error("Unsafe brand website URL");
    return url.toString();
  } catch {
    throw new Error("Enter an HTTPS website without embedded credentials");
  }
}

export async function updateScaleSmithsBrandTemplate(input: {
  adminUserId: string;
  tagline: string;
  businessLogoUrl: string | null;
  websiteUrl: string | null;
}) {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") {
    throw new Error("ScaleSmiths template editing disabled");
  }
  const tagline = input.tagline.trim();
  if (!tagline || tagline.length > 180) throw new Error("Brand tagline must contain 1-180 characters");

  const logo = input.businessLogoUrl?.trim() || null;
  const validatedLogo = logo ? normalizeSafeCircleCardImageUrl(logo) : null;
  if (logo && !validatedLogo) throw new Error("Logo must be an approved, secure image asset");
  const websiteUrl = validateHttpsSite(input.websiteUrl?.trim() || null);

  const admin = await prisma.user.findUnique({
    where: { id: input.adminUserId },
    select: { role: true, suspended: true }
  });
  if (admin?.role !== "ADMIN" || admin.suspended) throw new Error("Admin permission required");

  const result = await prisma.$transaction(async (tx) => {
    const template = await tx.circleCardScaleSmithsBrandTemplate.upsert({
      where: { id: "main" },
      create: {
        id: "main", businessName: DEFAULT_BRAND.businessName,
        tagline, businessLogoUrl: validatedLogo, websiteUrl,
        lastEditedById: input.adminUserId
      },
      update: {
        tagline, businessLogoUrl: validatedLogo, websiteUrl,
        version: { increment: 1 }, lastEditedById: input.adminUserId
      },
      select: { version: true }
    });
    const membershipCards = await tx.circleCardScaleSmithsPartner.findMany({
      where: { partnerCardId: { not: null } },
      select: { partnerCardId: true }
    });
    const cardIds = membershipCards.map((entry) => entry.partnerCardId).filter((id): id is string => Boolean(id));
    const cards = cardIds.length ? await tx.circleCard.findMany({
      where: { id: { in: cardIds } },
      select: { slug: true }
    }) : [];
    const updated = cardIds.length ? await tx.circleCard.updateMany({
      where: { id: { in: cardIds } },
      data: {
        businessName: DEFAULT_BRAND.businessName,
        tagline,
        businessLogoUrl: validatedLogo,
        websiteUrl
      }
    }) : { count: 0 };
    return { version: template.version, updatedCards: updated.count, slugs: cards.map((card) => card.slug) };
  });

  for (const slug of result.slugs) revalidatePath(`/card/${slug}`);
  revalidatePath("/dashboard/circle-card/scalesmiths");
  return { version: result.version, updatedCards: result.updatedCards };
}
