import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PublicCircleCardProfile } from "@/components/circle-card";
import { SITE_CONFIG } from "@/config/site";
import { getCircleCardAccountLabel } from "@/lib/circle-card/permissions";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { getPublicCircleCard, trackCircleCardEvent } from "@/server/circle-card";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function incrementViewCount(
  card: Awaited<ReturnType<typeof getPublicCircleCard>>,
  input: {
    visitorId?: string | null;
    userId?: string | null;
    viewerIsOwner?: boolean;
  } = {}
) {
  if (!card) {
    return;
  }

  if (card.isDemo) {
    return;
  }

  await Promise.allSettled([
    prisma.circleCard.update({
      where: { id: card.id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    }),
    trackCircleCardEvent({
      cardId: card.id,
      eventType: "CARD_VIEW",
      visitorId: input.visitorId,
      userId: input.userId,
      metadata: {
        source: "public_card",
        slug: card.slug,
        viewerIsOwner: input.viewerIsOwner ?? false
      }
    })
  ]);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getPublicCircleCard(slug);

  if (!card) {
    return {
      metadataBase: new URL(SITE_CONFIG.url),
      title: "Circle Card",
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const title = `${card.fullName} | Circle Card`;
  const description =
    card.tagline || card.about?.slice(0, 155) || `${card.fullName}'s Circle Card.`;
  const imageUrl = card.profileImageUrl?.startsWith("http")
    ? card.profileImageUrl
    : absoluteUrl(card.profileImageUrl || "/social-share.png");

  return {
    metadataBase: new URL(SITE_CONFIG.url),
    title,
    description,
    alternates: {
      canonical: `/card/${card.slug}`
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: absoluteUrl(`/card/${card.slug}`),
      images: [{ url: imageUrl }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function PublicCircleCardPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { slug } = await params;
  const paramsValue = await searchParams;
  const notice = firstValue(paramsValue.notice);
  const error = firstValue(paramsValue.error);
  const card = await getPublicCircleCard(slug);

  if (!card) {
    notFound();
  }

  const viewerUserId = session?.user?.id ?? null;
  const viewerIsOwner = Boolean(viewerUserId && viewerUserId === card.userId);
  const visitorId = (await cookies()).get("bcn_anon_id")?.value ?? null;

  await incrementViewCount(card, {
    visitorId,
    userId: viewerUserId,
    viewerIsOwner
  });

  const savedContact =
    viewerUserId && !viewerIsOwner && !card.isDemo
      ? await prisma.circleWalletContact.findUnique({
          where: {
            userId_cardId: {
              userId: viewerUserId,
              cardId: card.id
            }
          },
          select: {
            id: true,
            favourite: true
          }
        })
      : null;
  const publicUrl = absoluteUrl(`/card/${card.slug}`);
  const ownerAccountLabel = getCircleCardAccountLabel({
    role: card.user.role,
    membershipTier: card.user.membershipTier,
    hasActiveSubscription: card.user.hasActiveSubscription
  });
  const ownerIsBcnMember = card.user.role === "ADMIN" || card.user.hasActiveSubscription;

  return (
    <PublicCircleCardProfile
      card={card}
      publicUrl={publicUrl}
      analyticsCardId={card.isDemo ? undefined : card.id}
      viewerIsOwner={viewerIsOwner}
      isAuthenticated={Boolean(session?.user)}
      savedContact={savedContact}
      ownerAccountLabel={ownerAccountLabel}
      ownerIsBcnMember={ownerIsBcnMember}
      notice={notice}
      error={error}
    />
  );
}
