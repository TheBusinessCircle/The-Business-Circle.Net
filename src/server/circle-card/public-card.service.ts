import "server-only";
import type { MembershipTier, Prisma, Role } from "@prisma/client";
import { SITE_CONFIG } from "@/config/site";
import { readCircleCardSocialLinks, type CircleCardSocialLinks } from "@/lib/circle-card/schema";
import { hasEntitledSubscription } from "@/lib/membership/access";
import { prisma } from "@/lib/prisma";

export type PublicCircleCard = {
  id: string;
  userId: string;
  slug: string;
  fullName: string;
  businessName: string | null;
  role: string | null;
  tagline: string | null;
  about: string | null;
  profileImageUrl: string | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  socialLinks: CircleCardSocialLinks;
  viewCount: number;
  isDemo: boolean;
  user: {
    role: Role;
    membershipTier: MembershipTier;
    foundingTier: MembershipTier | null;
    hasActiveSubscription: boolean;
  };
};

export const DEMO_CIRCLE_CARD: PublicCircleCard = {
  id: "demo",
  userId: "demo",
  slug: "demo",
  fullName: "Trev Clarke",
  businessName: "The Business Circle",
  role: "Founder",
  tagline: "Founder-led rooms for better business relationships.",
  about:
    "Circle Card gives professionals a clean identity layer for the people they meet, the details they need to share, and the relationships worth returning to later.",
  profileImageUrl: "/branding/the-business-circle-logo.png",
  websiteUrl: "https://thebusinesscircle.net",
  email: SITE_CONFIG.supportEmail,
  phone: null,
  location: "United Kingdom",
  socialLinks: {
    linkedin: SITE_CONFIG.social.linkedin,
    instagram: SITE_CONFIG.social.instagram,
    facebook: SITE_CONFIG.social.facebook,
    youtube: SITE_CONFIG.social.youtube
  },
  viewCount: 0,
  isDemo: true,
  user: {
    role: "ADMIN",
    membershipTier: "CORE",
    foundingTier: "CORE",
    hasActiveSubscription: true
  }
};

export async function getPublicCircleCard(slug: string): Promise<PublicCircleCard | null> {
  if (slug === "demo") {
    return DEMO_CIRCLE_CARD;
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      slug,
      isPublished: true,
      user: {
        suspended: false
      }
    },
    select: {
      id: true,
      userId: true,
      slug: true,
      fullName: true,
      businessName: true,
      role: true,
      tagline: true,
      about: true,
      profileImageUrl: true,
      websiteUrl: true,
      email: true,
      phone: true,
      location: true,
      socialLinks: true,
      viewCount: true,
      user: {
        select: {
          role: true,
          membershipTier: true,
          foundingTier: true,
          subscription: {
            select: {
              status: true
            }
          }
        }
      }
    }
  });

  if (!card) {
    return null;
  }

  return {
    ...card,
    user: {
      role: card.user.role,
      membershipTier: card.user.membershipTier,
      foundingTier: card.user.foundingTier,
      hasActiveSubscription:
        card.user.role === "ADMIN"
          ? true
          : hasEntitledSubscription(card.user.subscription?.status ?? null)
    },
    socialLinks: readCircleCardSocialLinks(card.socialLinks as Prisma.JsonValue),
    isDemo: false
  };
}

function escapeVCardValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function fileSafeName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "circle-card"
  );
}

export function buildCircleCardVCard(card: PublicCircleCard) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(card.fullName)}`,
    `N:${escapeVCardValue(card.fullName)};;;;`
  ];

  if (card.businessName) {
    lines.push(`ORG:${escapeVCardValue(card.businessName)}`);
  }

  if (card.role) {
    lines.push(`TITLE:${escapeVCardValue(card.role)}`);
  }

  if (card.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(card.email)}`);
  }

  if (card.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(card.phone)}`);
  }

  if (card.websiteUrl) {
    lines.push(`URL:${escapeVCardValue(card.websiteUrl)}`);
  }

  if (card.location) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(card.location)};;;;`);
  }

  lines.push("END:VCARD");

  return `${lines.join("\r\n")}\r\n`;
}

export function circleCardVCardFilename(card: PublicCircleCard) {
  return `${fileSafeName(card.fullName)}-circle-card.vcf`;
}
