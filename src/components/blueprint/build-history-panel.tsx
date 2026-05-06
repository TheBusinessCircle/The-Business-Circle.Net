import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  MessageSquare,
  Sparkles,
  Vote
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BCN_CREATION_TIMELINE,
  getBlueprintHistoryProgressGroups,
  hasBlueprintHistoryProgress,
  type BlueprintHistoryProgressGroup,
  type BlueprintHistoryProgressItem,
  type BuildHistoryEntryType
} from "@/lib/blueprint/build-history";
import { cn } from "@/lib/utils";
import type { BlueprintRoadmapSectionModel } from "@/types/blueprint";

const TYPE_LABELS: Record<BuildHistoryEntryType, string> = {
  origin: "Origin",
  foundation: "Foundation",
  membership: "Membership",
  experience: "Experience",
  clarity: "Clarity",
  "member-shaped": "Member-shaped",
  "growth-architect": "Growth Architect",
  identity: "Identity",
  "launch-readiness": "Launch readiness"
};

function progressIcon(groupId: BlueprintHistoryProgressGroup["id"]) {
  if (groupId === "completed") {
    return CheckCircle2;
  }

  if (groupId === "memberVoted") {
    return Vote;
  }

  return MessageSquare;
}

function TimelineTypeBadge({ type }: { type: BuildHistoryEntryType }) {
  return (
    <span className="inline-flex rounded-full border border-[hsl(var(--member-accent-border)/0.28)] bg-[hsl(var(--member-accent)/0.1)] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-[hsl(var(--member-accent-text))]">
      {TYPE_LABELS[type]}
    </span>
  );
}

function ProgressItemCard({ item }: { item: BlueprintHistoryProgressItem }) {
  return (
    <article className="min-w-0 rounded-2xl border border-silver/12 bg-background/24 p-4 shadow-inner-surface">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge variant="outline" className="max-w-full normal-case tracking-normal">
          {item.sectionTitle}
        </Badge>
        {item.statusLabel ? (
          <Badge className="max-w-full border-[hsl(var(--member-accent-border)/0.32)] bg-[hsl(var(--member-accent)/0.12)] text-[hsl(var(--member-accent-text))] normal-case tracking-normal">
            {item.statusLabel}
          </Badge>
        ) : null}
        {item.voteCount > 0 ? (
          <Badge variant="muted" className="normal-case tracking-normal">
            {item.voteCount} member signals
          </Badge>
        ) : null}
      </div>
      <h4 className="mt-3 font-display text-lg text-foreground">{item.title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">{item.shortDescription}</p>
      {item.voteCount > 0 ? (
        <div className="mt-4 grid gap-2 text-[11px] text-muted min-[420px]:grid-cols-2 min-[620px]:grid-cols-4">
          <span className="rounded-xl border border-silver/10 bg-background/22 px-2.5 py-2">
            Support {item.supportVotes}
          </span>
          <span className="rounded-xl border border-silver/10 bg-background/22 px-2.5 py-2">
            Priority {item.highPriorityVotes}
          </span>
          <span className="rounded-xl border border-amber-300/16 bg-amber-300/8 px-2.5 py-2 text-amber-100/82">
            Member signal: Not needed {item.notNeededVotes}
          </span>
          <span className="rounded-xl border border-silver/10 bg-background/22 px-2.5 py-2">
            Discuss {item.needsDiscussionVotes}
          </span>
        </div>
      ) : null}
    </article>
  );
}

function ProgressGroup({ group }: { group: BlueprintHistoryProgressGroup }) {
  const Icon = progressIcon(group.id);

  return (
    <section className="min-w-0 rounded-2xl border border-silver/12 bg-background/18 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[hsl(var(--member-accent-border)/0.34)] bg-[hsl(var(--member-accent)/0.12)] text-[hsl(var(--member-accent-text))]">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-xl text-foreground">{group.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{group.description}</p>
        </div>
      </div>
      {group.items.length ? (
        <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
          {group.items.map((item) => (
            <ProgressItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-silver/14 bg-background/16 px-4 py-3 text-sm text-muted">
          No items in this history lane yet.
        </p>
      )}
    </section>
  );
}

export function BuildHistoryPanel({ sections }: { sections: BlueprintRoadmapSectionModel[] }) {
  const progressGroups = getBlueprintHistoryProgressGroups(sections);
  const hasProgress = hasBlueprintHistoryProgress(progressGroups);

  return (
    <section className="member-accent-card relative overflow-hidden rounded-[2rem] border border-[hsl(var(--member-accent-border)/0.28)] bg-[linear-gradient(145deg,hsl(var(--card)/0.82),hsl(var(--background)/0.38))] shadow-panel backdrop-blur">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--member-accent-text)/0.6)] to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,hsl(var(--member-accent)/0.15),transparent_32%),radial-gradient(circle_at_10%_100%,hsl(var(--member-accent-highlight)/0.08),transparent_30%)]" />
      <details className="group relative">
        <summary className="flex cursor-pointer list-none flex-col gap-5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--member-accent-soft)/0.75)] sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--member-accent-border)/0.3)] bg-[hsl(var(--member-accent)/0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-[hsl(var(--member-accent-text))]">
              <History size={13} />
              BUILD HISTORY
            </p>
            <h2 className="mt-4 font-display text-3xl text-foreground sm:text-4xl">
              From idea to now
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
              See the moments, decisions, completed work, and member-shaped progress that have built The Business Circle into what it is today.
            </p>
          </div>
          <span className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--member-accent-border)/0.34)] bg-[hsl(var(--member-accent)/0.12)] px-4 py-3 text-sm font-medium text-[hsl(var(--member-accent-text))] transition-colors group-open:bg-[hsl(var(--member-accent)/0.18)] sm:w-auto">
            <span className="group-open:hidden">View build history</span>
            <span className="hidden group-open:inline">Hide build history</span>
            <ChevronDown
              size={16}
              className="transition-transform duration-200 group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="border-t border-[hsl(var(--member-accent-border)/0.2)] px-5 pb-5 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7">
          <div className="grid gap-6 pt-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.65fr)]">
            <section className="min-w-0">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 size={16} className="text-[hsl(var(--member-accent-text))]" />
                <h3 className="font-display text-2xl text-foreground">Creation Timeline</h3>
              </div>
              <div className="relative space-y-3 md:pl-6">
                <div className="absolute bottom-3 left-[17px] top-3 hidden w-px bg-gradient-to-b from-[hsl(var(--member-accent-text)/0)] via-[hsl(var(--member-accent-border)/0.45)] to-[hsl(var(--member-accent-text)/0)] md:block" />
                {BCN_CREATION_TIMELINE.map((entry, index) => (
                  <article
                    key={`${entry.type}-${entry.title}`}
                    className="relative min-w-0 rounded-2xl border border-silver/12 bg-background/22 p-4 shadow-inner-surface"
                  >
                    <span className="absolute -left-[1.82rem] top-5 hidden h-3.5 w-3.5 rounded-full border border-[hsl(var(--member-accent-border)/0.48)] bg-background shadow-[0_0_18px_hsl(var(--member-accent)/0.28)] md:block" />
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-silver/12 bg-background/32 text-xs text-silver">
                        {index + 1}
                      </span>
                      <TimelineTypeBadge type={entry.type} />
                    </div>
                    <h4 className="mt-3 font-display text-lg text-foreground">{entry.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-muted">{entry.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="min-w-0">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-[hsl(var(--member-accent-text))]" />
                <div>
                  <h3 className="font-display text-2xl text-foreground">
                    Completed and member-shaped progress
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    A record of the ideas that have moved from discussion, voting, or planning into the live environment.
                  </p>
                </div>
              </div>
              {hasProgress ? (
                <div className="space-y-4">
                  {progressGroups.map((group) => (
                    <ProgressGroup key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-2xl border border-dashed border-silver/16 bg-background/18 px-4 py-5 text-sm leading-6 text-muted"
                  )}
                >
                  Completed roadmap history will appear here as Blueprint items move from idea to live build.
                </div>
              )}
            </section>
          </div>
        </div>
      </details>
    </section>
  );
}
