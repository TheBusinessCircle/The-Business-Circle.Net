import { CommunityBadge } from "@/components/ui/community-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommunityRecognitionSummary } from "@/types";
import { cn } from "@/lib/utils";

type CommunityRecognitionPanelProps = {
  recognition: CommunityRecognitionSummary;
  title?: string;
  description?: string;
  className?: string;
};

function RecognitionStat({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/30 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function CommunityRecognitionPanel({
  recognition,
  title = "Community Recognition",
  description = "Recognition, status, and contribution signals inside The Business Circle.",
  className
}: CommunityRecognitionPanelProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <RecognitionStat label="Status" value={recognition.statusLevel} />
          <RecognitionStat
            label="Reputation"
            value={`${recognition.score} pts`}
            hint={recognition.score > 0 ? "Built through helpful contributions." : "No reputation recorded yet."}
          />
          <RecognitionStat
            label="Invitations"
            value={`${recognition.referralCount}`}
            hint={`${recognition.memberReferralCount} members | ${recognition.innerCircleReferralCount} Inner Circle+`}
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Badges</p>
            <p className="text-xs text-muted">
              Highest-priority badge appears in community conversations and member surfaces.
            </p>
          </div>

          {recognition.badges.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {recognition.badges.map((badge) => (
                <div
                  key={badge.slug}
                  title={badge.description}
                  className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
                >
                  <CommunityBadge badge={badge} className="w-fit" />
                  <p className="mt-2 text-sm font-medium text-foreground">{badge.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{badge.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/20 px-4 py-4 text-sm text-muted">
              No community badges yet. Recognition will appear here as contributions and referrals build.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
