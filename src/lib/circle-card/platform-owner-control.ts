import type { Role } from "@prisma/client";
import { isAdminRole } from "@/lib/auth/permissions";
import {
  resolveCircleCardEntitlement,
  type CircleCardEntitlement
} from "@/lib/circle-card/permissions";

export type CircleCardPlatformStatusTone = "green" | "amber" | "red";
export type CircleCardPlatformOwnerLaunchChecklistStatus =
  | "ready"
  | "attention"
  | "future"
  | "critical";

export type CircleCardControlCentreModule = {
  id: string;
  title: string;
  status: "Coming Next" | "Ready for implementation";
  description: string;
};

export type CircleCardControlCentreRoadmapItem = {
  id: string;
  label: string;
  status: "completed" | "pending";
};

export type CircleCardPlatformOwnerLaunchChecklistItem = {
  id: string;
  label: string;
  status: CircleCardPlatformOwnerLaunchChecklistStatus;
  message: string;
  href?: string;
  actionLabel?: string;
  external?: boolean;
};

export type CircleCardPlatformOwnerLaunchChecklistGroup = {
  id: string;
  title: string;
  items: CircleCardPlatformOwnerLaunchChecklistItem[];
};

export type CircleCardPlatformOwnerBillingReadinessSnapshot = {
  billingEnabled: boolean;
  pro: {
    monthlyPriceConfigured: boolean;
    annualPriceConfigured: boolean;
  };
  teams: {
    monthlyPriceConfigured: boolean;
    annualPriceConfigured: boolean;
  };
};

export type CircleCardPlatformOwnerLaunchChecklistInput = {
  billingReadiness: CircleCardPlatformOwnerBillingReadinessSnapshot;
  platformOwnerDiagnostics: CircleCardPlatformOwnerDiagnostics;
  appUrlConfigured: boolean;
  nextAuthUrlConfigured: boolean;
  cronSecretConfigured: boolean;
  resendConfigured: boolean;
  analyticsConfigured: boolean;
  cardAvailable: boolean;
  publicCardHref?: string | null;
  referralCentreHref: string;
  adminHref: string;
  proHref: string;
  teamsHref: string;
  walletContactCount: number;
  discoverCandidateCount: number;
  notificationCount: number;
};

export const CIRCLE_CARD_CONTROL_CENTRE_DEVELOPMENT_MODULES: CircleCardControlCentreModule[] = [
  {
    id: "membership-preview",
    title: "Membership Preview",
    status: "Ready for implementation",
    description: "Permanent slot for future membership state previews."
  },
  {
    id: "card-preview",
    title: "Card Preview",
    status: "Ready for implementation",
    description: "Permanent slot for card type, theme and device previews."
  },
  {
    id: "sandbox-mode",
    title: "Sandbox Mode",
    status: "Ready for implementation",
    description: "Reserved for non-production testing flows."
  },
  {
    id: "launch-checklist",
    title: "Launch Checklist",
    status: "Ready for implementation",
    description: "Reserved for staged release readiness checks."
  },
  {
    id: "performance-inspector",
    title: "Performance Inspector",
    status: "Coming Next",
    description: "Reserved for future health, speed and rendering diagnostics."
  },
  {
    id: "feature-matrix",
    title: "Feature Matrix",
    status: "Ready for implementation",
    description: "Reserved for plan, role and entitlement comparison."
  },
  {
    id: "developer-tools",
    title: "Developer Tools",
    status: "Coming Next",
    description: "Reserved for internal logs, flags and diagnostics."
  }
];

export const CIRCLE_CARD_CONTROL_CENTRE_ROADMAP: CircleCardControlCentreRoadmapItem[] = [
  { id: "multi-card-foundation", label: "Multi-card foundation", status: "completed" },
  { id: "owner-control-centre", label: "Platform Owner Control Centre", status: "completed" },
  { id: "platform-preview", label: "Platform Preview", status: "pending" },
  { id: "sandbox", label: "Sandbox", status: "completed" },
  { id: "launch-checklist", label: "Launch checklist", status: "completed" },
  { id: "business-card-builder", label: "Business Card Builder", status: "pending" },
  { id: "creator-builder", label: "Creator Builder", status: "pending" },
  { id: "products", label: "Products", status: "pending" },
  { id: "services", label: "Services", status: "pending" },
  { id: "bookings", label: "Bookings", status: "pending" },
  { id: "verification", label: "Verification", status: "pending" },
  { id: "teams", label: "Teams", status: "pending" },
  { id: "commerce", label: "Commerce", status: "pending" }
];

export const CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_MODES = [
  "free",
  "pro",
  "teams",
  "bcn-included-pro",
  "platform-owner"
] as const;

export type CircleCardPlatformOwnerPreviewMode =
  (typeof CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_MODES)[number];

export const CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS: Record<
  CircleCardPlatformOwnerPreviewMode,
  string
> = {
  free: "Free",
  pro: "Pro",
  teams: "Teams",
  "bcn-included-pro": "BCN Included Pro",
  "platform-owner": "Platform Owner"
};

export const CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_MODES = [
  "personal",
  "business",
  "creator",
  "team"
] as const;

export type CircleCardPlatformOwnerCardTypePreviewMode =
  (typeof CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_MODES)[number];

export const CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS: Record<
  CircleCardPlatformOwnerCardTypePreviewMode,
  string
> = {
  personal: "Personal",
  business: "Business",
  creator: "Creator",
  team: "Team"
};

export const CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_MODES = ["off", "on"] as const;

export type CircleCardPlatformOwnerSandboxMode =
  (typeof CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_MODES)[number];

export const CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_LABELS: Record<
  CircleCardPlatformOwnerSandboxMode,
  string
> = {
  off: "Sandbox Off",
  on: "Sandbox On"
};

export type CircleCardPlatformOwnerSandboxProtection = {
  system: string;
  status: string;
};

export const CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_PROTECTIONS: CircleCardPlatformOwnerSandboxProtection[] =
  [
    { system: "Analytics", status: "Suppressed" },
    { system: "Referrals", status: "Suppressed where supported" },
    { system: "Notifications", status: "Suppressed where supported" },
    { system: "Emails", status: "Suppressed where supported" },
    { system: "Database writes", status: "Still real unless explicitly blocked" }
  ];

export type CircleCardPlatformOwnerFeatureMatrixStatus =
  | "Available"
  | "Requires Pro"
  | "Requires Teams"
  | "Coming Soon"
  | "Platform Preview";

export type CircleCardPlatformOwnerFeatureMatrixRow = {
  id: string;
  label: string;
  status: CircleCardPlatformOwnerFeatureMatrixStatus;
};

export function parseCircleCardPlatformOwnerEmails(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveCircleCardPlatformOwnerPreviewMode(
  value?: string | null
): CircleCardPlatformOwnerPreviewMode {
  return CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_MODES.includes(
    value as CircleCardPlatformOwnerPreviewMode
  )
    ? (value as CircleCardPlatformOwnerPreviewMode)
    : "platform-owner";
}

export function resolveCircleCardPlatformOwnerCardTypePreviewMode(
  value?: string | null
): CircleCardPlatformOwnerCardTypePreviewMode {
  return CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_MODES.includes(
    value as CircleCardPlatformOwnerCardTypePreviewMode
  )
    ? (value as CircleCardPlatformOwnerCardTypePreviewMode)
    : "personal";
}

export function resolveCircleCardPlatformOwnerSandboxMode(
  value?: string | null
): CircleCardPlatformOwnerSandboxMode {
  return CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_MODES.includes(
    value as CircleCardPlatformOwnerSandboxMode
  )
    ? (value as CircleCardPlatformOwnerSandboxMode)
    : "off";
}

export function resolveCircleCardPlatformOwnerPreviewEntitlement(
  mode: CircleCardPlatformOwnerPreviewMode,
  platformOwnerEntitlement: CircleCardEntitlement
) {
  switch (mode) {
    case "free":
      return resolveCircleCardEntitlement({
        role: "MEMBER",
        hasActiveSubscription: false,
        suspended: false
      });
    case "pro":
      return resolveCircleCardEntitlement({
        role: "MEMBER",
        hasActiveCircleCardSubscription: true,
        circleCardSubscriptionPlan: "PRO",
        suspended: false
      });
    case "teams":
      return resolveCircleCardEntitlement({
        role: "MEMBER",
        hasActiveCircleCardSubscription: true,
        circleCardSubscriptionPlan: "TEAMS",
        suspended: false
      });
    case "bcn-included-pro":
      return resolveCircleCardEntitlement({
        role: "MEMBER",
        hasActiveSubscription: true,
        suspended: false
      });
    case "platform-owner":
    default:
      return platformOwnerEntitlement;
  }
}

function membershipHasProPreview(mode: CircleCardPlatformOwnerPreviewMode) {
  return mode === "pro" || mode === "teams" || mode === "bcn-included-pro";
}

function membershipHasTeamsPreview(mode: CircleCardPlatformOwnerPreviewMode) {
  return mode === "teams";
}

function platformPreviewStatus(mode: CircleCardPlatformOwnerPreviewMode) {
  return mode === "platform-owner" ? "Platform Preview" : null;
}

function proStatus(mode: CircleCardPlatformOwnerPreviewMode) {
  return platformPreviewStatus(mode) ?? (membershipHasProPreview(mode) ? "Available" : "Requires Pro");
}

function teamsStatus(mode: CircleCardPlatformOwnerPreviewMode) {
  return platformPreviewStatus(mode) ?? (membershipHasTeamsPreview(mode) ? "Available" : "Requires Teams");
}

export function resolveCircleCardPlatformOwnerFeatureMatrix(input: {
  membershipMode: CircleCardPlatformOwnerPreviewMode;
  cardTypeMode: CircleCardPlatformOwnerCardTypePreviewMode;
}): CircleCardPlatformOwnerFeatureMatrixRow[] {
  const { membershipMode, cardTypeMode } = input;
  const platformStatus = platformPreviewStatus(membershipMode);
  const proFeatureStatus = proStatus(membershipMode);
  const teamFeatureStatus = teamsStatus(membershipMode);
  const creatorFeatureStatus =
    platformStatus ?? (cardTypeMode === "creator" ? proFeatureStatus : "Coming Soon");
  const businessFeatureStatus =
    platformStatus ??
    (cardTypeMode === "business" || cardTypeMode === "team" ? proFeatureStatus : "Coming Soon");

  return [
    {
      id: "personal-card",
      label: "Personal Card",
      status: platformStatus ?? "Available"
    },
    {
      id: "business-card",
      label: "Business Card",
      status: platformStatus ?? (membershipHasProPreview(membershipMode) ? "Available" : "Requires Pro")
    },
    {
      id: "creator-card",
      label: "Creator Card",
      status: platformStatus ?? (membershipHasProPreview(membershipMode) ? "Available" : "Requires Pro")
    },
    {
      id: "team-card",
      label: "Team Card",
      status: teamFeatureStatus
    },
    {
      id: "products",
      label: "Products",
      status: businessFeatureStatus
    },
    {
      id: "services",
      label: "Services",
      status: businessFeatureStatus
    },
    {
      id: "downloads",
      label: "Downloads",
      status: proFeatureStatus
    },
    {
      id: "video-intro",
      label: "Video Intro",
      status: creatorFeatureStatus
    },
    {
      id: "lead-capture",
      label: "Lead Capture",
      status: proFeatureStatus
    },
    {
      id: "staff-cards",
      label: "Staff Cards",
      status: teamFeatureStatus
    },
    {
      id: "team-analytics",
      label: "Team Analytics",
      status: teamFeatureStatus
    }
  ];
}

function priceIdStatus(input: {
  billingEnabled: boolean;
  monthlyConfigured: boolean;
  annualConfigured: boolean;
  label: string;
}): CircleCardPlatformOwnerLaunchChecklistItem["status"] {
  if (input.monthlyConfigured && input.annualConfigured) {
    return "ready";
  }

  if (input.billingEnabled) {
    return "critical";
  }

  return input.monthlyConfigured || input.annualConfigured ? "attention" : "future";
}

function priceIdMessage(input: {
  billingEnabled: boolean;
  monthlyConfigured: boolean;
  annualConfigured: boolean;
  label: string;
}) {
  if (input.monthlyConfigured && input.annualConfigured) {
    return `${input.label} price IDs configured.`;
  }

  if (input.billingEnabled) {
    return `${input.label} price IDs missing while billing is enabled.`;
  }

  if (input.monthlyConfigured || input.annualConfigured) {
    return `${input.label} price IDs are partially configured. Billing remains disabled.`;
  }

  return `${input.label} price IDs missing. Billing is disabled, so paid checkout remains inactive.`;
}

export function buildCircleCardPlatformOwnerLaunchChecklist(
  input: CircleCardPlatformOwnerLaunchChecklistInput
): CircleCardPlatformOwnerLaunchChecklistGroup[] {
  const envReady = input.appUrlConfigured && input.nextAuthUrlConfigured;
  const proPrice = {
    billingEnabled: input.billingReadiness.billingEnabled,
    monthlyConfigured: input.billingReadiness.pro.monthlyPriceConfigured,
    annualConfigured: input.billingReadiness.pro.annualPriceConfigured,
    label: "Pro"
  };
  const teamsPrice = {
    billingEnabled: input.billingReadiness.billingEnabled,
    monthlyConfigured: input.billingReadiness.teams.monthlyPriceConfigured,
    annualConfigured: input.billingReadiness.teams.annualPriceConfigured,
    label: "Teams"
  };
  const allStripePricesReady =
    proPrice.monthlyConfigured &&
    proPrice.annualConfigured &&
    teamsPrice.monthlyConfigured &&
    teamsPrice.annualConfigured;

  return [
    {
      id: "core-system",
      title: "Core System",
      items: [
        {
          id: "build-status",
          label: "Build status",
          status: "ready",
          message: "Dashboard build is serving the owner-only checklist."
        },
        {
          id: "database-migrations",
          label: "Database migrations",
          status: "attention",
          message: "Confirm prisma migrate deploy in the deployment pipeline. This panel is read-only."
        },
        {
          id: "environment-variables",
          label: "Environment variables",
          status: envReady && input.platformOwnerDiagnostics.ownerEmailAllowlistPresent ? "ready" : "attention",
          message:
            envReady && input.platformOwnerDiagnostics.ownerEmailAllowlistPresent
              ? "APP_URL, NEXTAUTH_URL and owner allowlist are present."
              : "Check APP_URL, NEXTAUTH_URL and owner allowlist before launch."
        },
        {
          id: "public-card-routes",
          label: "Public card routes",
          status: "ready",
          message: input.cardAvailable
            ? "Public /card routes are available for the current card."
            : "Public /card routes exist. Create or select a card before live promotion.",
          href: input.publicCardHref ?? undefined,
          actionLabel: input.publicCardHref ? "Open public card" : undefined,
          external: Boolean(input.publicCardHref)
        }
      ]
    },
    {
      id: "growth-system",
      title: "Growth System",
      items: [
        {
          id: "notifications",
          label: "Notifications",
          status: "ready",
          message: `${input.notificationCount} notification${input.notificationCount === 1 ? "" : "s"} loaded for the owner dashboard.`
        },
        {
          id: "weekly-emails",
          label: "Weekly emails",
          status: input.cronSecretConfigured && input.resendConfigured ? "ready" : "attention",
          message:
            input.cronSecretConfigured && input.resendConfigured
              ? "Weekly summary route has CRON_SECRET and Resend email configuration."
              : "Weekly emails need CRON_SECRET plus RESEND_API_KEY and RESEND_FROM_EMAIL."
        },
        {
          id: "referral-engine",
          label: "Referral engine",
          status: "ready",
          message: "Referral engine configured. Payouts inactive.",
          href: input.referralCentreHref,
          actionLabel: "Open referral centre"
        },
        {
          id: "discover-privacy",
          label: "Discover privacy",
          status: "ready",
          message: `${input.discoverCandidateCount} visible Discover candidate${input.discoverCandidateCount === 1 ? "" : "s"} in this dashboard view. Discover remains opt-in.`
        },
        {
          id: "analytics",
          label: "Analytics",
          status: input.analyticsConfigured ? "ready" : "attention",
          message: input.analyticsConfigured
            ? "Analytics events and dashboard summary are available."
            : "Analytics summary is empty or not available for the selected card."
        }
      ]
    },
    {
      id: "billing-readiness",
      title: "Billing Readiness",
      items: [
        {
          id: "circle-card-billing-flag",
          label: "Circle Card billing flag",
          status:
            input.billingReadiness.billingEnabled && !allStripePricesReady ? "critical" : "ready",
          message: input.billingReadiness.billingEnabled
            ? "CIRCLE_CARD_BILLING_ENABLED is true. Stripe price IDs must be complete before paid launch."
            : "CIRCLE_CARD_BILLING_ENABLED is false. Billing is safely disabled."
        },
        {
          id: "stripe-pro-price-ids",
          label: "Stripe Pro price IDs",
          status: priceIdStatus(proPrice),
          message: priceIdMessage(proPrice),
          href: input.proHref,
          actionLabel: "Open Pro page"
        },
        {
          id: "stripe-teams-price-ids",
          label: "Stripe Teams price IDs",
          status: priceIdStatus(teamsPrice),
          message: priceIdMessage(teamsPrice),
          href: input.teamsHref,
          actionLabel: "Open Teams page"
        }
      ]
    },
    {
      id: "user-experience",
      title: "User Experience",
      items: [
        {
          id: "wallet",
          label: "Wallet",
          status: "ready",
          message: `${input.walletContactCount} wallet contact${input.walletContactCount === 1 ? "" : "s"} loaded for this account.`
        },
        {
          id: "pwa-icons",
          label: "PWA icons",
          status: "ready",
          message: "Circle Card manifest route exists."
        },
        {
          id: "mobile-layout-readiness",
          label: "Mobile layout readiness",
          status: "ready",
          message: "Dashboard sections use responsive grids and compact owner controls."
        }
      ]
    },
    {
      id: "admin-owner-tools",
      title: "Admin / Owner Tools",
      items: [
        {
          id: "admin-access",
          label: "Admin access",
          status: input.platformOwnerDiagnostics.platformOwnerResolved ? "ready" : "critical",
          message: input.platformOwnerDiagnostics.platformOwnerResolved
            ? "Platform Owner resolved through admin access and allowlisted email."
            : "Platform Owner is not resolved for this session.",
          href: input.adminHref,
          actionLabel: "Open admin page"
        }
      ]
    }
  ];
}

export type CircleCardPlatformOwnerInput = {
  role?: Role | null;
  email?: string | null;
  hasAdminAccess?: boolean;
};

export type CircleCardPlatformOwnerDiagnostics = {
  currentUserEmail: string;
  currentUserRole: string;
  ownerEmailAllowlistPresent: boolean;
  hasAdminAccess: boolean;
  platformOwnerResolved: boolean;
};

export function hasCircleCardPlatformOwnerAdminAccess(input: CircleCardPlatformOwnerInput) {
  return Boolean(input.hasAdminAccess || (input.role && isAdminRole(input.role)));
}

export function resolveCircleCardPlatformOwnerDiagnostics(
  input: CircleCardPlatformOwnerInput,
  ownerEmailConfig = process.env.CIRCLE_CARD_PLATFORM_OWNER_EMAILS ?? process.env.PLATFORM_OWNER_EMAILS
): CircleCardPlatformOwnerDiagnostics {
  const ownerEmails = parseCircleCardPlatformOwnerEmails(ownerEmailConfig);
  const currentUserEmail = input.email?.trim().toLowerCase() ?? "";
  const hasAdminAccess = hasCircleCardPlatformOwnerAdminAccess(input);
  const platformOwnerResolved =
    hasAdminAccess && ownerEmails.length > 0 && ownerEmails.includes(currentUserEmail);

  return {
    currentUserEmail: input.email?.trim() ?? "",
    currentUserRole: input.role ?? "unknown",
    ownerEmailAllowlistPresent: ownerEmails.length > 0,
    hasAdminAccess,
    platformOwnerResolved
  };
}

export function isCircleCardPlatformOwner(
  input: CircleCardPlatformOwnerInput,
  ownerEmailConfig = process.env.CIRCLE_CARD_PLATFORM_OWNER_EMAILS ?? process.env.PLATFORM_OWNER_EMAILS
) {
  return resolveCircleCardPlatformOwnerDiagnostics(input, ownerEmailConfig).platformOwnerResolved;
}
