"use server";

import {
  TestimonialProofType,
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
  rejectTestimonial,
  sendTestimonialRequestEmail,
  updateAdminTestimonial
} from "@/server/testimonials";

const checkboxBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean()
);

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalUrl = z.string().trim().url().max(2048).optional().or(z.literal(""));

const memberTestimonialSchema = z.object({
  quote: z.string().trim().min(20).max(1200),
  outcome: optionalText(500),
  permissionToDisplay: checkboxBoolean.refine(Boolean),
  displayPublicName: checkboxBoolean.optional().default(false),
  displayBusinessName: checkboxBoolean.optional().default(false),
  displayProfileImage: checkboxBoolean.optional().default(false)
});

const externalTestimonialSchema = z.object({
  requestToken: z.string().trim().min(16).max(128),
  authorName: z.string().trim().min(2).max(120),
  authorRole: optionalText(120),
  businessName: optionalText(140),
  businessWebsite: optionalUrl,
  quote: z.string().trim().min(20).max(1600),
  outcome: optionalText(600),
  submittedEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  permissionToDisplay: checkboxBoolean.refine(Boolean),
  displayPreference: z
    .enum(["full", "first_business", "business_only", "initials_only"])
    .default("full"),
  displayPublicName: checkboxBoolean.optional().default(false),
  displayBusinessName: checkboxBoolean.optional().default(false)
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
  status: z.nativeEnum(TestimonialStatus),
  permissionToDisplay: checkboxBoolean.optional().default(false),
  displayPublicName: checkboxBoolean.optional().default(false),
  displayBusinessName: checkboxBoolean.optional().default(false),
  displayProfileImage: checkboxBoolean.optional().default(false),
  adminNotes: optionalText(1600)
});

const adminStatusSchema = z.object({
  testimonialId: z.string().cuid(),
  returnPath: z.string().optional()
});

const externalRequestSchema = z.object({
  returnPath: z.string().optional(),
  proofType: z.nativeEnum(TestimonialProofType),
  authorName: optionalText(140),
  authorRole: optionalText(140),
  businessName: optionalText(160),
  businessWebsite: optionalUrl,
  submittedEmail: z.string().trim().email().max(320).optional().or(z.literal(""))
});

const sendTestimonialRequestSchema = z.object({
  returnPath: z.string().optional(),
  recipientName: z.string().trim().min(2).max(140),
  recipientEmail: z.string().trim().email().max(320),
  proofType: z.nativeEnum(TestimonialProofType),
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

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join(".");
}

function applyExternalDisplayPreference(input: z.infer<typeof externalTestimonialSchema>) {
  if (input.displayPreference === "first_business") {
    return {
      ...input,
      authorName: input.authorName.split(/\s+/).filter(Boolean)[0] ?? input.authorName,
      displayPublicName: true,
      displayBusinessName: true
    };
  }

  if (input.displayPreference === "business_only") {
    return {
      ...input,
      displayPublicName: false,
      displayBusinessName: true
    };
  }

  if (input.displayPreference === "initials_only") {
    return {
      ...input,
      authorName: initialsFromName(input.authorName),
      displayPublicName: true,
      displayBusinessName: false
    };
  }

  return {
    ...input,
    displayPublicName: true,
    displayBusinessName: true
  };
}

export async function submitMemberTestimonialAction(formData: FormData) {
  const session = await requireUser();

  const parsed = memberTestimonialSchema.safeParse({
    quote: getFormValue(formData, "quote"),
    outcome: getFormValue(formData, "outcome"),
    permissionToDisplay: formData.get("permissionToDisplay"),
    displayPublicName: formData.get("displayPublicName"),
    displayBusinessName: formData.get("displayBusinessName"),
    displayProfileImage: formData.get("displayProfileImage")
  });

  if (!parsed.success) {
    redirect("/profile?testimonial=invalid");
  }

  await createMemberTestimonial({
    memberId: session.user.id,
    ...parsed.data
  });

  revalidatePath("/profile");
  revalidatePath("/admin/testimonials");
  redirect("/profile?testimonial=sent");
}

export async function submitExternalTestimonialAction(formData: FormData) {
  const token = getFormValue(formData, "requestToken");
  const errorPath = `/testimonial/${encodeURIComponent(token)}?error=invalid`;

  const parsed = externalTestimonialSchema.safeParse({
    requestToken: token,
    authorName: getFormValue(formData, "authorName"),
    authorRole: getFormValue(formData, "authorRole"),
    businessName: getFormValue(formData, "businessName"),
    businessWebsite: getFormValue(formData, "businessWebsite"),
    quote: getFormValue(formData, "quote"),
    outcome: getFormValue(formData, "outcome"),
    submittedEmail: getFormValue(formData, "submittedEmail"),
    permissionToDisplay: formData.get("permissionToDisplay"),
    displayPreference: getFormValue(formData, "displayPreference"),
    displayPublicName: formData.get("displayPublicName"),
    displayBusinessName: formData.get("displayBusinessName")
  });

  if (!parsed.success) {
    redirect(errorPath);
  }

  try {
    await createExternalTestimonial(applyExternalDisplayPreference(parsed.data));
  } catch {
    redirect(`/testimonial/${encodeURIComponent(token)}?error=unavailable`);
  }

  revalidatePath("/admin/testimonials");
  redirect(`/testimonial/${encodeURIComponent(token)}?submitted=1`);
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
    submittedEmail: getFormValue(formData, "submittedEmail")
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
    status: getFormValue(formData, "status"),
    permissionToDisplay: formData.get("permissionToDisplay"),
    displayPublicName: formData.get("displayPublicName"),
    displayBusinessName: formData.get("displayBusinessName"),
    displayProfileImage: formData.get("displayProfileImage"),
    adminNotes: getFormValue(formData, "adminNotes")
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
