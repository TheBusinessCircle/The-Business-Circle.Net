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
