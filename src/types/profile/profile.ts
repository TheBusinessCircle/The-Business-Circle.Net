import { BusinessStage, MemberRoleTag, MembershipTier } from "@prisma/client";
import type { AccentTheme } from "@/lib/accent-themes";

export interface MemberProfileModel {
  userId: string;
  fullName: string;
  image?: string | null;
  membershipTier: MembershipTier;
  memberRoleTag: MemberRoleTag;
  acceptedRulesAt?: Date | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  experience?: string | null;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  customLinks: string[];
  accentTheme?: string | null;
  workspaceAtmosphereEnabled?: boolean | null;
  companyName?: string | null;
  companyDescription?: string | null;
  industry?: string | null;
  services?: string | null;
  businessStage?: BusinessStage | null;
  collaborationNeeds?: string | null;
  collaborationOffers?: string | null;
  partnershipInterests?: string | null;
  collaborationTags: string[];
  isPublic?: boolean;
}

export interface MemberProfileFormModel {
  name: string;
  profileImage: string;
  memberRoleTag: MemberRoleTag;
  headline: string;
  bio: string;
  location: string;
  experience: string;
  website: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  facebook: string;
  youtube: string;
  customLinks: string;
  accentTheme: AccentTheme;
  workspaceAtmosphereEnabled: boolean;
  collaborationNeeds: string;
  collaborationOffers: string;
  partnershipInterests: string;
  collaborationTags: string;
  companyName: string;
  businessDescription: string;
  industry: string;
  services: string;
  businessStage: BusinessStage | "";
  acceptedRules: boolean;
}
