import { createElement } from "react";
import { LeadSource, LeadStatus, Prisma } from "@prisma/client";
import {
  AuditSubmissionAdminNotificationEmail,
  LeadAdminNotificationEmail
} from "@/emails";
import { renderEmailHtml } from "@/emails/render";
import { buildBrandedEmailText } from "@/emails/text";
import { normalizeEmail } from "@/lib/auth/utils";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logServerError, logServerWarning } from "@/lib/security/logging";
import { formatDateTime, toTitleCase } from "@/lib/utils";

export type LeadMarketingFilter = "ANY" | "OPTED_IN" | "NOT_OPTED_IN";
export type LeadSegmentFilter =
  | "ALL"
  | "NEW_THIS_WEEK"
  | "AUDIT"
  | "EVENT"
  | "CIRCLE_CARD"
  | "CIRCLE_CARD_PRO_INTEREST"
  | "SALES26";
export type LeadFollowUpDraftType =
  | "EVENT_FOLLOW_UP"
  | "CIRCLE_CARD_SIGNUP_FOLLOW_UP"
  | "AUDIT_RESULT_FOLLOW_UP"
  | "BCN_INVITE_FOLLOW_UP"
  | "GROWTH_ARCHITECT_FOLLOW_UP";

export type ListAdminLeadsInput = {
  query?: string;
  source?: LeadSource | "ALL";
  status?: LeadStatus | "ALL";
  marketing?: LeadMarketingFilter;
  segment?: LeadSegmentFilter;
  page?: number;
  pageSize?: number;
};

export type RecordLeadInput = {
  userId?: string | null;
  contactSubmissionId?: string | null;
  name: string;
  email: string;
  businessName?: string | null;
  website?: string | null;
  source: LeadSource;
  sourceLabel?: string | null;
  consentSource?: string | null;
  essentialConsent: boolean;
  marketingEmailOptIn?: boolean;
  consentedAt?: Date | null;
  marketingConsentAt?: Date | null;
  termsAcceptedAt?: Date | null;
  privacyAcceptedAt?: Date | null;
  tags?: string[];
  score?: number | null;
  status?: LeadStatus;
  lastEmailedAt?: Date | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
  sendAdminNotification?: boolean;
};

export type RecordAuditQuizLeadInput = {
  name: string;
  email: string;
  businessName?: string | null;
  website?: string | null;
  essentialConsent: boolean;
  marketingEmailOptIn?: boolean;
  score: number;
  scorePercent?: number | null;
  resultType: string;
  recommendedTier: string;
  recommendedPath?: string | null;
  recommendedNextStep?: string | null;
  answers: Array<{ questionId: string; score: number | null }>;
  strengths: string[];
  weaknesses: string[];
  sourcePath?: string | null;
  source?: string | null;
  topic?: string | null;
};

export type AdminLeadListItem = Awaited<ReturnType<typeof listAdminLeads>>["items"][number];
export type AdminLeadDetail = Awaited<ReturnType<typeof getAdminLeadDetail>>;
export type LeadFollowUpDraft = ReturnType<typeof buildLeadFollowUpDraft>;

const LEAD_SELECT = {
  id: true,
  name: true,
  email: true,
  businessName: true,
  website: true,
  source: true,
  sourceLabel: true,
  consentSource: true,
  essentialConsent: true,
  marketingEmailOptIn: true,
  consentedAt: true,
  marketingConsentAt: true,
  tags: true,
  score: true,
  status: true,
  lastEmailedAt: true,
  notes: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      role: true,
      membershipTier: true,
      subscription: {
        select: {
          status: true
        }
      }
    }
  }
} satisfies Prisma.LeadSelect;

const LEAD_DETAIL_SELECT = {
  id: true,
  userId: true,
  contactSubmissionId: true,
  name: true,
  email: true,
  businessName: true,
  website: true,
  source: true,
  sourceLabel: true,
  consentSource: true,
  essentialConsent: true,
  marketingEmailOptIn: true,
  consentedAt: true,
  marketingConsentAt: true,
  termsAcceptedAt: true,
  privacyAcceptedAt: true,
  tags: true,
  score: true,
  status: true,
  lastEmailedAt: true,
  notes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      membershipTier: true,
      subscription: {
        select: {
          status: true
        }
      }
    }
  },
  contactSubmission: {
    select: {
      id: true,
      subject: true,
      message: true,
      createdAt: true
    }
  }
} satisfies Prisma.LeadSelect;

const LEAD_FOLLOW_UP_DRAFT_TYPES = [
  "EVENT_FOLLOW_UP",
  "CIRCLE_CARD_SIGNUP_FOLLOW_UP",
  "AUDIT_RESULT_FOLLOW_UP",
  "BCN_INVITE_FOLLOW_UP",
  "GROWTH_ARCHITECT_FOLLOW_UP"
] as const satisfies LeadFollowUpDraftType[];

function toNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeWebsite(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.toString();
  } catch {
    return trimmed;
  }
}

function normalizeTags(tags: string[] | undefined) {
  const seen = new Set<string>();

  return (tags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => {
      if (!tag || seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    })
    .slice(0, 24);
}

function parseTagsInput(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return normalizeTags(value);
  }

  return normalizeTags(
    value
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
}

function firstNameFromName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readStringFromJsonObject(object: Prisma.JsonObject | null, key: string) {
  const value = object?.[key];
  return typeof value === "string" ? value : null;
}

function leadMetadataObject(metadata: Prisma.JsonValue | null): Prisma.JsonObject {
  return isJsonObject(metadata) ? metadata : {};
}

function readLeadFollowUpMetadata(metadata: Prisma.JsonValue | null) {
  const root = leadMetadataObject(metadata);
  const followUp = isJsonObject(root.followUp as Prisma.JsonValue | null)
    ? (root.followUp as Prisma.JsonObject)
    : null;

  return {
    nextStep: readStringFromJsonObject(followUp, "nextStep"),
    followUpDate: readStringFromJsonObject(followUp, "followUpDate"),
    lastDraftType: readStringFromJsonObject(followUp, "lastDraftType"),
    lastSentAt: readStringFromJsonObject(followUp, "lastSentAt")
  };
}

function mergeLeadFollowUpMetadata(input: {
  metadata: Prisma.JsonValue | null;
  nextStep?: string | null;
  followUpDate?: string | null;
  lastDraftType?: LeadFollowUpDraftType | null;
  lastSentAt?: Date | null;
  lastSentSubject?: string | null;
  lastResendEmailId?: string | null;
}) {
  const root = { ...leadMetadataObject(input.metadata) };
  const existingFollowUp = isJsonObject(root.followUp as Prisma.JsonValue | null)
    ? (root.followUp as Prisma.JsonObject)
    : {};
  const followUp: Prisma.JsonObject = {
    ...existingFollowUp,
    updatedAt: new Date().toISOString()
  };

  if ("nextStep" in input) {
    followUp.nextStep = toNullableText(input.nextStep) ?? null;
  }

  if ("followUpDate" in input) {
    followUp.followUpDate = toNullableText(input.followUpDate) ?? null;
  }

  if ("lastDraftType" in input) {
    followUp.lastDraftType = input.lastDraftType ?? null;
  }

  if (input.lastSentAt) {
    followUp.lastSentAt = input.lastSentAt.toISOString();
  }

  if ("lastSentSubject" in input) {
    followUp.lastSentSubject = toNullableText(input.lastSentSubject) ?? null;
  }

  if ("lastResendEmailId" in input) {
    followUp.lastResendEmailId = toNullableText(input.lastResendEmailId) ?? null;
  }

  return {
    ...root,
    followUp
  } satisfies Prisma.InputJsonObject;
}

function metadataRecommendedNextStep(metadata: Prisma.JsonValue | null) {
  const root = leadMetadataObject(metadata);
  const followUp = readLeadFollowUpMetadata(metadata);
  return (
    followUp.nextStep ||
    readStringFromJsonObject(root, "recommendedNextStep") ||
    readStringFromJsonObject(root, "recommendedPath") ||
    readStringFromJsonObject(root, "resultType")
  );
}

function recommendedNextStepForLead(lead: {
  source: LeadSource;
  sourceLabel: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  const savedStep = metadataRecommendedNextStep(lead.metadata);
  if (savedStep) {
    return savedStep;
  }

  if (lead.sourceLabel?.toLowerCase().includes("circle card pro interest")) {
    return "Qualify Pro fit around visibility, analytics, lead capture and timing.";
  }

  if (lead.source === LeadSource.AUDIT_QUIZ || lead.source === LeadSource.FOUNDER_AUDIT) {
    return "Review the audit result and suggest one practical next step.";
  }

  if (lead.source === LeadSource.CIRCLE_CARD_SIGNUP) {
    return "Help them complete and share their Circle Card.";
  }

  if (lead.source === LeadSource.EVENT_SIGNUP || lead.sourceLabel?.toLowerCase().includes("event")) {
    return "Send a warm event follow-up and ask what connection would help next.";
  }

  if (lead.source === LeadSource.BCN_JOIN) {
    return "Confirm the best membership next step or invite path.";
  }

  if (lead.source === LeadSource.CONTACT_FORM) {
    return "Reply to their enquiry with a focused next action.";
  }

  return "Qualify the lead and choose the most relevant follow-up.";
}

function leadHasAnyTag(lead: { tags: string[] }, tags: string[]) {
  const leadTags = new Set(lead.tags.map((tag) => tag.toLowerCase()));
  return tags.some((tag) => leadTags.has(tag));
}

function adminNotificationRecipient() {
  return process.env.CONTACT_NOTIFY_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim() || null;
}

export function formatLeadSourceLabel(source: LeadSource, sourceLabel?: string | null) {
  if (sourceLabel?.trim()) {
    return sourceLabel.trim();
  }

  const labels: Record<LeadSource, string> = {
    CIRCLE_CARD_SIGNUP: "Circle Card Signup",
    BCN_JOIN: "BCN Join",
    AUDIT_QUIZ: "Audit Quiz",
    CONTACT_FORM: "Contact Form",
    FOUNDER_AUDIT: "Founder Audit",
    EVENT_SIGNUP: "Event Signup",
    OTHER: "Other"
  };

  return labels[source];
}

export function formatLeadStatusLabel(status: LeadStatus) {
  if (status === LeadStatus.NEW) {
    return "New / Needs Follow-Up";
  }

  if (status === LeadStatus.CONTACTED) {
    return "Followed Up";
  }

  return toTitleCase(status.replaceAll("_", " "));
}

export function formatLeadConsentStatus(input: {
  essentialConsent: boolean;
  marketingEmailOptIn: boolean;
}) {
  if (input.essentialConsent && input.marketingEmailOptIn) {
    return "Service + marketing opt-in";
  }

  if (input.essentialConsent) {
    return "Service only";
  }

  if (input.marketingEmailOptIn) {
    return "Marketing opt-in only";
  }

  return "No recorded consent";
}

async function sendNewLeadAdminNotification(lead: {
  name: string;
  email: string;
  businessName: string | null;
  website: string | null;
  source: LeadSource;
  sourceLabel: string | null;
  essentialConsent: boolean;
  marketingEmailOptIn: boolean;
  tags: string[];
  score: number | null;
  status: LeadStatus;
  createdAt: Date;
}) {
  const recipient = adminNotificationRecipient();
  if (!recipient) {
    return;
  }

  const sourceLabel = formatLeadSourceLabel(lead.source, lead.sourceLabel);
  const consentStatus = formatLeadConsentStatus(lead);
  const template = createElement(LeadAdminNotificationEmail, {
    name: lead.name,
    email: lead.email,
    businessName: lead.businessName,
    website: lead.website,
    sourceLabel,
    consentStatus,
    marketingEmailOptIn: lead.marketingEmailOptIn,
    tags: lead.tags,
    score: lead.score,
    status: formatLeadStatusLabel(lead.status),
    createdAt: formatDateTime(lead.createdAt)
  });
  const html = await renderEmailHtml(template);

  const result = await sendTransactionalEmail({
    to: recipient,
    replyTo: lead.email,
    subject: `New lead: ${lead.name} (${sourceLabel})`,
    text: buildBrandedEmailText({
      eyebrow: "Lead generation",
      heading: "New lead captured",
      bodyLines: [
        `Name: ${lead.name}`,
        `Email: ${lead.email}`,
        `Business: ${lead.businessName || "N/A"}`,
        `Website: ${lead.website || "N/A"}`,
        `Source: ${sourceLabel}`,
        `Consent: ${consentStatus}`,
        `Marketing opt-in: ${lead.marketingEmailOptIn ? "Yes" : "No"}`,
        `Status: ${formatLeadStatusLabel(lead.status)}`,
        `Score: ${typeof lead.score === "number" ? lead.score : "N/A"}`,
        `Tags: ${lead.tags.length ? lead.tags.join(", ") : "None"}`
      ]
    }),
    html,
    react: template,
    tags: [
      { name: "type", value: "new-lead-admin-notification" },
      { name: "source", value: lead.source.toLowerCase().slice(0, 64) }
    ]
  });

  if (!result.sent && !result.skipped) {
    logServerWarning("new-lead-admin-notification-email-failed");
  }
}

async function sendAuditSubmissionAdminNotification(input: RecordAuditQuizLeadInput) {
  const recipient = adminNotificationRecipient();
  if (!recipient) {
    return;
  }

  const template = createElement(AuditSubmissionAdminNotificationEmail, {
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    businessName: toNullableText(input.businessName),
    website: normalizeWebsite(input.website),
    score: input.score,
    resultType: input.resultType,
    recommendedTier: input.recommendedTier,
    marketingEmailOptIn: Boolean(input.marketingEmailOptIn),
    sourcePath: input.sourcePath
  });
  const html = await renderEmailHtml(template);

  const result = await sendTransactionalEmail({
    to: recipient,
    replyTo: normalizeEmail(input.email),
    subject: `Founder Audit submitted: ${input.name.trim()}`,
    text: buildBrandedEmailText({
      eyebrow: "Founder Audit",
      heading: "Audit result captured",
      bodyLines: [
        `Name: ${input.name.trim()}`,
        `Email: ${normalizeEmail(input.email)}`,
        `Business: ${toNullableText(input.businessName) || "N/A"}`,
        `Website: ${normalizeWebsite(input.website) || "N/A"}`,
        `Score: ${input.score} of 30${
          typeof input.scorePercent === "number" ? ` (${input.scorePercent}/100)` : ""
        }`,
        `Result: ${input.resultType}`,
        `Recommended tier: ${input.recommendedTier}`,
        `Recommended path: ${toNullableText(input.recommendedPath) || "N/A"}`,
        `Marketing opt-in: ${input.marketingEmailOptIn ? "Yes" : "No"}`,
        "The audit result was shown on-site immediately after capture."
      ]
    }),
    html,
    react: template,
    tags: [
      { name: "type", value: "audit-submission-admin-notification" },
      { name: "source", value: "audit" }
    ]
  });

  if (!result.sent && !result.skipped) {
    logServerWarning("audit-admin-notification-email-failed");
  }
}

export async function recordLead(input: RecordLeadInput) {
  const now = new Date();
  const marketingEmailOptIn = Boolean(input.marketingEmailOptIn);
  const lead = await prisma.lead.create({
    data: {
      userId: input.userId ?? undefined,
      contactSubmissionId: input.contactSubmissionId ?? undefined,
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      businessName: toNullableText(input.businessName),
      website: normalizeWebsite(input.website),
      source: input.source,
      sourceLabel: toNullableText(input.sourceLabel),
      consentSource: toNullableText(input.consentSource),
      essentialConsent: input.essentialConsent,
      marketingEmailOptIn,
      consentedAt: input.consentedAt ?? (input.essentialConsent ? now : undefined),
      marketingConsentAt: input.marketingConsentAt ?? (marketingEmailOptIn ? now : undefined),
      termsAcceptedAt: input.termsAcceptedAt ?? undefined,
      privacyAcceptedAt: input.privacyAcceptedAt ?? undefined,
      tags: normalizeTags(input.tags),
      score: input.score ?? undefined,
      status: input.status ?? LeadStatus.NEW,
      lastEmailedAt: input.lastEmailedAt ?? undefined,
      notes: toNullableText(input.notes),
      metadata: input.metadata ?? undefined
    },
    select: {
      id: true,
      name: true,
      email: true,
      businessName: true,
      website: true,
      source: true,
      sourceLabel: true,
      essentialConsent: true,
      marketingEmailOptIn: true,
      tags: true,
      score: true,
      status: true,
      createdAt: true
    }
  });

  if (input.sendAdminNotification ?? true) {
    void sendNewLeadAdminNotification(lead).catch((error) => {
      logServerError("new-lead-admin-notification-dispatch-failed", error);
    });
  }

  return lead;
}

export async function recordCircleCardSignupLead(input: {
  userId: string;
  name: string;
  email: string;
  businessName?: string | null;
  marketingEmailOptIn?: boolean;
  acceptedAt: Date;
  registrationSource: "circle-card" | "circle-card-spin";
  sourceCardSlug?: string | null;
  returnTo?: string | null;
}) {
  return recordLead({
    userId: input.userId,
    name: input.name,
    email: input.email,
    businessName: input.businessName,
    source:
      input.registrationSource === "circle-card-spin"
        ? LeadSource.EVENT_SIGNUP
        : LeadSource.CIRCLE_CARD_SIGNUP,
    sourceLabel:
      input.registrationSource === "circle-card-spin"
        ? "Spin To Connect Circle Card Signup"
        : "Circle Card Signup",
    consentSource: "Circle Card Signup",
    essentialConsent: true,
    marketingEmailOptIn: input.marketingEmailOptIn,
    consentedAt: input.acceptedAt,
    termsAcceptedAt: input.acceptedAt,
    privacyAcceptedAt: input.acceptedAt,
    score: input.businessName?.trim() ? 25 : 0,
    tags: [
      "circle-card",
      "free",
      input.registrationSource === "circle-card-spin" ? "spin-to-connect" : "",
      input.sourceCardSlug ? `source-card:${input.sourceCardSlug}` : ""
    ],
    metadata: {
      registrationSource: input.registrationSource,
      sourceCardSlug: input.sourceCardSlug ?? null,
      returnTo: input.returnTo ?? null,
      circleCardActivation: {
        activationLeadScore: input.businessName?.trim() ? 25 : 0,
        activationComplete: false,
        initialBusinessNameCaptured: Boolean(input.businessName?.trim())
      }
    } satisfies Prisma.InputJsonObject
  });
}

export async function recordBcnJoinLead(input: {
  name: string;
  email: string;
  businessName?: string | null;
  marketingEmailOptIn?: boolean;
  acceptedAt: Date;
  tier: string;
  billingInterval: string;
}) {
  return recordLead({
    name: input.name,
    email: input.email,
    businessName: input.businessName,
    source: LeadSource.BCN_JOIN,
    sourceLabel: "BCN Join",
    consentSource: "BCN Join",
    essentialConsent: true,
    marketingEmailOptIn: input.marketingEmailOptIn,
    consentedAt: input.acceptedAt,
    termsAcceptedAt: input.acceptedAt,
    privacyAcceptedAt: input.acceptedAt,
    tags: ["bcn-join", input.tier, input.billingInterval],
    metadata: {
      selectedTier: input.tier,
      billingInterval: input.billingInterval
    } satisfies Prisma.InputJsonObject
  });
}

export async function recordContactFormLead(input: {
  contactSubmissionId: string;
  userId?: string | null;
  name: string;
  email: string;
  company?: string | null;
  sourcePath?: string | null;
  source?: string | null;
}) {
  return recordLead({
    userId: input.userId,
    contactSubmissionId: input.contactSubmissionId,
    name: input.name,
    email: input.email,
    businessName: input.company,
    source: LeadSource.CONTACT_FORM,
    sourceLabel: "Contact Form",
    consentSource: "Contact form service reply",
    essentialConsent: true,
    marketingEmailOptIn: false,
    tags: ["contact-form", input.source ?? "website"],
    metadata: {
      sourcePath: input.sourcePath ?? "/contact",
      source: input.source ?? "website",
      consentBasis: "Submitted contact form for service response"
    } satisfies Prisma.InputJsonObject
  });
}

export async function recordAuditQuizLead(input: RecordAuditQuizLeadInput) {
  const now = new Date();
  const recommendedPath = toNullableText(input.recommendedPath);
  const recommendedNextStep = toNullableText(input.recommendedNextStep);
  const scoreSummary = `Audit score ${input.score} of 30${
    typeof input.scorePercent === "number" ? ` (${input.scorePercent}/100)` : ""
  }.`;
  const lead = await recordLead({
    name: input.name,
    email: input.email,
    businessName: input.businessName,
    website: input.website,
    source: LeadSource.AUDIT_QUIZ,
    sourceLabel: "Founder Audit",
    consentSource: "Founder Audit",
    essentialConsent: input.essentialConsent,
    marketingEmailOptIn: input.marketingEmailOptIn,
    consentedAt: input.essentialConsent ? now : null,
    marketingConsentAt: input.marketingEmailOptIn ? now : null,
    tags: [
      "audit",
      "founder-audit",
      input.recommendedTier,
      input.resultType,
      recommendedPath ?? ""
    ],
    score: input.score,
    notes: [
      scoreSummary,
      recommendedPath ? `Recommended path: ${recommendedPath}.` : "",
      recommendedNextStep ? `Next step: ${recommendedNextStep}` : ""
    ]
      .filter(Boolean)
      .join(" "),
    metadata: {
      resultType: input.resultType,
      recommendedTier: input.recommendedTier,
      recommendedPath,
      recommendedNextStep,
      rawScore: input.score,
      scorePercent: input.scorePercent ?? null,
      answers: input.answers,
      strengths: input.strengths,
      weaknesses: input.weaknesses,
      sourcePath: input.sourcePath ?? "/audit",
      source: input.source ?? null,
      topic: input.topic ?? null
    } satisfies Prisma.InputJsonObject
  });

  void sendAuditSubmissionAdminNotification(input).catch((error) => {
    logServerError("audit-admin-notification-dispatch-failed", error);
  });

  return lead;
}

export async function markLeadEmailed(leadId: string, date = new Date()) {
  await prisma.lead.update({
    where: {
      id: leadId
    },
    data: {
      lastEmailedAt: date
    }
  });
}

export async function markLatestBcnJoinLeadEmailed(email: string, date = new Date()) {
  await prisma.lead.updateMany({
    where: {
      email: normalizeEmail(email),
      source: LeadSource.BCN_JOIN
    },
    data: {
      lastEmailedAt: date
    }
  });
}

function leadSegmentWhere(segment?: LeadSegmentFilter): Prisma.LeadWhereInput | null {
  const selected = segment ?? "ALL";
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (selected === "NEW_THIS_WEEK") {
    return { createdAt: { gte: sevenDaysAgo } };
  }

  if (selected === "AUDIT") {
    return {
      OR: [
        { source: { in: [LeadSource.AUDIT_QUIZ, LeadSource.FOUNDER_AUDIT] } },
        { tags: { hasSome: ["audit", "founder-audit"] } }
      ]
    };
  }

  if (selected === "EVENT") {
    return {
      OR: [
        { source: LeadSource.EVENT_SIGNUP },
        { tags: { has: "event" } },
        { sourceLabel: { contains: "event", mode: "insensitive" } }
      ]
    };
  }

  if (selected === "CIRCLE_CARD") {
    return {
      OR: [
        { source: LeadSource.CIRCLE_CARD_SIGNUP },
        { tags: { hasSome: ["circle-card", "circle_card", "circle-card-pro", "pro-interest"] } }
      ]
    };
  }

  if (selected === "CIRCLE_CARD_PRO_INTEREST") {
    return {
      OR: [
        { tags: { hasSome: ["pro-interest", "circle-card-pro"] } },
        { sourceLabel: { contains: "Circle Card Pro Interest", mode: "insensitive" } }
      ]
    };
  }

  if (selected === "SALES26") {
    return {
      OR: [
        { tags: { has: "sales26" } },
        { sourceLabel: { contains: "sales26", mode: "insensitive" } }
      ]
    };
  }

  return null;
}

function buildLeadWhere(input: ListAdminLeadsInput): Prisma.LeadWhereInput {
  const query = input.query?.trim();
  const and: Prisma.LeadWhereInput[] = [];

  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { businessName: { contains: query, mode: "insensitive" } },
        { website: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } }
      ]
    });
  }

  if (input.source && input.source !== "ALL") {
    and.push({ source: input.source });
  }

  if (input.status && input.status !== "ALL") {
    and.push({ status: input.status });
  }

  if (input.marketing === "OPTED_IN") {
    and.push({ marketingEmailOptIn: true });
  }

  if (input.marketing === "NOT_OPTED_IN") {
    and.push({ marketingEmailOptIn: false });
  }

  const segment = leadSegmentWhere(input.segment);
  if (segment) {
    and.push(segment);
  }

  return and.length ? { AND: and } : {};
}

export async function listAdminLeads(input: ListAdminLeadsInput = {}) {
  const pageSize = Math.max(1, Math.min(input.pageSize ?? 25, 100));
  const page = Math.max(1, input.page ?? 1);
  const where = buildLeadWhere(input);

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: LEAD_SELECT
    }),
    prisma.lead.count({ where })
  ]);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getLeadGenerationStats() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, newCount, optedIn, recent] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: LeadStatus.NEW } }),
    prisma.lead.count({ where: { marketingEmailOptIn: true } }),
    prisma.lead.count({ where: { createdAt: { gte: since } } })
  ]);

  return {
    total,
    newCount,
    optedIn,
    recent
  };
}

export async function getAdminLeadDetail(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: {
      id: leadId
    },
    select: LEAD_DETAIL_SELECT
  });

  if (!lead) {
    return null;
  }

  return {
    ...lead,
    followUp: readLeadFollowUpMetadata(lead.metadata),
    recommendedNextStep: recommendedNextStepForLead(lead)
  };
}

export async function updateLeadForAdmin(input: {
  leadId: string;
  status: LeadStatus;
  notes?: string | null;
  tags?: string[] | string | null;
  nextStep?: string | null;
  followUpDate?: string | null;
}) {
  const existing = await prisma.lead.findUnique({
    where: {
      id: input.leadId
    },
    select: {
      metadata: true
    }
  });

  if (!existing) {
    throw new Error("Lead not found.");
  }

  return prisma.lead.update({
    where: {
      id: input.leadId
    },
    data: {
      status: input.status,
      notes: toNullableText(input.notes),
      ...(input.tags !== undefined ? { tags: parseTagsInput(input.tags) } : {}),
      ...(input.nextStep !== undefined || input.followUpDate !== undefined
        ? {
            metadata: mergeLeadFollowUpMetadata({
              metadata: existing.metadata,
              ...(input.nextStep !== undefined ? { nextStep: input.nextStep } : {}),
              ...(input.followUpDate !== undefined ? { followUpDate: input.followUpDate } : {})
            })
          }
        : {})
    },
    select: {
      id: true
    }
  });
}

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToSimpleHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${htmlEscape(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function inferDraftPurpose(
  lead: Pick<
    NonNullable<AdminLeadDetail>,
    "source" | "sourceLabel" | "tags" | "essentialConsent" | "marketingEmailOptIn" | "status"
  >,
  draftType: LeadFollowUpDraftType
) {
  const sourceLabel = lead.sourceLabel?.toLowerCase() ?? "";
  const eventLead =
    lead.source === LeadSource.EVENT_SIGNUP ||
    sourceLabel.includes("event") ||
    leadHasAnyTag(lead, ["event", "sales26", "spin-to-connect"]);
  const circleCardLead =
    lead.source === LeadSource.CIRCLE_CARD_SIGNUP ||
    leadHasAnyTag(lead, ["circle-card", "circle_card", "spin-to-connect"]);
  const auditLead =
    lead.source === LeadSource.AUDIT_QUIZ ||
    lead.source === LeadSource.FOUNDER_AUDIT ||
    leadHasAnyTag(lead, ["audit", "founder-audit"]);
  const contactLead = lead.source === LeadSource.CONTACT_FORM;
  const bcnLead = lead.source === LeadSource.BCN_JOIN || leadHasAnyTag(lead, ["bcn-join"]);

  const serviceReply =
    (draftType === "EVENT_FOLLOW_UP" && eventLead) ||
    (draftType === "CIRCLE_CARD_SIGNUP_FOLLOW_UP" && circleCardLead) ||
    (draftType === "AUDIT_RESULT_FOLLOW_UP" && auditLead) ||
    (draftType === "BCN_INVITE_FOLLOW_UP" && bcnLead) ||
    (draftType === "GROWTH_ARCHITECT_FOLLOW_UP" && (auditLead || contactLead));
  const purpose = serviceReply ? "SERVICE_REPLY" : "MARKETING";

  if (lead.status === LeadStatus.DO_NOT_CONTACT) {
    return {
      purpose,
      canSend: false,
      reason: "This lead is marked Do Not Contact."
    };
  }

  if (purpose === "SERVICE_REPLY" && !lead.essentialConsent) {
    return {
      purpose,
      canSend: false,
      reason: "No service consent is recorded for this lead."
    };
  }

  if (purpose === "MARKETING" && !lead.marketingEmailOptIn) {
    return {
      purpose,
      canSend: false,
      reason: "Marketing follow-up requires marketing opt-in."
    };
  }

  return {
    purpose,
    canSend: true,
    reason:
      purpose === "SERVICE_REPLY"
        ? "Allowed as a one-to-one service/reply follow-up."
        : "Allowed because marketing opt-in is recorded."
  };
}

function leadWebsiteLine(lead: Pick<NonNullable<AdminLeadDetail>, "website">) {
  return lead.website ? `I had a look at ${lead.website} and wanted to follow up while it is fresh.` : "";
}

export function buildLeadFollowUpDraft(
  lead: Pick<
    NonNullable<AdminLeadDetail>,
    | "name"
    | "email"
    | "businessName"
    | "website"
    | "source"
    | "sourceLabel"
    | "tags"
    | "essentialConsent"
    | "marketingEmailOptIn"
    | "status"
    | "metadata"
    | "recommendedNextStep"
  >,
  draftType: LeadFollowUpDraftType
) {
  const firstName = firstNameFromName(lead.name);
  const business = lead.businessName ? ` for ${lead.businessName}` : "";
  const nextStep = recommendedNextStepForLead(lead);
  const websiteLine = leadWebsiteLine(lead);
  const consent = inferDraftPurpose(lead, draftType);

  const drafts: Record<LeadFollowUpDraftType, { label: string; subject: string; body: string }> = {
    EVENT_FOLLOW_UP: {
      label: "Event follow-up",
      subject: `Lovely to connect${business}`,
      body: [
        `Hi ${firstName},`,
        "Thanks for signing up around the event. I wanted to follow up with one useful next step rather than a long pitch.",
        websiteLine,
        `From what you shared, the most useful next step looks like: ${nextStep}`,
        "Would it help if I pointed you towards the right Circle Card, BCN or Growth Architect route?",
        "Best,",
        "The Business Circle Network"
      ]
        .filter(Boolean)
        .join("\n\n")
    },
    CIRCLE_CARD_SIGNUP_FOLLOW_UP: {
      label: "Circle Card signup follow-up",
      subject: "A quick next step for your Circle Card",
      body: [
        `Hi ${firstName},`,
        "Welcome to Circle Card. The strongest cards usually have a clear profile image, business details, one featured link and a first share.",
        `Your next best step: ${nextStep}`,
        "If you want a quick sanity check on what to add first, reply with your main goal for the card and I will point you in the right direction.",
        "Best,",
        "The Business Circle Network"
      ].join("\n\n")
    },
    AUDIT_RESULT_FOLLOW_UP: {
      label: "Audit result follow-up",
      subject: "Your Founder Audit next step",
      body: [
        `Hi ${firstName},`,
        "Thanks for completing the Founder Audit. I wanted to follow up with a practical next step while the result is still useful.",
        `Recommended next step: ${nextStep}`,
        "If you reply with the one thing that feels most urgent right now, I can suggest whether Foundation, Inner Circle or Growth Architect support is the better fit.",
        "Best,",
        "The Business Circle Network"
      ].join("\n\n")
    },
    BCN_INVITE_FOLLOW_UP: {
      label: "BCN invite follow-up",
      subject: "Your Business Circle invite",
      body: [
        `Hi ${firstName},`,
        "I wanted to follow up with a simple Business Circle next step.",
        `Based on the information captured so far, I would suggest: ${nextStep}`,
        "If you are considering joining, reply with what you want from the network and I will point you towards the most relevant route.",
        "Best,",
        "The Business Circle Network"
      ].join("\n\n")
    },
    GROWTH_ARCHITECT_FOLLOW_UP: {
      label: "Growth Architect follow-up",
      subject: "Growth Architect support for your next step",
      body: [
        `Hi ${firstName},`,
        "I wanted to follow up because your submission suggests there may be a practical growth or positioning step we can help with.",
        websiteLine,
        `The next useful step looks like: ${nextStep}`,
        "If you reply with the outcome you want most in the next 30 days, I can suggest a focused Growth Architect route.",
        "Best,",
        "The Business Circle Network"
      ]
        .filter(Boolean)
        .join("\n\n")
    }
  };

  return {
    type: draftType,
    ...drafts[draftType],
    to: lead.email,
    purpose: consent.purpose,
    canSend: consent.canSend,
    consentReason: consent.reason
  };
}

export function parseLeadFollowUpDraftType(value: string): LeadFollowUpDraftType {
  return LEAD_FOLLOW_UP_DRAFT_TYPES.includes(value as LeadFollowUpDraftType)
    ? (value as LeadFollowUpDraftType)
    : "EVENT_FOLLOW_UP";
}

export function listLeadFollowUpDraftTypes() {
  return LEAD_FOLLOW_UP_DRAFT_TYPES.map((value) => ({
    value,
    label: toTitleCase(value.toLowerCase().replaceAll("_", " "))
      .replace("Bcn", "BCN")
      .replace("Circle Card Signup", "Circle Card signup")
  }));
}

export async function sendLeadFollowUpEmail(input: {
  leadId: string;
  draftType: LeadFollowUpDraftType;
  subject: string;
  body: string;
}) {
  const lead = await getAdminLeadDetail(input.leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }

  const subject = toNullableText(input.subject);
  const body = toNullableText(input.body);
  if (!subject || !body) {
    throw new Error("Subject and body are required.");
  }

  const draft = buildLeadFollowUpDraft(lead, input.draftType);
  if (!draft.canSend) {
    throw new Error(draft.consentReason);
  }

  const result = await sendTransactionalEmail({
    to: lead.email,
    subject,
    text: body,
    html: textToSimpleHtml(body),
    tags: [
      { name: "type", value: "lead-follow-up" },
      { name: "source", value: lead.source.toLowerCase().slice(0, 64) },
      { name: "draft", value: input.draftType.toLowerCase().slice(0, 64) }
    ]
  });

  if (!result.sent) {
    return result;
  }

  const sentAt = new Date();
  await prisma.lead.update({
    where: {
      id: lead.id
    },
    data: {
      lastEmailedAt: sentAt,
      status: lead.status === LeadStatus.NEW ? LeadStatus.CONTACTED : lead.status,
      metadata: mergeLeadFollowUpMetadata({
        metadata: lead.metadata,
        lastDraftType: input.draftType,
        lastSentAt: sentAt,
        lastSentSubject: subject,
        lastResendEmailId: result.id ?? null
      })
    },
    select: {
      id: true
    }
  });

  return result;
}

export function parseLeadSource(value: string): LeadSource | "ALL" {
  return Object.values(LeadSource).includes(value as LeadSource)
    ? (value as LeadSource)
    : "ALL";
}

export function parseLeadStatus(value: string): LeadStatus | "ALL" {
  return Object.values(LeadStatus).includes(value as LeadStatus)
    ? (value as LeadStatus)
    : "ALL";
}

export function parseLeadMarketingFilter(value: string): LeadMarketingFilter {
  if (value === "OPTED_IN" || value === "NOT_OPTED_IN") {
    return value;
  }

  return "ANY";
}

export function parseLeadSegmentFilter(value: string): LeadSegmentFilter {
  if (
    value === "NEW_THIS_WEEK" ||
    value === "AUDIT" ||
    value === "EVENT" ||
    value === "CIRCLE_CARD" ||
    value === "CIRCLE_CARD_PRO_INTEREST" ||
    value === "SALES26"
  ) {
    return value;
  }

  return "ALL";
}

export { LeadSource, LeadStatus, firstNameFromName };
