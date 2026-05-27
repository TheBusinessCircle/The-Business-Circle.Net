"use server";

import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType,
  TestimonialSource,
  TestimonialStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin, requireUser } from "@/lib/session";
import {
  approveTestimonial,
  archiveTestimonial,
  createExternalTestimonial,
  createExternalTestimonialRequest,
  createMemberTestimonial,
  markGoogleReviewConfirmed,
  markGoogleReviewIntent,
  markTestimonialCopiedToGoogle,
  rejectTestimonial,
  sendTestimonialRequestEmail,
  toggleTestimonialHighlight,
  updateReviewSettings,
  updateAdminTestimonial
} from "@/server/testimonials";

const checkboxBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean()
);

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalUrl = z.string().trim().url().max(2048).optional().or(z.literal(""));
const requiredText = (min: number, max: number) => z.string().trim().min(min).max(max);
const modernEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const optionalModernEmail = z
  .string()
  .trim()
  .max(320)
  .refine((value) => !value || modernEmailPattern.test(value), {
    message: "Enter a valid email address."
  })
  .optional()
  .or(z.literal(""));
const requiredModernEmail = z.string().trim().min(3).max(320).refine(
  (value) => modernEmailPattern.test(value),
  {
    message: "Enter a valid email address."
  }
);
const optionalUrlAllowEmpty = z.string().trim().max(2048).refine((value) => {
  if (!value) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
});
const optionalRating = z.preprocess((value) => {
  const raw = String(value ?? "").trim();
  return raw ? Number(raw) : null;
}, z.number().int().min(1).max(5).nullable());
const testimonialCategoryInput = z.preprocess((value) => {
  const raw = String(value ?? "").trim();
  return raw || TestimonialCategory.BCN_EXPERIENCE;
}, z.nativeEnum(TestimonialCategory));
const testimonialDisplayLocationInput = z.preprocess((value) => {
  const raw = String(value ?? "").trim();
  return raw || TestimonialDisplayLocation.ANYWHERE;
}, z.nativeEnum(TestimonialDisplayLocation));

const memberTestimonialSchema = z.object({
  returnPath: optionalText(240),
  quote: z.string().trim().min(20).max(1200),
  outcome: optionalText(500),
  category: testimonialCategoryInput,
  displayLocation: testimonialDisplayLocationInput,
  rating: optionalRating,
  submittedByName: optionalText(120),
  submittedByCompany: requiredText(2, 160),
  submittedByRole: optionalText(140),
  submittedByWebsite: optionalUrl,
  submittedByLinkedIn: optionalUrl,
  permissionToFeaturePublicly: checkboxBoolean.refine(Boolean),
  permissionToUseName: checkboxBoolean.optional().default(false),
  permissionToUseCompany: checkboxBoolean.optional().default(false),
  permissionToUseImage: checkboxBoolean.optional().default(false),
  permissionToUseInMarketing: checkboxBoolean.optional().default(false)
});

const externalTestimonialSchema = z.object({
  requestToken: z.string().trim().max(128).optional().or(z.literal("")),
  returnPath: optionalText(240),
  authorName: optionalText(120),
  authorRole: optionalText(120),
  businessName: requiredText(2, 140),
  businessWebsite: optionalUrl,
  submittedByLinkedIn: optionalUrl,
  quote: z.string().trim().min(20).max(1600),
  outcome: optionalText(600),
  submittedEmail: optionalModernEmail,
  category: testimonialCategoryInput,
  displayLocation: testimonialDisplayLocationInput,
  rating: optionalRating,
  permissionToFeaturePublicly: checkboxBoolean.optional().default(false),
  permissionToUseName: checkboxBoolean.optional().default(false),
  permissionToUseCompany: checkboxBoolean.optional().default(false),
  permissionToUseImage: checkboxBoolean.optional().default(false),
  permissionToUseInMarketing: checkboxBoolean.optional().default(false),
  allowDisplayName: checkboxBoolean.optional().default(false),
  allowDisplayCompany: checkboxBoolean.optional().default(false),
  allowDisplayRole: checkboxBoolean.optional().default(false),
  allowDisplayTestimonial: checkboxBoolean.refine(Boolean),
  allowMarketingUse: checkboxBoolean.optional().default(false),
  website: z.string().trim().max(0).optional().or(z.literal("")),
  source: optionalText(80),
  campaign: optionalText(120),
  ref: optionalText(120)
});

const adminUpdateSchema = z.object({
  testimonialId: z.string().cuid(),
  returnPath: z.string().optional(),
  quote: z.string().trim().min(1).max(1800),
  authorName: z.string().trim().min(1).max(140),
  authorRole: optionalText(140),
  businessName: optionalText(160),
  businessWebsite: optionalUrl,
  outcome: optionalText(800),
  proofType: z.nativeEnum(TestimonialProofType),
  category: z.nativeEnum(TestimonialCategory),
  displayLocation: z.nativeEnum(TestimonialDisplayLocation),
  status: z.nativeEnum(TestimonialStatus),
  permissionToDisplay: checkboxBoolean.optional().default(false),
  permissionToFeaturePublicly: checkboxBoolean.optional().default(false),
  permissionToUseName: checkboxBoolean.optional().default(false),
  permissionToUseCompany: checkboxBoolean.optional().default(false),
  permissionToUseImage: checkboxBoolean.optional().default(false),
  permissionToUseInMarketing: checkboxBoolean.optional().default(false),
  allowDisplayName: checkboxBoolean.optional().default(false),
  allowDisplayCompany: checkboxBoolean.optional().default(false),
  allowDisplayRole: checkboxBoolean.optional().default(false),
  allowDisplayTestimonial: checkboxBoolean.optional().default(false),
  allowMarketingUse: checkboxBoolean.optional().default(false),
  displayPublicName: checkboxBoolean.optional().default(false),
  displayBusinessName: checkboxBoolean.optional().default(false),
  displayProfileImage: checkboxBoolean.optional().default(false),
  isHighlighted: checkboxBoolean.optional().default(false),
  rating: optionalRating,
  adminNotes: optionalText(1600),
  rejectionReason: optionalText(800)
});

const adminStatusSchema = z.object({
  testimonialId: z.string().cuid(),
  returnPath: z.string().optional()
});

const adminBooleanSchema = adminStatusSchema.extend({
  enabled: checkboxBoolean.optional().default(false)
});

const reviewSettingsSchema = z.object({
  returnPath: z.string().optional(),
  googleReviewUrl: optionalUrlAllowEmpty,
  googleReviewEnabled: checkboxBoolean.optional().default(false),
  showGoogleReviewButton: checkboxBoolean.optional().default(false),
  googleReviewButtonLabel: z.string().trim().min(2).max(80),
  googleReviewPendingMessage: z.string().trim().min(2).max(160),
  internalTestimonialsEnabled: checkboxBoolean.optional().default(false),
  publicTestimonialFormEnabled: checkboxBoolean.optional().default(false),
  requireAdminApproval: checkboxBoolean.optional().default(false),
  homepageTestimonialsEnabled: checkboxBoolean.optional().default(false),
  founderPageTestimonialsEnabled: checkboxBoolean.optional().default(false),
  auditPageTestimonialsEnabled: checkboxBoolean.optional().default(false)
});

const externalRequestSchema = z.object({
  returnPath: z.string().optional(),
  proofType: z.nativeEnum(TestimonialProofType),
  authorName: optionalText(140),
  authorRole: optionalText(140),
  businessName: optionalText(160),
  businessWebsite: optionalUrl,
  submittedEmail: optionalModernEmail,
  companyName: optionalText(160),
  auditBusinessName: optionalText(180),
  requestContext: optionalText(700)
});

const sendTestimonialRequestSchema = z.object({
  returnPath: z.string().optional(),
  recipientName: z.string().trim().min(2).max(140),
  recipientEmail: requiredModernEmail,
  proofType: z.nativeEnum(TestimonialProofType),
  companyName: optionalText(160),
  auditBusinessName: optionalText(180),
  contextNote: optionalText(700)
});

function appendQueryParams(path: string, params: Record<string, string>) {
  const url = new URL(path, "http://localhost");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return `${url.pathname}${url.search}`;
}

function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) || "");
}

function resolveReturnPath(value: string | undefined, fallback = "/admin/testimonials") {
  return safeRedirectPath(value, fallback);
}

export async function submitMemberTestimonialAction(formData: FormData) {
  const session = await requireUser();

  const parsed = memberTestimonialSchema.safeParse({
    returnPath: getFormValue(formData, "returnPath"),
    quote: getFormValue(formData, "quote"),
    outcome: getFormValue(formData, "outcome"),
    category: getFormValue(formData, "category"),
    displayLocation: getFormValue(formData, "displayLocation"),
    rating: getFormValue(formData, "rating"),
    submittedByName: getFormValue(formData, "submittedByName"),
    submittedByCompany: getFormValue(formData, "submittedByCompany"),
    submittedByRole: getFormValue(formData, "submittedByRole"),
    submittedByWebsite: getFormValue(formData, "submittedByWebsite"),
    submittedByLinkedIn: getFormValue(formData, "submittedByLinkedIn"),
    permissionToFeaturePublicly: formData.get("permissionToFeaturePublicly"),
    permissionToUseName: formData.get("permissionToUseName"),
    permissionToUseCompany: formData.get("permissionToUseCompany"),
    permissionToUseImage: formData.get("permissionToUseImage"),
    permissionToUseInMarketing: formData.get("permissionToUseInMarketing")
  });

  if (!parsed.success) {
    const returnPath = safeRedirectPath(getFormValue(formData, "returnPath"), "/profile");
    redirect(appendQueryParams(returnPath, { testimonial: "invalid" }));
  }

  const testimonial = await createMemberTestimonial({
    memberId: session.user.id,
    ...parsed.data
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin/testimonials");
  redirect(
    appendQueryParams(safeRedirectPath(parsed.data.returnPath, "/profile"), {
      testimonial: "sent",
      testimonialId: testimonial.id
    })
  );
}

export async function submitExternalTestimonialAction(formData: FormData) {
  const token = getFormValue(formData, "requestToken");
  const isTokenRequest = token.length > 0;
  const fallbackPath = isTokenRequest ? `/testimonial/${encodeURIComponent(token)}` : "/testimonial";
  const returnPath = safeRedirectPath(getFormValue(formData, "returnPath"), fallbackPath);
  const errorPath = appendQueryParams(returnPath, { error: "invalid" });

  const parsed = externalTestimonialSchema.safeParse({
    requestToken: token,
    returnPath: getFormValue(formData, "returnPath"),
    authorName: getFormValue(formData, "authorName"),
    authorRole: getFormValue(formData, "authorRole"),
    businessName: getFormValue(formData, "businessName"),
    businessWebsite: getFormValue(formData, "businessWebsite"),
    submittedByLinkedIn: getFormValue(formData, "submittedByLinkedIn"),
    quote: getFormValue(formData, "quote"),
    outcome: getFormValue(formData, "outcome"),
    submittedEmail: getFormValue(formData, "submittedEmail"),
    category: getFormValue(formData, "category"),
    displayLocation: getFormValue(formData, "displayLocation"),
    rating: getFormValue(formData, "rating"),
    permissionToFeaturePublicly: formData.get("permissionToFeaturePublicly"),
    permissionToUseName: formData.get("permissionToUseName"),
    permissionToUseCompany: formData.get("permissionToUseCompany"),
    permissionToUseImage: formData.get("permissionToUseImage"),
    permissionToUseInMarketing: formData.get("permissionToUseInMarketing"),
    allowDisplayName: formData.get("allowDisplayName"),
    allowDisplayCompany: formData.get("allowDisplayCompany"),
    allowDisplayRole: formData.get("allowDisplayRole"),
    allowDisplayTestimonial: formData.get("allowDisplayTestimonial"),
    allowMarketingUse: formData.get("allowMarketingUse"),
    website: getFormValue(formData, "website"),
    source: getFormValue(formData, "source"),
    campaign: getFormValue(formData, "campaign"),
    ref: getFormValue(formData, "ref")
  });

  if (!parsed.success) {
    redirect(errorPath);
  }

  let successPath = "";
  try {
    const authorName = parsed.data.authorName || parsed.data.businessName;
    const displayOwnerName = Boolean(parsed.data.authorName);
    const successBasePath = safeRedirectPath(parsed.data.returnPath, fallbackPath);
    const testimonial = await createExternalTestimonial({
      ...parsed.data,
      authorName,
      requestToken: parsed.data.requestToken || null,
      source: parsed.data.requestToken ? TestimonialSource.EMAIL_REQUEST : TestimonialSource.PUBLIC_FORM,
      permissionToFeaturePublicly: true,
      permissionToUseName: displayOwnerName,
      permissionToUseCompany: true,
      permissionToUseImage: false,
      permissionToUseInMarketing: false,
      allowDisplayName: displayOwnerName,
      allowDisplayCompany: true,
      allowDisplayRole: false,
      allowDisplayTestimonial: true,
      allowMarketingUse: false,
      displayPublicName: displayOwnerName,
      displayBusinessName: true,
      trackingSource: parsed.data.source,
      campaign: parsed.data.campaign,
      ref: parsed.data.ref
    });
    revalidatePath("/admin/testimonials");
    revalidatePath("/testimonial");
    revalidatePath("/review");
    successPath = isTokenRequest
      ? `/testimonial/${encodeURIComponent(token)}?submitted=1&testimonialId=${testimonial.id}`
      : appendQueryParams(successBasePath, {
          submitted: "1",
          testimonialId: testimonial.id
        });
  } catch {
    redirect(appendQueryParams(returnPath, { error: "unavailable" }));
  }

  redirect(successPath);
}

export async function createExternalTestimonialRequestAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = externalRequestSchema.safeParse({
    returnPath: getFormValue(formData, "returnPath"),
    proofType: getFormValue(formData, "proofType"),
    authorName: getFormValue(formData, "authorName"),
    authorRole: getFormValue(formData, "authorRole"),
    businessName: getFormValue(formData, "businessName"),
    businessWebsite: getFormValue(formData, "businessWebsite"),
    submittedEmail: getFormValue(formData, "submittedEmail"),
    companyName: getFormValue(formData, "companyName"),
    auditBusinessName: getFormValue(formData, "auditBusinessName"),
    requestContext: getFormValue(formData, "requestContext")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-request" }));
  }

  const request = await createExternalTestimonialRequest({
    ...parsed.data,
    requestedByAdminId: session.user.id
  });

  revalidatePath("/admin/testimonials");
  redirect(
    appendQueryParams(returnPath, {
      notice: "request-created",
      token: request.requestToken ?? ""
    })
  );
}

export async function sendTestimonialRequestEmailAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = sendTestimonialRequestSchema.safeParse({
    returnPath: getFormValue(formData, "returnPath"),
    recipientName: getFormValue(formData, "recipientName"),
    recipientEmail: getFormValue(formData, "recipientEmail"),
    proofType: getFormValue(formData, "proofType"),
    companyName: getFormValue(formData, "companyName"),
    auditBusinessName: getFormValue(formData, "auditBusinessName"),
    contextNote: getFormValue(formData, "contextNote")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-request" }));
  }

  const result = await sendTestimonialRequestEmail({
    recipientName: parsed.data.recipientName,
    recipientEmail: parsed.data.recipientEmail,
    proofType: parsed.data.proofType,
    companyName: parsed.data.companyName,
    auditBusinessName: parsed.data.auditBusinessName,
    contextNote: parsed.data.contextNote,
    requestedByAdminId: session.user.id
  });

  revalidatePath("/admin/testimonials");

  if (!result.email.sent) {
    redirect(
      appendQueryParams(returnPath, {
        error: result.email.skipped ? "email-not-configured" : "email-send-failed",
        token: result.requestToken
      })
    );
  }

  redirect(
    appendQueryParams(returnPath, {
      notice: "request-email-sent",
      token: result.requestToken
    })
  );
}

export async function updateAdminTestimonialAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = adminUpdateSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath"),
    quote: getFormValue(formData, "quote"),
    authorName: getFormValue(formData, "authorName"),
    authorRole: getFormValue(formData, "authorRole"),
    businessName: getFormValue(formData, "businessName"),
    businessWebsite: getFormValue(formData, "businessWebsite"),
    outcome: getFormValue(formData, "outcome"),
    proofType: getFormValue(formData, "proofType"),
    category: getFormValue(formData, "category"),
    displayLocation: getFormValue(formData, "displayLocation"),
    status: getFormValue(formData, "status"),
    permissionToDisplay: formData.get("permissionToDisplay"),
    permissionToFeaturePublicly: formData.get("permissionToFeaturePublicly"),
    permissionToUseName: formData.get("permissionToUseName"),
    permissionToUseCompany: formData.get("permissionToUseCompany"),
    permissionToUseImage: formData.get("permissionToUseImage"),
    permissionToUseInMarketing: formData.get("permissionToUseInMarketing"),
    allowDisplayName: formData.get("allowDisplayName"),
    allowDisplayCompany: formData.get("allowDisplayCompany"),
    allowDisplayRole: formData.get("allowDisplayRole"),
    allowDisplayTestimonial: formData.get("allowDisplayTestimonial"),
    allowMarketingUse: formData.get("allowMarketingUse"),
    displayPublicName: formData.get("displayPublicName"),
    displayBusinessName: formData.get("displayBusinessName"),
    displayProfileImage: formData.get("displayProfileImage"),
    isHighlighted: formData.get("isHighlighted"),
    rating: getFormValue(formData, "rating"),
    adminNotes: getFormValue(formData, "adminNotes"),
    rejectionReason: getFormValue(formData, "rejectionReason")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-update" }));
  }

  await updateAdminTestimonial({
    ...parsed.data,
    adminId: session.user.id
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/home");
  revalidatePath("/membership");
  revalidatePath("/founder");
  redirect(appendQueryParams(returnPath, { notice: "testimonial-updated" }));
}

export async function updateReviewSettingsAction(formData: FormData) {
  await requireAdmin();
  const parsed = reviewSettingsSchema.safeParse({
    returnPath: getFormValue(formData, "returnPath"),
    googleReviewUrl: getFormValue(formData, "googleReviewUrl"),
    googleReviewEnabled: formData.get("googleReviewEnabled"),
    showGoogleReviewButton: formData.get("showGoogleReviewButton"),
    googleReviewButtonLabel: getFormValue(formData, "googleReviewButtonLabel"),
    googleReviewPendingMessage: getFormValue(formData, "googleReviewPendingMessage"),
    internalTestimonialsEnabled: formData.get("internalTestimonialsEnabled"),
    publicTestimonialFormEnabled: formData.get("publicTestimonialFormEnabled"),
    requireAdminApproval: formData.get("requireAdminApproval"),
    homepageTestimonialsEnabled: formData.get("homepageTestimonialsEnabled"),
    founderPageTestimonialsEnabled: formData.get("founderPageTestimonialsEnabled"),
    auditPageTestimonialsEnabled: formData.get("auditPageTestimonialsEnabled")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-settings" }));
  }

  await updateReviewSettings(parsed.data);
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonial");
  revalidatePath("/home");
  revalidatePath("/membership");
  revalidatePath("/founder");
  revalidatePath("/audit");
  redirect(appendQueryParams(returnPath, { notice: "settings-updated" }));
}

export async function toggleTestimonialHighlightAction(formData: FormData) {
  await requireAdmin();
  const parsed = adminBooleanSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath"),
    enabled: formData.get("enabled")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-status" }));
  }

  await toggleTestimonialHighlight(parsed.data.testimonialId, parsed.data.enabled);
  revalidatePath("/admin/testimonials");
  revalidatePath("/home");
  revalidatePath("/membership");
  revalidatePath("/founder");
  revalidatePath("/audit");
  redirect(appendQueryParams(returnPath, { notice: "testimonial-updated" }));
}

export async function markGoogleReviewIntentAction(formData: FormData) {
  await requireAdmin();
  const parsed = adminStatusSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-status" }));
  }

  await markGoogleReviewIntent(parsed.data.testimonialId);
  revalidatePath("/admin/testimonials");
  redirect(appendQueryParams(returnPath, { notice: "google-intent-marked" }));
}

export async function markTestimonialCopiedToGoogleAction(formData: FormData) {
  await requireAdmin();
  const parsed = adminStatusSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-status" }));
  }

  await markTestimonialCopiedToGoogle(parsed.data.testimonialId);
  revalidatePath("/admin/testimonials");
  redirect(appendQueryParams(returnPath, { notice: "google-copy-marked" }));
}

export async function markGoogleReviewConfirmedAction(formData: FormData) {
  await requireAdmin();
  const parsed = adminStatusSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-status" }));
  }

  await markGoogleReviewConfirmed(parsed.data.testimonialId);
  revalidatePath("/admin/testimonials");
  redirect(appendQueryParams(returnPath, { notice: "google-confirmed" }));
}

export async function approveTestimonialAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = adminStatusSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-status" }));
  }

  await approveTestimonial(parsed.data.testimonialId, session.user.id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/home");
  revalidatePath("/membership");
  revalidatePath("/founder");
  redirect(appendQueryParams(returnPath, { notice: "testimonial-approved" }));
}

export async function rejectTestimonialAction(formData: FormData) {
  await requireAdmin();
  const parsed = adminStatusSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-status" }));
  }

  await rejectTestimonial(parsed.data.testimonialId);
  revalidatePath("/admin/testimonials");
  revalidatePath("/home");
  revalidatePath("/membership");
  revalidatePath("/founder");
  redirect(appendQueryParams(returnPath, { notice: "testimonial-rejected" }));
}

export async function archiveTestimonialAction(formData: FormData) {
  await requireAdmin();
  const parsed = adminStatusSchema.safeParse({
    testimonialId: getFormValue(formData, "testimonialId"),
    returnPath: getFormValue(formData, "returnPath")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParams(returnPath, { error: "invalid-status" }));
  }

  await archiveTestimonial(parsed.data.testimonialId);
  revalidatePath("/admin/testimonials");
  revalidatePath("/home");
  revalidatePath("/membership");
  revalidatePath("/founder");
  redirect(appendQueryParams(returnPath, { notice: "testimonial-archived" }));
}
