"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  HOME_FAQ_COUNT,
  HOME_PROOF_ITEM_COUNT,
  MEMBERSHIP_FAQ_COUNT,
  SITE_CONTENT_REVALIDATION_PATHS,
  SITE_CONTENT_TITLES,
  siteContentSchemas,
  type SiteContentSlug,
  type SiteContentValueMap
} from "@/config/site-content";
import { safeRedirectPath } from "@/lib/auth/utils";
import { CACHE_TAGS, siteContentTag } from "@/lib/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const returnPathSchema = z.object({
  returnPath: z.string().optional()
});

const homeFormSchema = siteContentSchemas.home.extend({
  returnPath: z.string().optional()
});

const aboutFormSchema = siteContentSchemas.about.extend({
  returnPath: z.string().optional()
});

const membershipFormSchema = siteContentSchemas.membership.extend({
  returnPath: z.string().optional()
});

const footerFormSchema = siteContentSchemas.footer.extend({
  returnPath: z.string().optional()
});

function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) || "");
}

function getHomeProofItems(formData: FormData) {
  return Array.from({ length: HOME_PROOF_ITEM_COUNT }, (_, index) => ({
    eyebrow: getFormValue(formData, `proofItems.${index}.eyebrow`),
    title: getFormValue(formData, `proofItems.${index}.title`),
    description: getFormValue(formData, `proofItems.${index}.description`)
  }));
}

function getFaqItems(formData: FormData, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    question: getFormValue(formData, `faqs.${index}.question`),
    answer: getFormValue(formData, `faqs.${index}.answer`)
  }));
}

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined, fallback: string): string {
  return safeRedirectPath(value, fallback);
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

async function persistSiteContent<K extends SiteContentSlug>(
  slug: K,
  sections: SiteContentValueMap[K]
) {
  await db.siteContent.upsert({
    where: { slug },
    create: {
      slug,
      title: SITE_CONTENT_TITLES[slug],
      sections: sections as Prisma.InputJsonValue
    },
    update: {
      title: SITE_CONTENT_TITLES[slug],
      sections: sections as Prisma.InputJsonValue
    }
  });
}

function revalidateSiteContentSurface(slug: SiteContentSlug) {
  revalidateTag(CACHE_TAGS.siteContent);
  revalidateTag(siteContentTag(slug));
  revalidatePath("/admin/site-content");
  revalidatePath("/admin/content");
  for (const path of SITE_CONTENT_REVALIDATION_PATHS[slug]) {
    revalidatePath(path);
  }
}

function resolveReturnPathFromFormData(formData: FormData) {
  const parsedReturnPath = returnPathSchema.safeParse({
    returnPath: String(formData.get("returnPath") || "")
  });

  return resolveReturnPath(
    parsedReturnPath.success ? parsedReturnPath.data.returnPath : undefined,
    "/admin/site-content"
  );
}

export async function updateHomeSiteContentAction(formData: FormData) {
  await requireAdmin();
  const returnPath = resolveReturnPathFromFormData(formData);

  const parsed = homeFormSchema.safeParse({
    returnPath: getFormValue(formData, "returnPath"),
    heroSupportLine: getFormValue(formData, "heroSupportLine"),
    heroTitle: getFormValue(formData, "heroTitle"),
    heroSubtitle: getFormValue(formData, "heroSubtitle"),
    whyTitle: getFormValue(formData, "whyTitle"),
    whyDescription: getFormValue(formData, "whyDescription"),
    vibeTitle: getFormValue(formData, "vibeTitle"),
    vibeDescription: getFormValue(formData, "vibeDescription"),
    audienceTitle: getFormValue(formData, "audienceTitle"),
    audienceDescription: getFormValue(formData, "audienceDescription"),
    benefitsTitle: getFormValue(formData, "benefitsTitle"),
    benefitsDescription: getFormValue(formData, "benefitsDescription"),
    differenceTitle: getFormValue(formData, "differenceTitle"),
    differenceDescription: getFormValue(formData, "differenceDescription"),
    proofTitle: getFormValue(formData, "proofTitle"),
    proofDescription: getFormValue(formData, "proofDescription"),
    proofItems: getHomeProofItems(formData),
    faqTitle: getFormValue(formData, "faqTitle"),
    faqDescription: getFormValue(formData, "faqDescription"),
    faqs: getFaqItems(formData, HOME_FAQ_COUNT),
    ctaTitle: getFormValue(formData, "ctaTitle"),
    ctaDescription: getFormValue(formData, "ctaDescription")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-home");
  }

  await persistSiteContent("home", {
    heroSupportLine: parsed.data.heroSupportLine,
    heroTitle: parsed.data.heroTitle,
    heroSubtitle: parsed.data.heroSubtitle,
    whyTitle: parsed.data.whyTitle,
    whyDescription: parsed.data.whyDescription,
    vibeTitle: parsed.data.vibeTitle,
    vibeDescription: parsed.data.vibeDescription,
    audienceTitle: parsed.data.audienceTitle,
    audienceDescription: parsed.data.audienceDescription,
    benefitsTitle: parsed.data.benefitsTitle,
    benefitsDescription: parsed.data.benefitsDescription,
    differenceTitle: parsed.data.differenceTitle,
    differenceDescription: parsed.data.differenceDescription,
    proofTitle: parsed.data.proofTitle,
    proofDescription: parsed.data.proofDescription,
    proofItems: parsed.data.proofItems,
    faqTitle: parsed.data.faqTitle,
    faqDescription: parsed.data.faqDescription,
    faqs: parsed.data.faqs,
    ctaTitle: parsed.data.ctaTitle,
    ctaDescription: parsed.data.ctaDescription
  });

  revalidateSiteContentSurface("home");
  redirectWithNotice(returnPath, "home-saved");
}

export async function updateAboutSiteContentAction(formData: FormData) {
  await requireAdmin();
  const returnPath = resolveReturnPathFromFormData(formData);

  const parsed = aboutFormSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    intro: String(formData.get("intro") || "")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-about");
  }

  await persistSiteContent("about", {
    intro: parsed.data.intro
  });

  revalidateSiteContentSurface("about");
  redirectWithNotice(returnPath, "about-saved");
}

export async function updateMembershipSiteContentAction(formData: FormData) {
  await requireAdmin();
  const returnPath = resolveReturnPathFromFormData(formData);

  const parsed = membershipFormSchema.safeParse({
    returnPath: getFormValue(formData, "returnPath"),
    intro: getFormValue(formData, "intro"),
    standardCopy: getFormValue(formData, "standardCopy"),
    innerCircleCopy: getFormValue(formData, "innerCircleCopy"),
    standard: {
      whoItsFor: getFormValue(formData, "standard.whoItsFor"),
      outcomes: getFormValue(formData, "standard.outcomes"),
      whyChoose: getFormValue(formData, "standard.whyChoose")
    },
    innerCircle: {
      whoItsFor: getFormValue(formData, "innerCircle.whoItsFor"),
      outcomes: getFormValue(formData, "innerCircle.outcomes"),
      whyChoose: getFormValue(formData, "innerCircle.whyChoose")
    },
    comparisonTitle: getFormValue(formData, "comparisonTitle"),
    comparisonDescription: getFormValue(formData, "comparisonDescription"),
    faqTitle: getFormValue(formData, "faqTitle"),
    faqDescription: getFormValue(formData, "faqDescription"),
    faqs: getFaqItems(formData, MEMBERSHIP_FAQ_COUNT),
    ctaTitle: getFormValue(formData, "ctaTitle"),
    ctaDescription: getFormValue(formData, "ctaDescription")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-membership");
  }

  await persistSiteContent("membership", {
    intro: parsed.data.intro,
    standardCopy: parsed.data.standardCopy,
    innerCircleCopy: parsed.data.innerCircleCopy,
    standard: parsed.data.standard,
    innerCircle: parsed.data.innerCircle,
    comparisonTitle: parsed.data.comparisonTitle,
    comparisonDescription: parsed.data.comparisonDescription,
    faqTitle: parsed.data.faqTitle,
    faqDescription: parsed.data.faqDescription,
    faqs: parsed.data.faqs,
    ctaTitle: parsed.data.ctaTitle,
    ctaDescription: parsed.data.ctaDescription
  });

  revalidateSiteContentSurface("membership");
  redirectWithNotice(returnPath, "membership-saved");
}

export async function updateFooterSiteContentAction(formData: FormData) {
  await requireAdmin();
  const returnPath = resolveReturnPathFromFormData(formData);

  const parsed = footerFormSchema.safeParse({
    returnPath: getFormValue(formData, "returnPath"),
    brandBlurb: getFormValue(formData, "brandBlurb"),
    supportEmail: getFormValue(formData, "supportEmail"),
    supportLine: getFormValue(formData, "supportLine"),
    trustLine: getFormValue(formData, "trustLine"),
    founderLine: getFormValue(formData, "founderLine"),
    bottomLine: getFormValue(formData, "bottomLine")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-footer");
  }

  await persistSiteContent("footer", {
    brandBlurb: parsed.data.brandBlurb,
    supportEmail: parsed.data.supportEmail,
    supportLine: parsed.data.supportLine,
    trustLine: parsed.data.trustLine,
    founderLine: parsed.data.founderLine,
    bottomLine: parsed.data.bottomLine
  });

  revalidateSiteContentSurface("footer");
  redirectWithNotice(returnPath, "footer-saved");
}
