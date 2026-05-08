import {
  PendingRegistrationStatus,
  SubscriptionStatus,
  TestimonialProofType,
  TestimonialSourceType,
  TestimonialStatus,
  type MembershipTier
} from "@prisma/client";
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/analytics";
import { db } from "@/lib/db";

const ACTIVE_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
] as const;

const LATEST_LIMIT = 8;

type ProfileInput = {
  bio: string | null;
  location: string | null;
  experience: string | null;
  collaborationNeeds: string | null;
  collaborationOffers: string | null;
  accentTheme: string | null;
  updatedAt: Date;
  business: {
    companyName: string | null;
    description: string | null;
    industry: string | null;
    services: string | null;
  } | null;
} | null;

export type LaunchProfileCompletionState = "Complete" | "In progress" | "Not started";

export type LaunchPaidMember = {
  id: string;
  name: string | null;
  email: string;
  tier: MembershipTier;
  subscriptionStatus: SubscriptionStatus;
  joinedAt: Date;
  profileState: LaunchProfileCompletionState;
  acceptedRules: boolean;
  accentThemeSelected: boolean;
};

export type LaunchPendingTestimonial = {
  id: string;
  proofType: TestimonialProofType;
  sourceType: TestimonialSourceType;
  authorName: string;
  businessName: string | null;
  submittedEmail: string | null;
  createdAt: Date;
  quotePreview: string;
};

export type LaunchFounderRequest = {
  id: string;
  fullName: string;
  email: string;
  businessName: string;
  serviceTitle: string;
  paymentStatus: string;
  serviceStatus: string;
  createdAt: Date;
};

export type LaunchAnalyticsSignal = {
  event: AnalyticsEventName;
  label: string;
  count: number | null;
  source: string;
  status: "connected" | "proxy" | "prepared";
};

export type LaunchManualAction = {
  id: string;
  label: string;
  detail: string;
  href: string;
  count?: number;
};

export type LaunchCommandCentreData = {
  counts: {
    latestPaidMembers: number;
    newPaidMembers7d: number;
    pendingTestimonials: number;
    founderRequests7d: number;
    checkoutStarted7d: number;
    registrationStarted7d: number;
    profileSaved7d: number;
    founderServiceSubmitted7d: number;
    pendingCheckoutFollowUps: number;
  };
  latestPaidMembers: LaunchPaidMember[];
  pendingTestimonials: LaunchPendingTestimonial[];
  founderRequests: LaunchFounderRequest[];
  analyticsSignals: LaunchAnalyticsSignal[];
  manualActions: LaunchManualAction[];
  analyticsStorageConnected: boolean;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getLaunchProfileCompletionState(
  profile: ProfileInput
): LaunchProfileCompletionState {
  if (!profile) {
    return "Not started";
  }

  const requiredValues = [
    profile.bio,
    profile.location,
    profile.experience,
    profile.collaborationNeeds,
    profile.collaborationOffers,
    profile.business?.companyName,
    profile.business?.description,
    profile.business?.industry,
    profile.business?.services
  ];
  const completedCount = requiredValues.filter(hasText).length;

  if (completedCount === requiredValues.length) {
    return "Complete";
  }

  return completedCount > 0 ? "In progress" : "Not started";
}

function trimPreview(value: string, maxLength = 140) {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function buildAnalyticsSignals(input: {
  registrationStarted7d: number;
  checkoutStarted7d: number;
  profileSaved7d: number;
  founderServiceSubmitted7d: number;
}): LaunchAnalyticsSignal[] {
  return [
    {
      event: ANALYTICS_EVENTS.auditStart,
      label: "Audit starts",
      count: null,
      source: "Client analytics helper, storage not connected yet",
      status: "prepared"
    },
    {
      event: ANALYTICS_EVENTS.auditComplete,
      label: "Audit completions",
      count: null,
      source: "Client analytics helper, storage not connected yet",
      status: "prepared"
    },
    {
      event: ANALYTICS_EVENTS.checkoutStarted,
      label: "Checkout started",
      count: input.checkoutStarted7d,
      source: "Pending registration checkout sessions, last 7 days",
      status: "proxy"
    },
    {
      event: ANALYTICS_EVENTS.registrationStarted,
      label: "Registration started",
      count: input.registrationStarted7d,
      source: "Pending registration records, last 7 days",
      status: "proxy"
    },
    {
      event: ANALYTICS_EVENTS.profileSaved,
      label: "Profile saved",
      count: input.profileSaved7d,
      source: "Profile updates, last 7 days",
      status: "proxy"
    },
    {
      event: ANALYTICS_EVENTS.founderServiceRequestSubmitted,
      label: "Founder service request submitted",
      count: input.founderServiceSubmitted7d,
      source: "Founder service request records, last 7 days",
      status: "proxy"
    }
  ];
}

function buildManualActions(input: {
  pendingTestimonials: number;
  pendingCheckoutFollowUps: number;
  founderRequests7d: number;
  incompleteLatestMembers: number;
  rulesOutstanding: number;
}): LaunchManualAction[] {
  const actions: LaunchManualAction[] = [];

  if (input.pendingTestimonials > 0) {
    actions.push({
      id: "review-testimonials",
      label: "Review pending testimonials",
      detail: "Approve, reject, or archive submitted proof before it can appear publicly.",
      href: "/admin/testimonials?status=PENDING",
      count: input.pendingTestimonials
    });
  }

  if (input.incompleteLatestMembers > 0) {
    actions.push({
      id: "welcome-profile-prompts",
      label: "Send manual welcome and profile prompts",
      detail: "New paid members still need a profile nudge before the room becomes useful.",
      href: "/admin/members",
      count: input.incompleteLatestMembers
    });
  }

  if (input.rulesOutstanding > 0) {
    actions.push({
      id: "rules-prompts",
      label: "Prompt rules acceptance",
      detail: "Some new paid members have not accepted BCN Rules yet.",
      href: "/admin/members",
      count: input.rulesOutstanding
    });
  }

  if (input.pendingCheckoutFollowUps > 0) {
    actions.push({
      id: "checkout-follow-up",
      label: "Follow up started checkouts",
      detail: "Pending registrations have checkout sessions but have not completed membership.",
      href: "/admin/members",
      count: input.pendingCheckoutFollowUps
    });
  }

  if (input.founderRequests7d > 0) {
    actions.push({
      id: "review-founder-requests",
      label: "Review Founder service requests",
      detail: "New Growth Architect or founder service requests need admin review.",
      href: "/admin/founder-services",
      count: input.founderRequests7d
    });
  }

  actions.push({
    id: "analytics-storage",
    label: "Connect analytics storage when ready",
    detail: "Audit starts and completions are tracked by the helper but not persisted for admin counts yet.",
    href: "/admin/launch"
  });

  return actions;
}

export async function getLaunchCommandCentreData(): Promise<LaunchCommandCentreData> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    subscriptions,
    newPaidMembers7d,
    pendingTestimonialsCount,
    pendingTestimonials,
    founderRequests7d,
    founderRequests,
    registrationStarted7d,
    checkoutStarted7d,
    profileSaved7d,
    founderServiceSubmitted7d,
    pendingCheckoutFollowUps
  ] = await Promise.all([
    db.subscription.findMany({
      where: {
        status: {
          in: [...ACTIVE_SUBSCRIPTION_STATUSES]
        }
      },
      orderBy: [{ lastInvoicePaidAt: "desc" }, { createdAt: "desc" }],
      take: LATEST_LIMIT,
      select: {
        id: true,
        status: true,
        tier: true,
        createdAt: true,
        lastInvoicePaidAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            membershipTier: true,
            acceptedRulesAt: true,
            createdAt: true,
            profile: {
              select: {
                bio: true,
                location: true,
                experience: true,
                collaborationNeeds: true,
                collaborationOffers: true,
                accentTheme: true,
                updatedAt: true,
                business: {
                  select: {
                    companyName: true,
                    description: true,
                    industry: true,
                    services: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    db.subscription.count({
      where: {
        status: {
          in: [...ACTIVE_SUBSCRIPTION_STATUSES]
        },
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.testimonial.count({
      where: {
        status: TestimonialStatus.PENDING,
        quote: {
          not: ""
        }
      }
    }),
    db.testimonial.findMany({
      where: {
        status: TestimonialStatus.PENDING,
        quote: {
          not: ""
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: LATEST_LIMIT,
      select: {
        id: true,
        proofType: true,
        sourceType: true,
        authorName: true,
        businessName: true,
        submittedEmail: true,
        createdAt: true,
        quote: true
      }
    }),
    db.founderServiceRequest.count({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.founderServiceRequest.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: LATEST_LIMIT,
      select: {
        id: true,
        fullName: true,
        email: true,
        businessName: true,
        paymentStatus: true,
        serviceStatus: true,
        createdAt: true,
        service: {
          select: {
            title: true
          }
        }
      }
    }),
    db.pendingRegistration.count({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.pendingRegistration.count({
      where: {
        createdAt: {
          gte: weekAgo
        },
        stripeCheckoutSessionId: {
          not: null
        }
      }
    }),
    db.profile.count({
      where: {
        updatedAt: {
          gte: weekAgo
        }
      }
    }),
    db.founderServiceRequest.count({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.pendingRegistration.count({
      where: {
        status: PendingRegistrationStatus.PENDING,
        stripeCheckoutSessionId: {
          not: null
        }
      }
    })
  ]);

  const latestPaidMembers = subscriptions.map((subscription) => {
    const profile = subscription.user.profile;

    return {
      id: subscription.user.id,
      name: subscription.user.name,
      email: subscription.user.email,
      tier: subscription.tier ?? subscription.user.membershipTier,
      subscriptionStatus: subscription.status,
      joinedAt: subscription.lastInvoicePaidAt ?? subscription.createdAt ?? subscription.user.createdAt,
      profileState: getLaunchProfileCompletionState(profile),
      acceptedRules: Boolean(subscription.user.acceptedRulesAt),
      accentThemeSelected: Boolean(profile?.accentTheme)
    };
  });
  const incompleteLatestMembers = latestPaidMembers.filter(
    (member) => member.profileState !== "Complete"
  ).length;
  const rulesOutstanding = latestPaidMembers.filter((member) => !member.acceptedRules).length;

  const analyticsSignals = buildAnalyticsSignals({
    registrationStarted7d,
    checkoutStarted7d,
    profileSaved7d,
    founderServiceSubmitted7d
  });

  return {
    counts: {
      latestPaidMembers: latestPaidMembers.length,
      newPaidMembers7d,
      pendingTestimonials: pendingTestimonialsCount,
      founderRequests7d,
      checkoutStarted7d,
      registrationStarted7d,
      profileSaved7d,
      founderServiceSubmitted7d,
      pendingCheckoutFollowUps
    },
    latestPaidMembers,
    pendingTestimonials: pendingTestimonials.map((testimonial) => ({
      id: testimonial.id,
      proofType: testimonial.proofType,
      sourceType: testimonial.sourceType,
      authorName: testimonial.authorName,
      businessName: testimonial.businessName,
      submittedEmail: testimonial.submittedEmail,
      createdAt: testimonial.createdAt,
      quotePreview: trimPreview(testimonial.quote)
    })),
    founderRequests: founderRequests.map((request) => ({
      id: request.id,
      fullName: request.fullName,
      email: request.email,
      businessName: request.businessName,
      serviceTitle: request.service.title,
      paymentStatus: request.paymentStatus,
      serviceStatus: request.serviceStatus,
      createdAt: request.createdAt
    })),
    analyticsSignals,
    manualActions: buildManualActions({
      pendingTestimonials: pendingTestimonialsCount,
      pendingCheckoutFollowUps,
      founderRequests7d,
      incompleteLatestMembers,
      rulesOutstanding
    }),
    analyticsStorageConnected: analyticsSignals.every((signal) => signal.status === "connected")
  };
}
