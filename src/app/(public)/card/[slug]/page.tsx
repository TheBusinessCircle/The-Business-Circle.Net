import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PublicCircleCardProfile } from "@/components/circle-card";
import { SITE_CONFIG } from "@/config/site";
import { getCircleCardAccountLabel } from "@/lib/circle-card/permissions";
import { resolveCircleCardShareSource, type CircleCardShareSource } from "@/lib/circle-card/share-sources";
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
    source?: CircleCardShareSource;
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
        source: input.source ?? "direct",
        surface: "public_card",
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
  const source = resolveCircleCardShareSource(firstValue(paramsValue.source));
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
    viewerIsOwner,
    source
  });

  let savedContact: {
    id: string;
    favourite: boolean;
  } | null = null;
  let viewerPrimaryCard: {
    id: string;
  } | null = null;

  if (viewerUserId && !viewerIsOwner && !card.isDemo) {
    [savedContact, viewerPrimaryCard] = await Promise.all([
      prisma.circleWalletContact.findUnique({
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
        }),
      prisma.circleCard.findFirst({
        where: {
          userId: viewerUserId,
          isPrimary: true
        },
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true
        }
      })
    ]);
  }

  const connectionRequest =
    viewerUserId && !viewerIsOwner && !card.isDemo && viewerPrimaryCard
      ? await prisma.circleCardConnectionRequest.findFirst({
          where: {
            status: {
              in: ["PENDING", "ACCEPTED"]
            },
            OR: [
              {
                requesterCardId: viewerPrimaryCard.id,
                recipientCardId: card.id
              },
              {
                requesterCardId: card.id,
                recipientCardId: viewerPrimaryCard.id
              }
            ]
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            status: true,
            message: true,
            requesterId: true
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
      connectionState={{
        viewerPrimaryCardId: viewerPrimaryCard?.id ?? null,
        request: connectionRequest
          ? {
              id: connectionRequest.id,
              status: connectionRequest.status,
              direction: connectionRequest.requesterId === viewerUserId ? "OUTGOING" : "INCOMING",
              message: connectionRequest.message
            }
          : null
      }}
      ownerAccountLabel={ownerAccountLabel}
      ownerIsBcnMember={ownerIsBcnMember}
      notice={notice}
      error={error}
    />
  );
}
