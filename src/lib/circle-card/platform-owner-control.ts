import type { Role } from "@prisma/client";

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

export function parseCircleCardPlatformOwnerEmails(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isCircleCardPlatformOwner(
  input: {
    role?: Role | null;
    email?: string | null;
  },
  ownerEmailConfig = process.env.CIRCLE_CARD_PLATFORM_OWNER_EMAILS ?? process.env.PLATFORM_OWNER_EMAILS
) {
  if (input.role !== "ADMIN") {
    return false;
  }

  const ownerEmails = parseCircleCardPlatformOwnerEmails(ownerEmailConfig);

  if (!ownerEmails.length) {
    return false;
  }

  return ownerEmails.includes(input.email?.trim().toLowerCase() ?? "");
}
