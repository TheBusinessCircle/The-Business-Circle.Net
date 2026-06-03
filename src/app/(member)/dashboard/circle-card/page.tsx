import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  ContactRound,
  Crown,
  Save,
  WalletCards
} from "lucide-react";
import { upsertCircleCardAction } from "@/actions/circle-card.actions";
import { CircleCardQrPanel } from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getCircleCardFeatureAccess,
  resolveCircleCardAccessLevel
} from "@/lib/circle-card/permissions";
import { readCircleCardSocialLinks } from "@/lib/circle-card/schema";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: "My Circle Card",
  description: "Create and manage your Circle Card inside The Business Circle Network.",
  path: "/dashboard/circle-card",
  noIndex: true
});

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const NOTICE_MESSAGES: Record<string, string> = {
  "card-created": "Circle Card created.",
  "card-updated": "Circle Card updated.",
  "card-saved": "Contact saved to your Circle Wallet.",
  "own-card": "This is already your Circle Card."
};

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-card": "Check the card fields and try again.",
  "card-not-found": "That Circle Card could not be found.",
  "card-limit": "Your current Circle Card access includes one card in Phase 1.",
  "slug-taken": "That public card link is already taken.",
  "card-save-failed": "The Circle Card could not be saved."
};

export default async function CircleCardDashboardPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const notice = firstValue(params.notice);
  const error = firstValue(params.error);
  const [card, cardCount, member] = await Promise.all([
    prisma.circleCard.findFirst({
      where: { userId: session.user.id },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.circleCard.count({
      where: { userId: session.user.id }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        profile: {
          select: {
            headline: true,
            bio: true,
            location: true,
            website: true,
            linkedin: true,
            instagram: true,
            facebook: true,
            youtube: true,
            business: {
              select: {
                companyName: true,
                website: true
              }
            }
          }
        }
      }
    })
  ]);
  const savedContactCount = card
    ? await prisma.circleWalletContact.count({
        where: { cardId: card.id }
      })
    : 0;
  const accessLevel = resolveCircleCardAccessLevel({
    role: session.user.role,
    membershipTier: session.user.membershipTier
  });
  const featureAccess = getCircleCardFeatureAccess(accessLevel);
  const socialLinks = readCircleCardSocialLinks(card?.socialLinks ?? null);
  const publicUrl = card ? absoluteUrl(`/card/${card.slug}`) : null;
  const defaultWebsite =
    card?.websiteUrl ?? member?.profile?.website ?? member?.profile?.business?.website ?? "";

  return (
    <div className="space-y-6">
      <section className="member-accent-panel rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--member-accent-border)/0.32)] bg-[hsl(var(--member-accent)/0.12)] px-3 py-1 text-xs uppercase tracking-[0.08em] text-[hsl(var(--member-accent-text))]">
              <ContactRound size={14} />
              My Circle Card
            </div>
            <h1 className="mt-4 font-display text-4xl text-foreground sm:text-5xl">
              Your relationship identity layer
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--member-accent-muted))] sm:text-base">
              Create a clean card, share it with a QR code, and give new contacts a direct route
              back to you and the Business Circle ecosystem.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{featureAccess.label}</Badge>
            <Badge variant="outline" className="border-silver/18 text-silver">
              {cardCount}/{featureAccess.cardLimit} active
            </Badge>
          </div>
        </div>
      </section>

      {notice && NOTICE_MESSAGES[notice] ? (
        <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          {NOTICE_MESSAGES[notice]}
        </p>
      ) : null}

      {error && ERROR_MESSAGES[error] ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {ERROR_MESSAGES[error]}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle>{card ? "Edit your Circle Card" : "Create your first Circle Card"}</CardTitle>
            <CardDescription>
              Keep the card focused on the details people need when they want to reconnect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertCircleCardAction} className="space-y-5">
              <input type="hidden" name="returnPath" value="/dashboard/circle-card" />
              {card ? <input type="hidden" name="cardId" value={card.id} /> : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={card?.fullName ?? member?.name ?? ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    defaultValue={card?.businessName ?? member?.profile?.business?.companyName ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    name="role"
                    defaultValue={card?.role ?? member?.profile?.headline ?? ""}
                    placeholder="Founder, operator, advisor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Public link slug</Label>
                  <Input id="slug" name="slug" defaultValue={card?.slug ?? ""} placeholder="your-name" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    name="tagline"
                    defaultValue={card?.tagline ?? ""}
                    placeholder="Sharper strategy for growing businesses"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="about">About</Label>
                  <Textarea
                    id="about"
                    name="about"
                    rows={5}
                    defaultValue={card?.about ?? member?.profile?.bio ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileImageUrl">Profile image URL</Label>
                  <Input
                    id="profileImageUrl"
                    name="profileImageUrl"
                    defaultValue={card?.profileImageUrl ?? member?.image ?? ""}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={defaultWebsite} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={card?.email ?? member?.email ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={card?.phone ?? ""} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={card?.location ?? member?.profile?.location ?? ""}
                    placeholder="London, United Kingdom"
                  />
                </div>
              </div>

              <div className="grid gap-4 border-t border-silver/12 pt-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    defaultValue={socialLinks.linkedin ?? member?.profile?.linkedin ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Instagram</Label>
                  <Input
                    id="instagramUrl"
                    name="instagramUrl"
                    type="url"
                    defaultValue={socialLinks.instagram ?? member?.profile?.instagram ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xUrl">X</Label>
                  <Input id="xUrl" name="xUrl" type="url" defaultValue={socialLinks.x ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl">Facebook</Label>
                  <Input
                    id="facebookUrl"
                    name="facebookUrl"
                    type="url"
                    defaultValue={socialLinks.facebook ?? member?.profile?.facebook ?? ""}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="youtubeUrl">YouTube</Label>
                  <Input
                    id="youtubeUrl"
                    name="youtubeUrl"
                    type="url"
                    defaultValue={socialLinks.youtube ?? member?.profile?.youtube ?? ""}
                  />
                </div>
              </div>

              <label
                htmlFor="isPublished"
                className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
              >
                <input
                  id="isPublished"
                  name="isPublished"
                  type="checkbox"
                  defaultChecked={card?.isPublished ?? true}
                  className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                />
                <span>
                  Published
                  <span className="mt-1 block text-xs text-muted">
                    Public cards are available at their /card link.
                  </span>
                </span>
              </label>

              <Button type="submit" className="w-full gap-2 sm:w-auto">
                <Save size={16} />
                {card ? "Save Circle Card" : "Create Circle Card"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle>Public card</CardTitle>
              <CardDescription>
                Your clean share link and QR code stay generated from the current slug.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {publicUrl && card ? (
                <>
                  <CircleCardQrPanel publicUrl={publicUrl} slug={card.slug} />
                  <Link href={`/card/${card.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="outline" className="w-full gap-2">
                      View public card
                      <ArrowUpRight size={16} />
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted">
                  Your public link and QR code will appear after the first save.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <WalletCards size={17} className="text-silver" />
                  Circle Wallet
                </CardTitle>
                <CardDescription>
                  {savedContactCount} saved contact{savedContactCount === 1 ? "" : "s"} linked to this card.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  Favourites, notes and tags are structured in the database and ready for the full
                  wallet view.
                </p>
              </CardContent>
            </Card>

            <Card className="border-silver/16 bg-card/62">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <BarChart3 size={17} className="text-silver" />
                  Analytics
                </CardTitle>
                <CardDescription>
                  {card?.viewCount ?? 0} public view{(card?.viewCount ?? 0) === 1 ? "" : "s"} recorded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  Deeper scan and contact analytics can plug into this surface later.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-gold/10">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Crown size={17} className="text-gold" />
                  Upgrade path
                </CardTitle>
                <CardDescription>
                  Pro, Teams and BCN tier benefits are prepared in the access layer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    Wallet
                  </Badge>
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    Analytics
                  </Badge>
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    Teams
                  </Badge>
                  <Badge variant="outline" className="border-gold/25 text-gold">
                    BCN badges
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
