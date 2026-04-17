import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import type { WinCardModel } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type WinsFeedCardProps = {
  win: WinCardModel;
};

export function WinsFeedCard({ win }: WinsFeedCardProps) {
  return (
    <Card className="border-silver/16 bg-card/72 shadow-panel-soft">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-silver/16 bg-silver/10 text-silver">
            {win.category.replaceAll("_", " ")}
          </Badge>
          {win.featured ? (
            <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
              <Sparkles size={12} className="mr-1" />
              Featured
            </Badge>
          ) : null}
          {win.status !== "PUBLISHED" ? (
            <Badge variant="outline" className="border-border text-muted">
              {win.status.replaceAll("_", " ")}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">{win.title}</CardTitle>
          <p className="text-sm leading-7 text-muted">{win.summary}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {win.quote ? (
          <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 text-sm leading-7 text-foreground/90">
            “{win.quote}”
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="normal-case tracking-normal text-muted">
            {win.author.name ?? win.author.email}
          </Badge>
          {win.participants
            .filter((participant) => participant.role === "CREDITED" && participant.status === "APPROVED")
            .map((participant) => (
              <Badge
                key={participant.id}
                variant="outline"
                className="normal-case tracking-normal text-muted"
              >
                <CheckCircle2 size={11} className="mr-1" />
                {participant.user.name ?? participant.user.email}
              </Badge>
            ))}
          {win.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="normal-case tracking-normal text-silver">
              #{tag}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>{formatDate(win.publishedAt ?? win.createdAt)}</span>
          <Link
            href={`/wins/${win.slug}`}
            className="inline-flex items-center gap-2 text-silver transition-colors hover:text-foreground"
          >
            Open win
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
