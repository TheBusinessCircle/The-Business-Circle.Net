import { BusinessStage, MembershipTier } from "@prisma/client";

export interface MemberProfileModel {
  userId: string;
  fullName: string;
  image?: string | null;
  membershipTier: MembershipTier;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  experience?: string | null;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
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
  headline: string;
  bio: string;
  location: string;
  experience: string;
  website: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  collaborationNeeds: string;
  collaborationOffers: string;
  partnershipInterests: string;
  collaborationTags: string;
  companyName: string;
  businessDescription: string;
  industry: string;
  services: string;
  businessStage: BusinessStage | "";
}
