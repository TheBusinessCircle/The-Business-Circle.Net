import type { Metadata } from "next";
import Link from "next/link";
import { BusinessStage, MembershipTier } from "@prisma/client";
import { Compass, Filter, Search, Users } from "lucide-react";
import { MemberProfileCard } from "@/components/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { toTitleCase } from "@/lib/utils";
import type { DirectoryCommunityFilter } from "@/types";
import { searchDirectoryMembers } from "@/server/profile";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STAGE_OPTIONS = Object.values(BusinessStage);
const TIER_OPTIONS = [MembershipTier.FOUNDATION, MembershipTier.INNER_CIRCLE, MembershipTier.CORE] as const;
const COMMUNITY_FILTER_OPTIONS: Array<{
  value: DirectoryCommunityFilter;
  label: string;
}> = [
  { value: "ALL", label: "All Members" },
  { value: "INNER_CIRCLE", label: "Inner Circle+" },
  { value: "FOUNDING_MEMBERS", label: "Founding Members" },
  { value: "TOP_CONTRIBUTORS", label: "Top Contributors" },
  { value: "MOST_INVITES", label: "Most Invites" },
  { value: "NEWEST_MEMBERS", label: "Newest Members" }
];
const DIRECTORY_PAGE_SIZE = 12;

export const metadata: Metadata = createPageMetadata({
  title: "Member Directory",
  description:
    "Search and connect with founders, business owners, and operators in The Business Circle private member directory.",
  path: "/directory"
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

function buildDirectoryHref(input: {
  q: string;
  industry: string;
  stage: BusinessStage | "";
  location: string;
  interest: string;
  tier: MembershipTier | "";
  communityFilter: DirectoryCommunityFilter;
  page: number;
}) {
  const params = new URLSearchParams();

  if (input.q) {
    params.set("q", input.q);
  }

  if (input.industry) {
    params.set("industry", input.industry);
  }

  if (input.stage) {
    params.set("stage", input.stage);
  }

  if (input.location) {
    params.set("location", input.location);
  }

  if (input.interest) {
    params.set("interest", input.interest);
  }

  if (input.tier) {
    params.set("tier", input.tier);
  }

  if (input.communityFilter !== "ALL") {
    params.set("community", input.communityFilter);
  }

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  const query = params.toString();
  return query.length ? `/directory?${query}` : "/directory";
}

function formatEnumLabel(value: string) {
  return toTitleCase(value.replaceAll("_", " "));
}

function parseCommunityFilter(value: string): DirectoryCommunityFilter {
  const normalized = value.toUpperCase() as DirectoryCommunityFilter;
  return COMMUNITY_FILTER_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "ALL";
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;

  const q = firstValue(params.q).trim();
  const industry = firstValue(params.industry).trim();
  const stageRaw = firstValue(params.stage).toUpperCase();
  const location = firstValue(params.location).trim();
  const interest = firstValue(params.interest).trim();
  const tierRaw = firstValue(params.tier).toUpperCase();
  const communityFilter = parseCommunityFilter(firstValue(params.community));
  const page = parsePage(firstValue(params.page));

  const stage: BusinessStage | "" = STAGE_OPTIONS.includes(stageRaw as BusinessStage)
    ? (stageRaw as BusinessStage)
    : "";
  const tier: MembershipTier | "" = TIER_OPTIONS.includes(tierRaw as MembershipTier)
    ? (tierRaw as MembershipTier)
    : "";

  const results = await searchDirectoryMembers({
    query: q,
    industry,
    stage,
    location,
    interest,
    tier,
    communityFilter,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
    excludeUserId: session.user.id
  });

  const hasActiveFilters = Boolean(
    q || industry || stage || location || interest || tier || communityFilter !== "ALL"
  );
  const rangeStart = results.total ? (results.page - 1) * results.pageSize + 1 : 0;
  const rangeEnd = results.total ? Math.min(results.total, results.page * results.pageSize) : 0;
  const paginationBase = { q, industry, stage, location, interest, tier, communityFilter };
  const previousHref = buildDirectoryHref({ ...paginationBase, page: results.page - 1 });
  const nextHref = buildDirectoryHref({ ...paginationBase, page: results.page + 1 });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/75 to-card/65">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <Compass size={12} className="mr-1" />
                Private Member Network
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Member Directory</CardTitle>
              <CardDescription className="mt-2 text-base">
                Discover trusted founders, operators, and collaborators across the Business Circle ecosystem.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="muted" className="normal-case tracking-normal">
                <Users size={12} className="mr-1" />
                {results.total} visible members
              </Badge>
              <Badge variant="outline" className="text-muted normal-case tracking-normal">
                Showing {rangeStart}-{rangeEnd}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Filter size={16} />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Use structured filters to find the right partner for strategy, growth, and collaboration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-9">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="q">Search Members</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                  <Input
                    id="q"
                    name="q"
                    placeholder="Name, company, skills, goals..."
                    className="pl-9"
                    defaultValue={q}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" defaultValue={industry} placeholder="SaaS, Agency, Ecommerce..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Business Stage</Label>
                <Select id="stage" name="stage" defaultValue={stage}>
                  <option value="">Any Stage</option>
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatEnumLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={location} placeholder="London, UK" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest">Collaboration Interests</Label>
                <Input id="interest" name="interest" defaultValue={interest} placeholder="Hiring, growth, finance..." />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="tier">Membership Tier</Label>
                <Select id="tier" name="tier" defaultValue={tier}>
                  <option value="">Any Tier</option>
                  {TIER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatEnumLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="community">Community View</Label>
                <Select id="community" name="community" defaultValue={communityFilter}>
                  {COMMUNITY_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Search Directory</Button>
              {hasActiveFilters ? (
                <Link href="/directory">
                  <Button type="button" variant="outline">
                    Clear Filters
                  </Button>
                </Link>
              ) : null}
            </div>
          </form>

          {hasActiveFilters ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {q ? (
                <Badge variant="outline" className="border-border text-muted normal-case tracking-normal">
                  Search: {q}
                </Badge>
              ) : null}
              {industry ? (
                <Badge variant="outline" className="border-border text-muted normal-case tracking-normal">
                  Industry: {industry}
                </Badge>
              ) : null}
              {stage ? (
                <Badge variant="outline" className="border-border text-muted normal-case tracking-normal">
                  Stage: {formatEnumLabel(stage)}
                </Badge>
              ) : null}
              {location ? (
                <Badge variant="outline" className="border-border text-muted normal-case tracking-normal">
                  Location: {location}
                </Badge>
              ) : null}
              {interest ? (
                <Badge variant="outline" className="border-border text-muted normal-case tracking-normal">
                  Interest: {interest}
                </Badge>
              ) : null}
              {tier ? (
                <Badge variant="outline" className="border-border text-muted normal-case tracking-normal">
                  Tier: {formatEnumLabel(tier)}
                </Badge>
              ) : null}
              {communityFilter !== "ALL" ? (
                <Badge variant="outline" className="border-border text-muted normal-case tracking-normal">
                  View: {COMMUNITY_FILTER_OPTIONS.find((option) => option.value === communityFilter)?.label}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.members.length ? (
          results.members.map((member) => (
            <MemberProfileCard
              key={member.id}
              userId={member.id}
              name={member.name || member.email}
              image={member.image}
              membershipTier={member.membershipTier}
              memberRoleTag={member.memberRoleTag}
              foundingTier={member.foundingTier}
              companyName={member.profile?.business?.companyName}
              bio={member.profile?.bio || member.profile?.business?.description}
              location={member.profile?.location || member.profile?.business?.location}
              industry={member.profile?.business?.industry}
              stage={member.profile?.business?.stage}
              experience={member.profile?.experience}
              tags={member.profile?.collaborationTags || []}
              recognition={member.recognition}
              lastActiveAt={member.lastActiveAt}
            />
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              icon={Users}
              title="No members matched your filters"
              description="Adjust criteria and run the search again to find members to connect with."
            />
          </div>
        )}
      </div>

      {results.totalPages > 1 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {results.hasPreviousPage ? (
              <Link href={previousHref}>
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
              <Link href={nextHref}>
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

