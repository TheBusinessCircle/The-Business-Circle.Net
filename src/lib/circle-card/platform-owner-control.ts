import type { Role } from "@prisma/client";
import { isAdminRole } from "@/lib/auth/permissions";
import {
  resolveCircleCardEntitlement,
  type CircleCardEntitlement
} from "@/lib/circle-card/permissions";

export type CircleCardPlatformStatusTone = "green" | "amber" | "red";

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
    status: "Coming Next",
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
  { id: "sandbox", label: "Sandbox", status: "pending" },
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
