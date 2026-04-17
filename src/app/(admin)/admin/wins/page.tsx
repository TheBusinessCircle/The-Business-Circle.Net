import type { Metadata } from "next";
import { Award, Sparkles } from "lucide-react";
import { moderateWinStatusAction } from "@/actions/wins/wins.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { getWinAdminStats, listAdminWins } from "@/server/wins";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Wins",
  description: "Moderate published wins, attribution states, and member success visibility.",
  path: "/admin/wins"
});

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function AdminWinsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const status = firstValue(params.status).toUpperCase() as "" | "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "CHANGES_REQUESTED" | "ARCHIVED";

  const [stats, wins] = await Promise.all([
    getWinAdminStats(),
    listAdminWins({ query, status })
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <Sparkles size={12} className="mr-1" />
            Wins moderation
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">Wins</CardTitle>
          <CardDescription className="mt-2 text-base">
            Review published wins, pending approvals, and the member success stories appearing across the platform.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Wins created</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.totalWins}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Published</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.publishedWins}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Pending approval</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.pendingApprovalWins}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Featured</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.featuredWins}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Win queue</CardTitle>
          <CardDescription>
            Filter by status or search by title and author to review what is visible, pending, or archived.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input name="q" defaultValue={query} placeholder="Search title or author" />
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending approval</option>
                <option value="PUBLISHED">Published</option>
                <option value="CHANGES_REQUESTED">Changes requested</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline">Apply</Button>
            </div>
          </form>

          <div className="space-y-3">
            {wins.length ? (
              wins.map((win) => (
                <article key={win.id} className="rounded-[24px] border border-silver/14 bg-background/18 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-muted">
                          {win.category.replaceAll("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-muted">
                          {win.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-lg font-medium text-foreground">{win.title}</p>
                      <p className="text-sm text-muted">Author: {win.author.name ?? win.author.email}</p>
                      <p className="text-sm leading-7 text-foreground/88">{win.summary}</p>
                    </div>

                    <form action={moderateWinStatusAction} className="w-full max-w-sm space-y-2">
                      <input type="hidden" name="winId" value={win.id} />
                      <input type="hidden" name="returnPath" value="/admin/wins" />
                      <Select name="status" defaultValue={win.status}>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                        <option value="CHANGES_REQUESTED">Changes requested</option>
                      </Select>
                      <Input name="notes" placeholder="Optional moderation note" />
                      <Button type="submit" className="w-full justify-center">
                        Update win
                      </Button>
                    </form>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                icon={Award}
                title="No wins match this view"
                description="Wins will appear here for moderation as members draft, publish, and revise shared success."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
