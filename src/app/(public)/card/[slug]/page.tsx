import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PublicCircleCardProfile } from "@/components/circle-card";
import { SITE_CONFIG } from "@/config/site";
import {
  CIRCLE_CARD_APP_NAME,
  CIRCLE_CARD_ICON_512,
  CIRCLE_CARD_PWA_METADATA
} from "@/lib/circle-card/metadata";
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

function resolveSpinState(value: string | string[] | undefined) {
  const state = firstValue(value);
  return state === "return" || state === "connected" || state === "first" || state === "already"
    ? state
    : null;
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
    }),
    card.recommendations.length
      ? trackCircleCardEvent({
          cardId: card.id,
          eventType: "PUBLIC_RECOMMENDATION_VIEWED",
          visitorId: input.visitorId,
          userId: input.userId,
          metadata: {
            source: input.source ?? "direct",
            surface: "public_card",
            slug: card.slug,
            count: card.recommendations.length
          }
        })
      : Promise.resolve({ stored: false as const })
  ]);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getPublicCircleCard(slug);

  if (!card) {
    return {
      ...CIRCLE_CARD_PWA_METADATA,
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
    : absoluteUrl(card.profileImageUrl || CIRCLE_CARD_ICON_512);

  return {
    ...CIRCLE_CARD_PWA_METADATA,
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
      siteName: CIRCLE_CARD_APP_NAME,
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
  const spinState = resolveSpinState(paramsValue.spin);
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

  if (spinState === "return" && !card.isDemo) {
    await trackCircleCardEvent({
      cardId: card.id,
      eventType: "SPIN_RETURNED_AFTER_SIGNUP",
      visitorId,
      userId: viewerUserId,
      metadata: {
        source: "registration_return",
        slug: card.slug
      }
    });
  }

  let savedContact: {
    id: string;
    favourite: boolean;
  } | null = null;
  let viewerPrimaryCard: {
    id: string;
  } | null = null;
  let viewerCircleConnectionCount: number | null = null;

  if (viewerUserId && !viewerIsOwner && !card.isDemo) {
    [savedContact, viewerPrimaryCard, viewerCircleConnectionCount] = await Promise.all([
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
      }),
      prisma.circleWalletContact.count({
        where: {
          userId: viewerUserId,
          cardId: {
            not: null
          }
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
      source={source}
      spinState={spinState}
      viewerCircleConnectionCount={viewerCircleConnectionCount}
      notice={notice}
      error={error}
    />
  );
}
