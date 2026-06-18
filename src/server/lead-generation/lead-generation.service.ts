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

export type ListAdminLeadsInput = {
  query?: string;
  source?: LeadSource | "ALL";
  status?: LeadStatus | "ALL";
  marketing?: LeadMarketingFilter;
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
  resultType: string;
  recommendedTier: string;
  answers: Array<{ questionId: string; score: number | null }>;
  strengths: string[];
  weaknesses: string[];
  sourcePath?: string | null;
  source?: string | null;
  topic?: string | null;
};

export type AdminLeadListItem = Awaited<ReturnType<typeof listAdminLeads>>["items"][number];

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

function firstNameFromName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
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
        `Score: ${input.score} of 30`,
        `Result: ${input.resultType}`,
        `Recommended tier: ${input.recommendedTier}`,
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
    tags: [
      "circle-card",
      "free",
      input.registrationSource === "circle-card-spin" ? "spin-to-connect" : "",
      input.sourceCardSlug ? `source-card:${input.sourceCardSlug}` : ""
    ],
    metadata: {
      registrationSource: input.registrationSource,
      sourceCardSlug: input.sourceCardSlug ?? null,
      returnTo: input.returnTo ?? null
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
    consentSource: "Contact Form",
    essentialConsent: true,
    marketingEmailOptIn: false,
    tags: ["contact-form", input.source ?? "website"],
    metadata: {
      sourcePath: input.sourcePath ?? "/contact",
      source: input.source ?? "website"
    } satisfies Prisma.InputJsonObject
  });
}

export async function recordAuditQuizLead(input: RecordAuditQuizLeadInput) {
  const now = new Date();
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
    tags: ["audit", "founder-audit", input.recommendedTier, input.resultType],
    score: input.score,
    metadata: {
      resultType: input.resultType,
      recommendedTier: input.recommendedTier,
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

function buildLeadWhere(input: ListAdminLeadsInput): Prisma.LeadWhereInput {
  const query = input.query?.trim();

  return {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { businessName: { contains: query, mode: "insensitive" } },
            { website: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
            { tags: { has: query.toLowerCase() } }
          ]
        }
      : {}),
    ...(input.source && input.source !== "ALL" ? { source: input.source } : {}),
    ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
    ...(input.marketing === "OPTED_IN"
      ? { marketingEmailOptIn: true }
      : input.marketing === "NOT_OPTED_IN"
        ? { marketingEmailOptIn: false }
        : {})
  };
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

export async function updateLeadForAdmin(input: {
  leadId: string;
  status: LeadStatus;
  notes?: string | null;
}) {
  return prisma.lead.update({
    where: {
      id: input.leadId
    },
    data: {
      status: input.status,
      notes: toNullableText(input.notes)
    },
    select: {
      id: true
    }
  });
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

export { LeadSource, LeadStatus, firstNameFromName };
