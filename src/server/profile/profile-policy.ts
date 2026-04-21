import type { MemberProfileModel } from "@/types";
import { getProfileCompletion } from "@/lib/profile";

export function calculateProfileCompletion(profile: MemberProfileModel): number {
  const completion = getProfileCompletion({
    name: profile.fullName,
    bio: profile.bio,
    location: profile.location,
    experience: profile.experience,
    companyName: profile.companyName,
    businessDescription: profile.companyDescription,
    industry: profile.industry,
    services: profile.services,
    website: profile.website,
    instagram: profile.instagram,
    linkedin: profile.linkedin,
    tiktok: profile.tiktok,
    facebook: profile.facebook,
    youtube: profile.youtube,
    customLinks: profile.customLinks,
    collaborationNeeds: profile.collaborationNeeds,
    collaborationOffers: profile.collaborationOffers,
    partnershipInterests: profile.partnershipInterests
  });

  return completion.percentage;
}
