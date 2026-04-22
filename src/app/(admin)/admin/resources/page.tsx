import type { Metadata } from "next";
import Link from "next/link";
import { ResourceStatus, ResourceTier } from "@prisma/client";
import { CalendarDays, Filter, ImageIcon, Plus, Search } from "lucide-react";
import {
  deleteResourceAction,
  setResourceStatusAction
} from "@/actions/admin/resource-cms.actions";
import { ResourceTierBadge } from "@/components/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RESOURCE_CATEGORY_OPTIONS, RESOURCE_TIER_ORDER, RESOURCE_TYPE_OPTIONS, getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";
import { db } from "@/lib/db";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate, toTitleCase } from "@/lib/utils";
import { maybePublishDueResources } from "@/server/resources/resource-publishing.service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;

export const metadata: Metadata = createPageMetadata({
  title: "Admin Resources",
  description: "Manage resources, schedules, and publication states.",
  path: "/admin/resources"
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
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildHref(input: {
  q: string;
  status: string;
  tier: string;
  category: string;
  type: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.status) params.set("status", input.status);
  if (input.tier) params.set("tier", input.tier);
  if (input.category) params.set("category", input.category);
  if (input.type) params.set("type", input.type);
  if (input.page > 1) params.set("page", String(input.page));

  const query = params.toString();
  return query ? `/admin/resources?${query}` : "/admin/resources";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "draft-saved": "Resource saved as draft.",
    scheduled: "Resource scheduled.",
    published: "Resource published.",
    deleted: "Resource deleted."
  };

  const errorMap: Record<string, string> = {
    invalid: "The submitted resource payload was invalid.",
    "invalid-category": "The selected category does not belong to that tier.",
    "invalid-slug": "Please provide a title or slug that resolves to a valid URL slug.",
    "slug-exists": "That slug already exists for another resource.",
    "not-found": "The requested resource could not be found.",
    "invalid-schedule": "The schedule date could not be parsed.",
    "invalid-length": "Scheduled and published resources must be between 600 and 1200 words.",
    "invalid-structure": "The article must include Reality, Breakdown, Shift, and Next step headings.",
    "invalid-tone": "The article content still includes banned punctuation or tone markers."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function formatStatusLabel(value: string) {
  return toTitleCase(value.replaceAll("_", " "));
}

export default async function AdminResourcesPage({ searchParams }: PageProps) {
  await requireAdmin();
  await maybePublishDueResources();

  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 120);
  const statusRaw = firstValue(params.status).toUpperCase();
  const tierRaw = firstValue(params.tier).toUpperCase();
  const category = firstValue(params.category).trim();
  const typeRaw = firstValue(params.type).toUpperCase();
  const page = parsePage(firstValue(params.page));

  const status = Object.values(ResourceStatus).includes(statusRaw as ResourceStatus)
    ? (statusRaw as ResourceStatus)
    : "";
  const tier = RESOURCE_TIER_ORDER.includes(tierRaw as ResourceTier)
    ? (tierRaw as ResourceTier)
    : "";
  const type = RESOURCE_TYPE_OPTIONS.find((item) => item.value === typeRaw)?.value ?? "";

  const where = {
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
            { excerpt: { contains: query, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(status ? { status } : {}),
    ...(tier ? { tier } : {}),
    ...(category ? { category } : {}),
    ...(type ? { type } : {})
  };

  const total = await db.resource.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const resources = await db.resource.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { scheduledFor: "asc" },
      { publishedAt: "desc" },
      { updatedAt: "desc" }
    ],
    skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      slug: true,
      tier: true,
      category: true,
      type: true,
      status: true,
      scheduledFor: true,
      publishedAt: true,
      updatedAt: true
    }
  });

  const hasFilters = Boolean(query || status || tier || category || type);
  const rangeStart = total ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = total ? Math.min(total, safePage * PAGE_SIZE) : 0;
  const currentPath = buildHref({
    q: query,
    status,
    tier,
    category,
    type,
    page: safePage
  });
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/65">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                Resource CMS
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Admin Resource Manager</CardTitle>
              <CardDescription className="mt-2 text-base">
                Review the editorial pipeline, adjust schedule, and publish manually when needed.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/resources/new">
                <Button>
                  <Plus size={14} className="mr-1" />
                  Add Resource
                </Button>
              </Link>
              <Badge variant="muted" className="normal-case tracking-normal">
                {total} total resources
              </Badge>
              <Badge variant="outline" className="normal-case tracking-normal text-muted">
                Showing {rangeStart}-{rangeEnd}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-silver/16 bg-card/62">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-xl">
            <ImageIcon size={16} className="text-silver" />
            Resource image direction
          </CardTitle>
          <CardDescription>
            Resource card and article imagery should stay clearly separate from the manual page-hero system.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Preferred tone</p>
            <p className="mt-2 text-sm leading-7 text-foreground/88">
              Premium, dark, editorial, and business-relevant beats bright lifestyle or generic startup imagery.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">What to avoid</p>
            <p className="mt-2 text-sm leading-7 text-foreground/88">
              Avoid cheesy business stock, cartoonish AI scenes, loud SaaS colours, and imagery that feels too literal or noisy.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Composition check</p>
            <p className="mt-2 text-sm leading-7 text-foreground/88">
              If you override imagery later, choose crops that still read cleanly in cards and headers without relying on baked-in text.
            </p>
          </div>
        </CardContent>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Filter size={16} />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Filter by status, tier, category, and type to stay on top of the publishing flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="space-y-2 lg:col-span-2">
                <label htmlFor="q" className="text-sm text-muted">
                  Search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <input
                    id="q"
                    name="q"
                    defaultValue={query}
                    className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 pl-9 pr-3 text-sm outline-none transition-colors focus:border-gold/35"
                    placeholder="Title, slug, excerpt..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm text-muted">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any status</option>
                  {Object.values(ResourceStatus).map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="tier" className="text-sm text-muted">
                  Tier
                </label>
                <select
                  id="tier"
                  name="tier"
                  defaultValue={tier}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any tier</option>
                  {RESOURCE_TIER_ORDER.map((option) => (
                    <option key={option} value={option}>
                      {getResourceTierLabel(option)}
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
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any type</option>
                  {RESOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm text-muted">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue={category}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any category</option>
                  {RESOURCE_CATEGORY_OPTIONS.map((option) => (
                    <option key={`${option.tier}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Button type="submit">Apply Filters</Button>
                {hasFilters ? (
                  <Link href="/admin/resources">
                    <Button type="button" variant="outline">
                      Clear
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            Open a resource to edit the article, adjust the schedule, or publish manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background/25 text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Timing</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.length ? (
                  resources.map((resource) => (
                    <tr key={resource.id} className="border-b border-border/70 align-top transition-colors hover:bg-background/20">
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{resource.title}</p>
                        <p className="text-xs text-muted">/{resource.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-muted">{resource.category}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="normal-case tracking-normal text-muted">
                          {formatStatusLabel(resource.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <ResourceTierBadge tier={resource.tier} />
                      </td>
                      <td className="px-3 py-3 text-muted">{getResourceTypeLabel(resource.type)}</td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {resource.scheduledFor ? (
                          <p className="inline-flex items-center gap-1">
                            <CalendarDays size={12} />
                            Scheduled {formatDate(resource.scheduledFor)}
                          </p>
                        ) : resource.publishedAt ? (
                          <p>Published {formatDate(resource.publishedAt)}</p>
                        ) : (
                          <p>Unscheduled</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/resources/${resource.id}`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <form action={setResourceStatusAction}>
                            <input type="hidden" name="resourceId" value={resource.id} />
                            <input type="hidden" name="returnPath" value={currentPath} />
                            <input
                              type="hidden"
                              name="intent"
                              value={resource.status === ResourceStatus.PUBLISHED ? "save_draft" : "publish"}
                            />
                            <Button variant="outline" size="sm" type="submit">
                              {resource.status === ResourceStatus.PUBLISHED ? "Move to Draft" : "Publish"}
                            </Button>
                          </form>
                          <form action={deleteResourceAction}>
                            <input type="hidden" name="resourceId" value={resource.id} />
                            <input type="hidden" name="returnPath" value={currentPath} />
                            <Button variant="danger" size="sm" type="submit">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-muted">
                      No resources found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {safePage > 1 ? (
              <Link
                href={buildHref({
                  q: query,
                  status,
                  tier,
                  category,
                  type,
                  page: safePage - 1
                })}
              >
                <Button variant="outline">Previous Page</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Previous Page
              </Button>
            )}

            <p className="text-sm text-muted">
              Page {safePage} of {totalPages}
            </p>

            {safePage < totalPages ? (
              <Link
                href={buildHref({
                  q: query,
                  status,
                  tier,
                  category,
                  type,
                  page: safePage + 1
                })}
              >
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
