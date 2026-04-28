import { db } from "@/lib/db";
import type { MemberProfileModel } from "@/types";

export async function getMemberProfile(userId: string): Promise<MemberProfileModel | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          business: true
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    fullName: user.name || user.email,
    image: user.image,
    membershipTier: user.membershipTier,
    memberRoleTag: user.memberRoleTag,
    acceptedRulesAt: user.acceptedRulesAt,
    headline: user.profile?.headline,
    bio: user.profile?.bio,
    location: user.profile?.location,
    experience: user.profile?.experience,
    website: user.profile?.website,
    linkedin: user.profile?.linkedin,
    instagram: user.profile?.instagram,
    tiktok: user.profile?.tiktok,
    facebook: user.profile?.facebook,
    youtube: user.profile?.youtube,
    customLinks: user.profile?.customLinks ?? [],
    accentTheme: user.profile?.accentTheme,
    workspaceAtmosphereEnabled: user.profile?.workspaceAtmosphereEnabled ?? false,
    companyName: user.profile?.business?.companyName,
    companyDescription: user.profile?.business?.description,
    industry: user.profile?.business?.industry,
    services: user.profile?.business?.services,
    businessStage: user.profile?.business?.stage,
    collaborationNeeds: user.profile?.collaborationNeeds,
    collaborationOffers: user.profile?.collaborationOffers,
    partnershipInterests: user.profile?.partnershipInterests,
    collaborationTags: user.profile?.collaborationTags ?? [],
    isPublic: user.profile?.isPublic
  };
}
