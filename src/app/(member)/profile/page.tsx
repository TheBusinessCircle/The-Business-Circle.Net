import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CommunityRecognitionPanel } from "@/components/profile";
import { ProfileForm } from "@/components/platform/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { buildMemberProfilePath } from "@/lib/member-paths";
import { roleToTier } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { getCommunityRecognitionForUser } from "@/server/community-recognition";

export const metadata: Metadata = createPageMetadata({
  title: "Member Profile",
  description:
    "Update your Business Circle profile to improve visibility in the directory and unlock better collaboration.",
  path: "/profile"
});

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser();

  const [user, recognition] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: {
          include: {
            business: true
          }
        }
      }
    }),
    getCommunityRecognitionForUser(session.user.id)
  ]);

  if (!user) {
    return null;
  }

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const memberProfileHref = buildMemberProfilePath(user.id);

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Profile Settings</CardTitle>
          <CardDescription className="text-base">
            Build a complete member profile so other founders can find you, trust you, and collaborate faster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <FoundingBadge tier={session.user.foundingTier} />
          </div>
          <Link
            href={memberProfileHref}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open public profile <ArrowUpRight size={14} />
          </Link>
        </CardContent>
      </Card>

      <CommunityRecognitionPanel
        recognition={recognition}
        description="Your visible standing across the community, member directory, and chat."
      />

      <ProfileForm
        initialValues={{
          name: user.name || "",
          profileImage: user.image || "",
          memberRoleTag: user.memberRoleTag,
          headline: user.profile?.headline || "",
          bio: user.profile?.bio || "",
          location: user.profile?.location || "",
          experience: user.profile?.experience || "",
          website: user.profile?.website || user.profile?.business?.website || "",
          instagram: user.profile?.instagram || "",
          linkedin: user.profile?.linkedin || "",
          tiktok: user.profile?.tiktok || "",
          facebook: user.profile?.facebook || "",
          youtube: user.profile?.youtube || "",
          customLinks: JSON.stringify(user.profile?.customLinks ?? []),
          collaborationNeeds: user.profile?.collaborationNeeds || "",
          collaborationOffers: user.profile?.collaborationOffers || "",
          partnershipInterests: user.profile?.partnershipInterests || "",
          collaborationTags: user.profile?.collaborationTags?.join(", ") || "",
          companyName: user.profile?.business?.companyName || "",
          businessStatus: user.profile?.business?.status || "",
          companyNumber: user.profile?.business?.companyNumber || "",
          businessDescription: user.profile?.business?.description || "",
          industry: user.profile?.business?.industry || "",
          services: user.profile?.business?.services || "",
          businessStage: user.profile?.business?.stage || ""
        }}
        membershipTier={effectiveTier}
        memberProfileHref={memberProfileHref}
      />
    </div>
  );
}
