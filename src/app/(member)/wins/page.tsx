import type { Metadata } from "next";
import Link from "next/link";
import { Award, FilePenLine, Sparkles } from "lucide-react";
import { respondToWinCreditAction } from "@/actions/wins/wins.actions";
import { WinsFeedCard } from "@/components/wins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { listMemberWinDrafts, listPendingWinCredits, listPublishedWins } from "@/server/wins";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Wins",
  description: "Shared success from private collaboration inside The Business Circle Network.",
  path: "/wins",
  noIndex: true
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "win-saved": "Your win has been saved.",
    "credit-response-saved": "Your attribution response has been recorded."
  };

  const errorMap: Record<string, string> = {
    "win-save-failed": "We could not save that win right now.",
    "credit-response-failed": "We could not save your response right now."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function WinsPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const category = firstValue(params.category).toUpperCase() as Parameters<typeof listPublishedWins>[0]["category"];
  const tag = firstValue(params.tag).trim();

  const [publishedWins, drafts, pendingCredits] = await Promise.all([
    listPublishedWins({
      userId: session.user.id,
      category: category || "",
      tag
    }),
    listMemberWinDrafts(session.user.id),
    listPendingWinCredits(session.user.id)
  ]);

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <Award size={12} className="mr-1" />
                Shared success
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Wins</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Wins capture what moved because the right conversation continued into real collaboration.
              </CardDescription>
            </div>

            <Link href="/wins/new">
              <Button>
                <FilePenLine size={14} className="mr-2" />
                Create a win
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/35 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-100" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {pendingCredits.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Attribution waiting on you</CardTitle>
            <CardDescription>
              These wins mention you. Confirm the attribution before they move fully into the published feed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingCredits.map((win) => (
              <article key={win.id} className="rounded-[24px] border border-silver/14 bg-background/18 p-5">
                <p className="text-lg font-medium text-foreground">{win.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted">{win.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={respondToWinCreditAction}>
                    <input type="hidden" name="winId" value={win.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <input type="hidden" name="returnPath" value="/wins" />
                    <Button type="submit">Approve credit</Button>
                  </form>
                  <form action={respondToWinCreditAction}>
                    <input type="hidden" name="winId" value={win.id} />
                    <input type="hidden" name="decision" value="decline" />
                    <input type="hidden" name="returnPath" value="/wins" />
                    <Button type="submit" variant="outline">Decline credit</Button>
                  </form>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {drafts.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Your drafts and pending wins</CardTitle>
            <CardDescription>
              Keep drafts private until they are ready. Pending wins are waiting on credited member approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.map((win) => (
              <Link key={win.id} href={`/wins/new?draft=${win.id}`} className="block rounded-[22px] border border-silver/14 bg-background/18 px-4 py-4 transition-colors hover:border-silver/24">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{win.title}</p>
                    <p className="mt-1 text-xs text-muted">{win.status.replaceAll("_", " ")}</p>
                  </div>
                  <span className="text-sm text-silver">Open draft</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={16} />
            Published wins
          </CardTitle>
          <CardDescription>
            Search by category or tag when you want a cleaner read on the kinds of outcomes being created inside the environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input name="tag" defaultValue={tag} placeholder="Filter by tag" />
            <Button type="submit" variant="outline">Apply filter</Button>
          </form>

          <div className="space-y-4">
            {publishedWins.length ? (
              publishedWins.map((win) => <WinsFeedCard key={win.id} win={win} />)
            ) : (
              <EmptyState
                icon={Award}
                title="No wins match this view"
                description="Wins will appear here as members publish outcomes from collaboration, support, referrals, and clarity."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
