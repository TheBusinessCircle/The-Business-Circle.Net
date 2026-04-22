import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoveLeft, NotebookTabs, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import {
  markResourceAsReadAction,
  markResourceAsUnreadAction
} from "@/actions/resources/resource-progress.actions";
import {
  ResourceMarkdown,
  ResourceCoverImage,
  ResourceNarratorCard,
  ResourceNarratorPrimaryControls,
  ResourceNarratorProvider,
  ResourceNarratorSectionButton,
  ResourceTierBadge,
  type ResourceNarrationItem
} from "@/components/resources";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { getResourceTypeLabel } from "@/config/resources";
import { getResourceDiscussionLink } from "@/lib/resource-community";
import {
  resourceMarkdownToPlainText,
  splitResourceContentSections
} from "@/lib/resources/markdown";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import {
  getResourceReadStateForUser,
  getPublishedResourceBySlug,
  getRelatedPublishedResources,
  listLatestPublishedResources
} from "@/server/resources";
import { maybePublishDueResources } from "@/server/resources/resource-publishing.service";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function createFallbackMetadata(slug: string): Metadata {
  return {
    ...createPageMetadata({
      title: "Resources",
      description: "Member-only Business Circle resources.",
      path: `/dashboard/resources/${slug}`,
      noIndex: true
    }),
    metadataBase: new URL(SITE_CONFIG.url)
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const session = await auth();
  const { slug } = await params;

  if (
    !session?.user ||
    session.user.suspended ||
    (session.user.role !== "ADMIN" && !session.user.hasActiveSubscription)
  ) {
    return createFallbackMetadata(slug);
  }

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const resource = await getPublishedResourceBySlug(slug, effectiveTier);

  if (!resource) {
    return createFallbackMetadata(slug);
  }

  return {
    ...createPageMetadata({
      title: resource.title,
      description: resource.excerpt,
      path: `/dashboard/resources/${resource.slug}`,
      noIndex: true
    }),
    metadataBase: new URL(SITE_CONFIG.url)
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardResourceDetailPage({ params }: PageProps) {
  await maybePublishDueResources();

  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const { slug } = await params;
  const resource = await getPublishedResourceBySlug(slug, effectiveTier);

  if (!resource) {
    redirect("/dashboard/resources?error=upgrade-required");
  }

  const [relatedResources, latestResources] = await Promise.all([
    getRelatedPublishedResources(resource, effectiveTier, 3),
    listLatestPublishedResources(effectiveTier, 4, {
      userId: session.user.id,
      view: "all"
    })
  ]);
  const readState = await getResourceReadStateForUser({
    userId: session.user.id,
    resourceId: resource.id
  });
  const recentlyAdded = latestResources.filter((item) => item.id !== resource.id).slice(0, 3);
  const parsed = splitResourceContentSections(resource.content);
  const narrationItems: ResourceNarrationItem[] = [
    {
      id: "opening",
      label: "Opening",
      type: "opening",
      plainText: [resource.title, resourceMarkdownToPlainText(parsed.intro)].filter(Boolean).join(". ")
    },
    ...parsed.sections.map((section) => ({
      id: section.id,
      label: section.heading,
      type: "section" as const,
      plainText: [section.heading, resourceMarkdownToPlainText(section.body)].filter(Boolean).join(". ")
    }))
  ];
  const discussionLink = getResourceDiscussionLink({
    category: resource.category,
    type: resource.type,
    membershipTier: effectiveTier
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/resources"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <MoveLeft size={14} />
          Back to Resources
        </Link>
      </div>

      <Card className="overflow-hidden border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/68">
        <ResourceCoverImage
          resource={resource}
          className="aspect-[16/9] border-b border-silver/14"
          imageClassName="object-cover"
          overlayClassName="bg-[linear-gradient(180deg,rgba(3,8,20,0.04),rgba(3,8,20,0.14)_32%,rgba(3,8,20,0.56)_100%)]"
          priority
        />
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ResourceTierBadge tier={resource.tier} />
            <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
              {resource.category}
            </Badge>
            <Badge variant="outline" className="border-silver/14 normal-case tracking-normal text-silver">
              {getResourceTypeLabel(resource.type)}
            </Badge>
          </div>
          <div className="space-y-3">
            <CardTitle className="max-w-4xl font-display text-4xl leading-tight">
              {resource.title}
            </CardTitle>
            <CardDescription className="max-w-3xl text-base">{resource.excerpt}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.08em] text-silver">
            <span>{resource.publishedAt ? `Published ${formatDate(resource.publishedAt)}` : "Published"}</span>
            <span>Member-only resource</span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <ResourceNarratorProvider items={narrationItems}>
            <ResourceNarratorCard sectionId="opening">
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <CardTitle>Opening</CardTitle>
                    <CardDescription>The central idea in one direct pass.</CardDescription>
                  </div>
                  <ResourceNarratorPrimaryControls />
                </div>
              </CardHeader>
              <CardContent>
                <ResourceMarkdown content={parsed.intro} />
              </CardContent>
            </ResourceNarratorCard>

            {parsed.sections.map((section) => (
              <ResourceNarratorCard key={section.id} sectionId={section.id}>
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="pr-3">{section.heading}</CardTitle>
                    <ResourceNarratorSectionButton
                      sectionId={section.id}
                      label={section.heading}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ResourceMarkdown content={section.body} />
                </CardContent>
              </ResourceNarratorCard>
            ))}
          </ResourceNarratorProvider>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Next step</p>
              <CardTitle>Worth your time next</CardTitle>
              <CardDescription>
                More reading connected by category, type, or tier within your access level.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedResources.length ? (
                relatedResources.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/resources/${item.slug}`}
                    className="block rounded-2xl border border-silver/14 bg-background/20 p-4 transition-colors hover:border-silver/28"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">{item.title}</p>
                        <p className="line-clamp-2 text-sm text-muted">{item.excerpt}</p>
                        <p className="text-xs uppercase tracking-[0.08em] text-silver">
                          {item.category} | {getResourceTypeLabel(item.type)}
                        </p>
                      </div>
                      <ResourceTierBadge tier={item.tier} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted">
                  Related resources will appear here as more material is published in your access tier.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Library status</p>
              <CardTitle className="text-base">
                {readState ? "Marked as read" : "Keep this in your unread view"}
              </CardTitle>
              <CardDescription>
                {readState
                  ? "This resource now lives in your read archive, but you can open it again any time."
                  : "Mark this as read when you have finished with it and want the main view to stay focused on unread resources."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {readState ? (
                <form action={markResourceAsUnreadAction}>
                  <input type="hidden" name="slug" value={resource.slug} />
                  <input type="hidden" name="returnPath" value={`/dashboard/resources/${resource.slug}`} />
                  <Button variant="outline" className="w-full border-silver/16 hover:border-silver/28">
                    Move back to unread
                  </Button>
                </form>
              ) : (
                <form action={markResourceAsReadAction}>
                  <input type="hidden" name="slug" value={resource.slug} />
                  <input type="hidden" name="returnPath" value={`/dashboard/resources/${resource.slug}`} />
                  <Button className="w-full">Mark as read</Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="sticky top-24 border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <NotebookTabs size={16} className="text-silver" />
                On This Page
              </CardTitle>
              <CardDescription>
                Jump between sections while reading.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="#opening"
                className="block rounded-lg border border-silver/14 bg-background/20 px-3 py-2 text-sm text-muted transition-colors hover:border-silver/28 hover:text-foreground"
              >
                Opening
              </a>
              {parsed.sections.map((section) => (
                <a
                  key={`toc-${section.id}`}
                  href={`#${section.id}`}
                  className="block rounded-lg border border-silver/14 bg-background/20 px-3 py-2 text-sm text-muted transition-colors hover:border-silver/28 hover:text-foreground"
                >
                  {section.heading}
                </a>
              ))}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recently added</p>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Sparkles size={16} className="text-silver" />
                Keep reading
              </CardTitle>
              <CardDescription>
                Fresh material available inside your current membership.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentlyAdded.length ? (
                recentlyAdded.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/resources/${item.slug}`}
                    className="block rounded-xl border border-silver/14 bg-background/20 px-3 py-3 transition-colors hover:border-silver/28 hover:bg-background/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted">
                          {item.category}
                          {item.publishedAt ? ` | ${formatDate(item.publishedAt)}` : ""}
                        </p>
                      </div>
                      <ResourceTierBadge tier={item.tier} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted">
                  Recently published resources will appear here as more material goes live.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Relevant discussion</p>
              <CardTitle className="text-base">{discussionLink.title}</CardTitle>
              <CardDescription>{discussionLink.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={discussionLink.href}>
                <Button variant="outline" className="w-full border-silver/16 hover:border-silver/28">
                  {discussionLink.label}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
