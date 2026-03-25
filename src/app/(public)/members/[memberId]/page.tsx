import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PublicMemberProfileView } from "@/components/profile";
import { SITE_CONFIG } from "@/config/site";
import { buildMemberProfilePath } from "@/lib/member-paths";
import { absoluteUrl } from "@/lib/utils";
import { getProfileCompletion } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { getRecentActivityByUserIds } from "@/server/community/member-activity.service";
import { getCommunityRecognitionForUser } from "@/server/community-recognition";

type PageProps = {
  params: Promise<{ memberId: string }>;
};

export const dynamic = "force-dynamic";

async function getMemberProfileRouteData(memberId: string, viewerUserId?: string | null) {
  const isSelfPreview = viewerUserId === memberId;

  return prisma.user.findFirst({
    where: {
      id: memberId,
      suspended: false,
      ...(isSelfPreview
        ? {}
        : {
            profile: {
              is: {
                isPublic: true
              }
            }
          })
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      membershipTier: true,
      memberRoleTag: true,
      foundingTier: true,
      profile: {
        select: {
          headline: true,
          bio: true,
          location: true,
          experience: true,
          website: true,
          instagram: true,
          linkedin: true,
          tiktok: true,
          collaborationNeeds: true,
          collaborationOffers: true,
          partnershipInterests: true,
          collaborationTags: true,
          business: {
            select: {
              companyName: true,
              description: true,
              industry: true,
              services: true,
              stage: true,
              website: true,
              isPublic: true
            }
          }
        }
      }
    }
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const session = await auth();
  const { memberId } = await params;
  const member = await getMemberProfileRouteData(memberId, session?.user?.id);

  if (!member) {
    return {
      metadataBase: new URL(SITE_CONFIG.url),
      title: "Member Profile",
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const displayName = member.name || member.email || "Business Circle Member";
  const title = `${displayName} | Member Profile`;
  const description =
    member.profile?.bio?.slice(0, 155) ||
    `${displayName}'s public profile in The Business Circle Network.`;
  const profilePath = buildMemberProfilePath(member.id);
  const shareImage =
    member.image && /^https?:\/\//i.test(member.image)
      ? member.image
      : absoluteUrl(member.image || "/opengraph-image");

  return {
    metadataBase: new URL(SITE_CONFIG.url),
    title,
    description,
    alternates: {
      canonical: profilePath
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: absoluteUrl(profilePath),
      images: [{ url: shareImage }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage]
    }
  };
}

export default async function PublicMemberProfilePage({ params }: PageProps) {
  const session = await auth();
  const { memberId } = await params;
  const viewerUserId = session?.user?.id ?? null;
  const [user, recognition, activityByUserId] = await Promise.all([
    getMemberProfileRouteData(memberId, viewerUserId),
    getCommunityRecognitionForUser(memberId),
    getRecentActivityByUserIds([memberId])
  ]);

  if (!user) {
    notFound();
  }

  const completion = getProfileCompletion({
    name: user.name || user.email,
    bio: user.profile?.bio,
    location: user.profile?.location,
    experience: user.profile?.experience,
    companyName: user.profile?.business?.companyName,
    businessDescription: user.profile?.business?.description,
    industry: user.profile?.business?.industry,
    services: user.profile?.business?.services,
    website: user.profile?.website || user.profile?.business?.website,
    instagram: user.profile?.instagram,
    linkedin: user.profile?.linkedin,
    tiktok: user.profile?.tiktok,
    collaborationNeeds: user.profile?.collaborationNeeds,
    collaborationOffers: user.profile?.collaborationOffers,
    partnershipInterests: user.profile?.partnershipInterests
  });

  const isSelfPreview = viewerUserId === user.id;
  const business = isSelfPreview
    ? user.profile?.business
    : user.profile?.business?.isPublic
      ? user.profile.business
      : null;

  return (
    <PublicMemberProfileView
      completion={completion}
      member={{
        id: user.id,
        name: user.name || user.email,
        image: user.image,
        membershipTier: user.membershipTier,
        memberRoleTag: user.memberRoleTag,
        foundingTier: user.foundingTier,
        headline: user.profile?.headline,
        bio: user.profile?.bio,
        location: user.profile?.location,
        experience: user.profile?.experience,
        website: user.profile?.website,
        instagram: user.profile?.instagram,
        linkedin: user.profile?.linkedin,
        tiktok: user.profile?.tiktok,
        collaborationNeeds: user.profile?.collaborationNeeds,
        collaborationOffers: user.profile?.collaborationOffers,
        partnershipInterests: user.profile?.partnershipInterests,
        collaborationTags: user.profile?.collaborationTags ?? [],
        business,
        lastActiveAt: activityByUserId.get(user.id) ?? null
      }}
      recognition={recognition}
    />
  );
}
