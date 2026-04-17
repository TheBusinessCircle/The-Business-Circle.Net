import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { DirectMessageAttachmentView } from "@/components/messages";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getWinDetailForViewer } from "@/server/wins";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Win",
  description: "Structured member success inside The Business Circle Network.",
  path: "/wins/view",
  noIndex: true
});

export default async function WinDetailPage({ params }: PageProps) {
  const session = await requireUser();
  const { slug } = await params;
  const win = await getWinDetailForViewer({
    slug,
    userId: session.user.id
  });

  if (!win) {
    redirect("/wins?error=win-not-found");
  }

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/80 to-card/72">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
              {win.category.replaceAll("_", " ")}
            </Badge>
            <Badge variant="outline" className="text-muted">
              {win.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="font-display text-4xl">{win.title}</CardTitle>
            <CardDescription className="max-w-3xl text-base">
              {win.summary}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outcome</CardTitle>
          <CardDescription>
            Shared by {win.author.name ?? win.author.email} · {formatDate(win.publishedAt ?? win.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {win.quote ? (
            <div className="rounded-[24px] border border-silver/14 bg-background/20 px-5 py-5 text-sm leading-7 text-foreground/92">
              “{win.quote}”
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {win.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="normal-case tracking-normal text-silver">
                #{tag}
              </Badge>
            ))}
          </div>

          {win.participants.length ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Members involved</p>
              <div className="grid gap-3 md:grid-cols-2">
                {win.participants.map((participant) => (
                  <div key={participant.id} className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                    <p className="text-sm font-medium text-foreground">
                      {participant.user.name ?? participant.user.email}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {participant.user.companyName || participant.user.headline || participant.role}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-2 text-xs text-silver">
                      <CheckCircle2 size={12} />
                      {participant.status.replaceAll("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {win.attachments.length ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Proof and supporting files</p>
              {win.attachments.map((attachment) => (
                <DirectMessageAttachmentView key={attachment.id} attachment={attachment} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
