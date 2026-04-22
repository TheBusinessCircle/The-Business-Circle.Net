import type { Metadata } from "next";
import Link from "next/link";
import { ResourceTier, ResourceType } from "@prisma/client";
import { Filter, Search, Sparkles } from "lucide-react";
import { ResourceLibraryCard } from "@/components/resources";
import { ResourceTierBadge } from "@/components/resources/resource-tier-badge";
import { VisualPlacementBackground } from "@/components/visual-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";
import { roleToTier } from "@/lib/permissions";
import { getResourcePersonalisation } from "@/lib/personalization";
import { getProfileCompletion } from "@/lib/profile";
import { getResourceDiscussionLink } from "@/lib/resource-community";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { getTierAccentTextClassName, getTierCardClassName } from "@/lib/tier-styles";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  listLatestPublishedResources,
  normalizeResourceLibraryView,
  searchResourceLibrary
} from "@/server/resources";
import { maybePublishDueResources } from "@/server/resources/resource-publishing.service";
import { getVisualMediaPlacement } from "@/server/visual-media";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 12;

export const metadata: Metadata = createPageMetadata({
  title: "Resources",
  description:
    "Your member-only Business Circle resource hub with practical guidance, clearer thinking, and structured next steps.",
  path: "/dashboard/resources",
  noIndex: true
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function getViewCopy(view: "unread" | "read" | "all") {
  if (view === "read") {
    return {
      title: "Read archive",
      description: "Resources you have already finished and can revisit whenever useful.",
      emptyDescription: "Nothing has been marked as read yet."
    };
  }

  if (view === "all") {
    return {
      title: "Full library",
      description: "Every resource available on your current membership, whether read or unread.",
      emptyDescription: "No resources matched your filters."
    };
  }

  return {
    title: "Unread resources",
    description:
      "The default view keeps finished resources tucked away so the next useful read stays easier to spot.",
    emptyDescription: "Everything available to you has already been marked as read."
  };
}

function buildResourceHref(input: {
  q: string;
  tier: string;
  category: string;
  type: string;
  view: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.tier) params.set("tier", input.tier);
  if (input.category) params.set("category", input.category);
  if (input.type) params.set("type", input.type);
  if (input.view && input.view !== "unread") params.set("view", input.view);
  if (input.page > 1) params.set("page", String(input.page));

  const query = params.toString();
  return query.length ? `/dashboard/resources?${query}` : "/dashboard/resources";
}

export default async function DashboardResourcesPage({ searchParams }: PageProps) {
  await maybePublishDueResources();

  const session = await requireUser();
  const params = await searchParams;
  const q = firstValue(params.q).trim();
  const tier = firstValue(params.tier).toUpperCase().trim();
  const category = firstValue(params.category).trim();
  const type = firstValue(params.type).toUpperCase().trim();
  const view = normalizeResourceLibraryView(firstValue(params.view).trim() || undefined);
  const page = parsePage(firstValue(params.page));
  const error = firstValue(params.error).trim();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const viewCopy = getViewCopy(view);
  const [results, latestResources, latestMemberPost, latestMemberComment, memberProfile, resourcesHeroPlacement] = await Promise.all([
    searchResourceLibrary(
      {
        query: q,
        tier,
        category,
        type,
        view,
        userId: session.user.id,
        page,
        pageSize: PAGE_SIZE
      },
      effectiveTier
    ),
    listLatestPublishedResources(effectiveTier, 4, {
      userId: session.user.id,
      view
    }),
    prisma.communityPost.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null
      },
      select: {
        id: true
      }
    }),
    prisma.communityComment.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null
      },
      select: {
        id: true
      }
    }),
    prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        name: true,
        profile: {
          select: {
            bio: true,
            location: true,
            experience: true,
            website: true,
            instagram: true,
            linkedin: true,
            tiktok: true,
            facebook: true,
            youtube: true,
            customLinks: true,
            collaborationNeeds: true,
            collaborationOffers: true,
            partnershipInterests: true,
            business: {
              select: {
                companyName: true,
                description: true,
                industry: true,
                services: true
              }
            }
          }
        }
      }
    }),
    getVisualMediaPlacement("resources.hero")
  ]);

  const hasFilters = Boolean(q || tier || category || type);
  const selectedCategory = results.categoryOptions.find((item) => item.value === category);
  const selectedTier = results.tierOptions.find((item) => item.value === tier);
  const selectedType = results.typeOptions.find((item) => item.value === type);
  const paginationBase = { q, tier, category, type, view };
  const highestVisibleTier =
    results.tierOptions[results.tierOptions.length - 1]?.value ?? ResourceTier.FOUNDATION;
  const recommendedNextRead = results.items[0] ?? latestResources[0] ?? null;
  const recentlyAdded = latestResources
    .filter((resource) => resource.id !== recommendedNextRead?.id)
    .slice(0, 3);
  const recommendedCardClassName = recommendedNextRead
    ? getTierCardClassName(recommendedNextRead.tier)
    : "border-silver/16 bg-card/62";
  const recommendedAccentClassName = recommendedNextRead
    ? getTierAccentTextClassName(recommendedNextRead.tier)
    : "text-silver";
  const profileCompletion = getProfileCompletion({
    name: memberProfile?.name,
    bio: memberProfile?.profile?.bio,
    location: memberProfile?.profile?.location,
    experience: memberProfile?.profile?.experience,
    companyName: memberProfile?.profile?.business?.companyName,
    businessDescription: memberProfile?.profile?.business?.description,
    industry: memberProfile?.profile?.business?.industry,
    services: memberProfile?.profile?.business?.services,
    website: memberProfile?.profile?.website,
    instagram: memberProfile?.profile?.instagram,
    linkedin: memberProfile?.profile?.linkedin,
    tiktok: memberProfile?.profile?.tiktok,
    facebook: memberProfile?.profile?.facebook,
    youtube: memberProfile?.profile?.youtube,
    customLinks: memberProfile?.profile?.customLinks,
    collaborationNeeds: memberProfile?.profile?.collaborationNeeds,
    collaborationOffers: memberProfile?.profile?.collaborationOffers,
    partnershipInterests: memberProfile?.profile?.partnershipInterests
  });
  const personalisation = getResourcePersonalisation({
    membershipTier: effectiveTier,
    profileCompletion: profileCompletion.percentage,
    hasPosted: Boolean(latestMemberPost),
    hasCommented: Boolean(latestMemberComment),
    recommendedResourceTitle: recommendedNextRead?.title ?? null,
    recommendedResourceHref: recommendedNextRead
      ? `/dashboard/resources/${recommendedNextRead.slug}`
      : null
  });
  const discussionLink = getResourceDiscussionLink({
    category: selectedCategory?.label ?? recommendedNextRead?.category ?? "Business conversations",
    type: recommendedNextRead?.type ?? ResourceType.CLARITY,
    membershipTier: effectiveTier
  });

  return (
    <div className="space-y-6">
      {error === "upgrade-required" ? (
        <Card className="border-gold/35 bg-gold/10">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              That resource is outside your current access. This hub is showing the material available on your membership.
            </p>
            <Link href="/membership">
              <Button variant="outline">View Membership Options</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="relative overflow-hidden border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/68">
        <VisualPlacementBackground placement={resourcesHeroPlacement} />
        <CardHeader className="relative z-[1] space-y-4">
          <Badge variant="outline" className="w-fit border-silver/18 bg-silver/10 text-silver">
            Member Resources
          </Badge>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="space-y-3">
              <CardTitle className="font-display text-4xl leading-tight">
                Clear thinking for the stage you are actually in.
              </CardTitle>
              <CardDescription className="max-w-3xl text-base">
                {viewCopy.description}
              </CardDescription>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-silver/14 bg-background/30 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{viewCopy.title}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{results.total}</p>
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/30 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Your access</p>
                <p className="mt-2 text-sm text-muted">
                  {getResourceTierLabel(highestVisibleTier)} and below
                </p>
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/30 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">How it works</p>
                <p className="mt-2 text-sm text-muted">
                  {view === "read"
                    ? "Revisit what you have already finished without losing access."
                    : view === "all"
                      ? "Search, filter, and review the full library inside your current tier."
                      : "Mark finished resources as read to keep this default view focused on what is still left to explore."}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-[1] pt-0">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/resources">
              <Button variant={view === "unread" ? "default" : "outline"} size="sm">
                Unread
              </Button>
            </Link>
            <Link href="/dashboard/resources?view=read">
              <Button variant={view === "read" ? "default" : "outline"} size="sm">
                Read Archive
              </Button>
            </Link>
            <Link href="/dashboard/resources?view=all">
              <Button variant={view === "all" ? "default" : "outline"} size="sm">
                All Resources
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={recommendedCardClassName}>
          <CardHeader>
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recommended for you</p>
            <CardTitle>Worth your time now</CardTitle>
            <CardDescription>
              A lighter route back into the resource hub without needing to search first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedNextRead ? (
              <Link
                href={`/dashboard/resources/${recommendedNextRead.slug}`}
                className="block rounded-2xl border border-silver/14 bg-background/22 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/32"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ResourceTierBadge tier={recommendedNextRead.tier} />
                  <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
                    {recommendedNextRead.category}
                  </Badge>
                  <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
                    {getResourceTypeLabel(recommendedNextRead.type)}
                  </Badge>
                </div>
                <p className="mt-4 text-2xl font-semibold text-foreground">{recommendedNextRead.title}</p>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                  {recommendedNextRead.excerpt}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span className={recommendedAccentClassName}>
                    {recommendedNextRead.publishedAt
                      ? `Published ${formatDate(recommendedNextRead.publishedAt)}`
                      : "Recently added"}
                  </span>
                  <span>Member-only resource</span>
                </div>
              </Link>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No recommended resource yet"
                description="As soon as material is published inside your access tier, it will appear here."
              />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recently added</p>
              <CardTitle className="text-xl">New inside your access</CardTitle>
              <CardDescription>The latest published material available on your current membership.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentlyAdded.length ? (
                recentlyAdded.map((resource) => (
                  <Link
                    key={resource.id}
                    href={`/dashboard/resources/${resource.slug}`}
                    className="block rounded-xl border border-silver/14 bg-background/20 px-4 py-3 transition-colors hover:border-silver/26 hover:bg-background/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{resource.title}</p>
                        <p className="text-xs text-muted">
                          {resource.category}
                          {resource.publishedAt ? ` | ${formatDate(resource.publishedAt)}` : ""}
                        </p>
                      </div>
                      <ResourceTierBadge tier={resource.tier} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted">
                  New publications will appear here as soon as they go live.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                {personalisation.basedOnActivity.eyebrow}
              </p>
              <CardTitle className="text-xl">{personalisation.basedOnActivity.title}</CardTitle>
              <CardDescription>{personalisation.basedOnActivity.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={personalisation.basedOnActivity.href}
                className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
              >
                {personalisation.basedOnActivity.label}
                <Sparkles size={14} />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recommended discussion</p>
              <CardTitle className="text-xl">{discussionLink.title}</CardTitle>
              <CardDescription>{discussionLink.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={discussionLink.href}
                className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
              >
                {discussionLink.label}
                <Sparkles size={14} />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-silver/16 bg-card/62">
        <CardHeader>
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
            {personalisation.nextStep.eyebrow}
          </p>
          <CardTitle>{personalisation.nextStep.title}</CardTitle>
          <CardDescription>{personalisation.nextStep.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={personalisation.nextStep.href}
            className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
          >
            {personalisation.nextStep.label}
            <Sparkles size={14} />
          </Link>
        </CardContent>
      </Card>

      <Card className="border-silver/16 bg-card/62">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Filter size={16} className="text-silver" />
            Filters
          </CardTitle>
          <CardDescription>
            Narrow the library by tier, category, or type without leaving the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 lg:grid-cols-5">
            {view !== "unread" ? <input type="hidden" name="view" value={view} /> : null}
            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="q" className="text-sm text-muted">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                <input
                  id="q"
                  name="q"
                  defaultValue={q}
                  className="flex h-11 w-full rounded-xl border border-silver/14 bg-background/25 pl-9 pr-3 text-sm outline-none transition-colors focus:border-silver/30"
                  placeholder="Search your resources..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tier" className="text-sm text-muted">
                Tier
              </label>
              <select
                id="tier"
                name="tier"
                defaultValue={tier}
                className="flex h-11 w-full rounded-xl border border-silver/14 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-silver/30"
              >
                <option value="">All visible tiers</option>
                {results.tierOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm text-muted">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={category}
                className="flex h-11 w-full rounded-xl border border-silver/14 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-silver/30"
              >
                <option value="">All visible categories</option>
                {results.categoryOptions.map((option) => (
                  <option key={`${option.tier}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm text-muted">
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={type}
                className="flex h-11 w-full rounded-xl border border-silver/14 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-silver/30"
              >
                <option value="">All types</option>
                {results.typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 lg:col-span-5">
              <Button type="submit">Apply Filters</Button>
              {hasFilters ? (
                <Link href={view === "unread" ? "/dashboard/resources" : `/dashboard/resources?view=${view}`}>
                  <Button type="button" variant="outline">
                    Clear
                  </Button>
                </Link>
              ) : null}
            </div>
          </form>

          {hasFilters ? (
            <div className="flex flex-wrap gap-2">
              {q ? (
                <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
                  Search: {q}
                </Badge>
              ) : null}
              {selectedTier ? (
                <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
                  Tier: {selectedTier.label}
                </Badge>
              ) : null}
              {selectedCategory ? (
                <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
                  Category: {selectedCategory.label}
                </Badge>
              ) : null}
              {selectedType ? (
                <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
                  Type: {getResourceTypeLabel(selectedType.value)}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.items.length ? (
          results.items.map((resource) => (
            <ResourceLibraryCard key={resource.id} resource={resource} />
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              icon={Sparkles}
              title="No resources matched your filters"
              description={
                hasFilters
                  ? "Try a broader search or remove one of the filters."
                  : viewCopy.emptyDescription
              }
            />
          </div>
        )}
      </div>

      {results.totalPages > 1 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {results.hasPreviousPage ? (
              <Link href={buildResourceHref({ ...paginationBase, page: results.page - 1 })}>
                <Button variant="outline">Previous Page</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Previous Page
              </Button>
            )}

            <p className="text-sm text-muted">
              Page {results.page} of {results.totalPages}
            </p>

            {results.hasNextPage ? (
              <Link href={buildResourceHref({ ...paginationBase, page: results.page + 1 })}>
                <Button variant="outline">Next Page</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Next Page
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
