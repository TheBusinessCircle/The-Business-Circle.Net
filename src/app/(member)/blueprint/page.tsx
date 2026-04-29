import type { Metadata } from "next";
import {
  GitBranch,
  HeartHandshake,
  Lock,
  MessageSquare,
  Sparkles
} from "lucide-react";
import {
  castBlueprintVoteAction,
  createBlueprintDiscussionCommentAction,
  deleteBlueprintDiscussionCommentAction,
  toggleBlueprintDiscussionLikeAction
} from "@/actions/blueprint";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BLUEPRINT_VOTE_LABELS, BLUEPRINT_VOTE_TYPES } from "@/config/blueprint";
import { getMembershipTierLabel } from "@/config/membership";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";
import { getBlueprintPageData } from "@/server/blueprint";
import type {
  BlueprintCardModel,
  BlueprintDiscussionCommentModel,
  BlueprintIntroSectionModel,
  BlueprintRoadmapSectionModel
} from "@/types/blueprint";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "The Circle Blueprint",
  description:
    "See where The Business Circle started, where it is now, and what is being shaped next by the members inside the room.",
  path: "/blueprint"
});

export const dynamic = "force-dynamic";

const RETURN_PATH = "/blueprint";
const FOUNDATION_LOCKED_MESSAGE =
  "Voting is available to Inner Circle and Core members, where deeper platform direction is shaped with the founder.";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "blueprint-vote-saved": "Your Blueprint signal has been saved.",
    "blueprint-comment-created": "Your comment has been added.",
    "blueprint-comment-removed": "The comment has been removed."
  };
  const errorMap: Record<string, string> = {
    "blueprint-vote-locked": "Voting is only available to Inner Circle and Core members.",
    "blueprint-card-missing": "That Blueprint card is no longer available.",
    "blueprint-comment-invalid": "Please add a little more detail before posting.",
    "blueprint-discussion-forbidden": "Discussion is only available to Inner Circle and Core members.",
    "blueprint-discussion-locked": "That Blueprint discussion is still locked.",
    "blueprint-like-unavailable": "That comment like could not be updated."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function statusClass(label: string | undefined) {
  const normalized = label?.toLowerCase() ?? "";

  if (normalized.includes("origin")) {
    return "border-silver/24 bg-silver/10 text-silver";
  }

  if (normalized.includes("live")) {
    return "border-emerald-400/30 bg-emerald-400/12 text-emerald-100";
  }

  if (normalized.includes("progress")) {
    return "border-blue-300/30 bg-blue-300/12 text-blue-100";
  }

  if (normalized.includes("consider")) {
    return "border-amber-300/30 bg-amber-300/12 text-amber-100";
  }

  if (normalized.includes("member")) {
    return "border-gold/40 bg-gold/14 text-gold";
  }

  return "border-primary/30 bg-primary/12 text-primary";
}

function authorName(comment: BlueprintDiscussionCommentModel) {
  return comment.author.name ?? comment.author.email.split("@")[0] ?? "Member";
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-gold/25 bg-[linear-gradient(135deg,hsl(var(--card)/0.88),hsl(var(--background)/0.52))] p-6 shadow-panel backdrop-blur sm:p-8 lg:p-10">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,hsl(var(--gold)/0.16),transparent_34%),radial-gradient(circle_at_12%_92%,hsl(var(--silver)/0.08),transparent_30%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.34fr)] lg:items-end">
        <div className="max-w-4xl">
          <p className="premium-kicker">
            <GitBranch size={13} />
            Founder-led roadmap
          </p>
          <h1 className="mt-5 font-display text-4xl font-semibold text-foreground sm:text-5xl lg:text-6xl">
            The Circle Blueprint
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted sm:text-lg">
            See where The Business Circle started, where it is now, and what is being shaped next by the members inside the room.
          </p>
        </div>
        <div className="rounded-2xl border border-silver/14 bg-background/24 p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-silver">Signal rule</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Inner Circle and Core members can signal Support, High Priority, or Needs Discussion. Final direction stays founder-led.
          </p>
        </div>
      </div>
    </section>
  );
}

function IntroTimeline({ sections }: { sections: BlueprintIntroSectionModel[] }) {
  if (!sections.length) {
    return (
      <section className="empty-state-panel">
        <p className="text-sm text-muted">The intro timeline is being refined.</p>
      </section>
    );
  }

  return (
    <section className="relative grid gap-4 lg:grid-cols-3">
      <div className="pointer-events-none absolute left-4 right-4 top-7 hidden h-px bg-gradient-to-r from-gold/0 via-gold/45 to-gold/0 lg:block" />
      {sections.map((section, index) => (
        <article
          key={section.id}
          className="relative rounded-2xl border border-silver/14 bg-background/24 p-5 shadow-panel-soft backdrop-blur"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/35 bg-gold/12 text-sm font-semibold text-gold shadow-gold-soft">
              {index + 1}
            </span>
            <h2 className="font-display text-xl text-foreground">{section.title}</h2>
          </div>
          <p className="text-sm leading-7 text-muted">{section.copy}</p>
        </article>
      ))}
    </section>
  );
}

function VotePanel({
  card,
  viewerCanVote
}: {
  card: BlueprintCardModel;
  viewerCanVote: boolean;
}) {
  if (!viewerCanVote) {
    return (
      <div className="rounded-2xl border border-gold/20 bg-gold/10 p-4 text-sm leading-6 text-gold/90">
        <Lock size={14} className="mb-2" />
        {FOUNDATION_LOCKED_MESSAGE}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {BLUEPRINT_VOTE_TYPES.map((voteType) => {
          const active = card.viewerVote === voteType;

          return (
            <form key={voteType} action={castBlueprintVoteAction}>
              <input type="hidden" name="returnPath" value={`${RETURN_PATH}#blueprint-card-${card.id}`} />
              <input type="hidden" name="cardId" value={card.id} />
              <input type="hidden" name="voteType" value={voteType} />
              <Button
                type="submit"
                variant={active ? "default" : "outline"}
                size="sm"
                className="w-full justify-between gap-2"
                aria-pressed={active}
              >
                <span>{BLUEPRINT_VOTE_LABELS[voteType]}</span>
                <span className="rounded-full bg-background/20 px-2 py-0.5 text-[11px]">
                  {card.voteCounts[voteType]}
                </span>
              </Button>
            </form>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        One signal per card. Change it any time as the build becomes clearer.
      </p>
    </div>
  );
}

function CommentComposer({
  cardId,
  parentCommentId,
  compact = false
}: {
  cardId: string;
  parentCommentId?: string | null;
  compact?: boolean;
}) {
  return (
    <form action={createBlueprintDiscussionCommentAction} className="space-y-2">
      <input type="hidden" name="returnPath" value={`${RETURN_PATH}#blueprint-card-${cardId}`} />
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="parentCommentId" value={parentCommentId ?? ""} />
      <Textarea
        name="content"
        rows={compact ? 2 : 3}
        placeholder={compact ? "Add a reply" : "Add a discussion note"}
        className={compact ? "min-h-[84px]" : undefined}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="outline">
          {compact ? "Post reply" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}

function CommentThread({
  comments,
  viewerIsAdmin,
  depth = 0
}: {
  comments: BlueprintDiscussionCommentModel[];
  viewerIsAdmin: boolean;
  depth?: number;
}) {
  if (!comments.length) {
    return null;
  }

  return (
    <div className={cn("space-y-3", depth > 0 ? "border-l border-silver/12 pl-4" : "")}>
      {comments.map((comment) => (
        <article
          key={comment.id}
          className={cn(
            "rounded-2xl border p-4",
            depth > 0 ? "border-silver/10 bg-background/12" : "border-silver/14 bg-background/18"
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar name={authorName(comment)} image={comment.author.image} className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{authorName(comment)}</p>
                <Badge variant="muted" className="normal-case tracking-normal">
                  {getMembershipTierLabel(comment.author.membershipTier)}
                </Badge>
                <span className="text-xs text-muted">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                {comment.content}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={toggleBlueprintDiscussionLikeAction}>
                  <input
                    type="hidden"
                    name="returnPath"
                    value={`${RETURN_PATH}#blueprint-card-${comment.cardId}`}
                  />
                  <input type="hidden" name="commentId" value={comment.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={comment.viewerHasLiked ? "default" : "ghost"}
                    className="h-7 gap-1.5 px-2 text-xs shadow-none"
                    aria-pressed={comment.viewerHasLiked}
                  >
                    <HeartHandshake size={12} />
                    {comment.likeCount}
                  </Button>
                </form>
                <details className="group">
                  <summary className="cursor-pointer rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-background/30 hover:text-foreground">
                    Reply
                  </summary>
                  <div className="mt-3 rounded-2xl border border-silver/12 bg-background/12 p-3">
                    <CommentComposer cardId={comment.cardId} parentCommentId={comment.id} compact />
                  </div>
                </details>
                {viewerIsAdmin ? (
                  <form action={deleteBlueprintDiscussionCommentAction}>
                    <input
                      type="hidden"
                      name="returnPath"
                      value={`${RETURN_PATH}#blueprint-card-${comment.cardId}`}
                    />
                    <input type="hidden" name="commentId" value={comment.id} />
                    <Button type="submit" size="sm" variant="danger" className="h-7 px-2 text-xs">
                      Remove
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
          <CommentThread
            comments={comment.replies}
            viewerIsAdmin={viewerIsAdmin}
            depth={depth + 1}
          />
        </article>
      ))}
    </div>
  );
}

function DiscussionPanel({
  card,
  viewerCanDiscuss,
  viewerIsAdmin
}: {
  card: BlueprintCardModel;
  viewerCanDiscuss: boolean;
  viewerIsAdmin: boolean;
}) {
  if (!viewerCanDiscuss) {
    return null;
  }

  if (!card.discussionUnlocked) {
    return (
      <div className="rounded-2xl border border-silver/14 bg-background/18 p-4 text-sm leading-6 text-muted">
        Discussion unlocks when at least two vote categories reach 10 signals, or when the founder opens it manually.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gold/20 bg-gold/10 p-4">
      <div className="flex items-center gap-2">
        <MessageSquare size={15} className="text-gold" />
        <p className="text-sm font-medium text-foreground">Unlocked discussion</p>
      </div>
      {card.comments.length ? (
        <CommentThread comments={card.comments} viewerIsAdmin={viewerIsAdmin} />
      ) : (
        <div className="rounded-2xl border border-dashed border-silver/14 bg-background/12 px-4 py-3 text-sm text-muted">
          No comments yet. Start the thread with a useful signal.
        </div>
      )}
      <div className="rounded-2xl border border-silver/14 bg-background/12 p-4">
        <p className="mb-3 text-xs uppercase tracking-[0.08em] text-silver">Add to the discussion</p>
        <CommentComposer cardId={card.id} />
      </div>
    </div>
  );
}

function BlueprintCard({
  card,
  viewerCanVote,
  viewerCanDiscuss,
  viewerIsAdmin
}: {
  card: BlueprintCardModel;
  viewerCanVote: boolean;
  viewerCanDiscuss: boolean;
  viewerIsAdmin: boolean;
}) {
  return (
    <article
      id={`blueprint-card-${card.id}`}
      className="group relative rounded-[1.5rem] border border-silver/14 bg-[linear-gradient(145deg,hsl(var(--card)/0.78),hsl(var(--background)/0.34))] p-5 shadow-panel-soft backdrop-blur transition-all duration-300 hover:border-gold/35 hover:bg-card/80"
    >
      <span className="absolute -left-[7px] top-8 hidden h-3.5 w-3.5 rounded-full border border-gold/45 bg-background shadow-gold-soft lg:block" />
      <div className="flex flex-wrap items-center gap-2">
        {card.status ? (
          <Badge className={cn("normal-case tracking-normal", statusClass(card.status.label))}>
            {card.status.label}
          </Badge>
        ) : null}
        {card.tierRelevance ? (
          <Badge variant="outline" className="normal-case tracking-normal">
            {getMembershipTierLabel(card.tierRelevance)}
          </Badge>
        ) : null}
        {card.isCurrentFocus ? (
          <Badge variant="premium" className="normal-case tracking-normal">
            Current focus
          </Badge>
        ) : null}
        {card.isMemberShaped ? (
          <Badge variant="muted" className="normal-case tracking-normal">
            Member shaped
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-4 font-display text-xl text-foreground">{card.title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted">{card.shortDescription}</p>
      {card.detail ? (
        <p className="mt-3 text-sm leading-7 text-foreground/80">{card.detail}</p>
      ) : null}
      <div className="mt-5 space-y-4">
        <VotePanel card={card} viewerCanVote={viewerCanVote} />
        <DiscussionPanel
          card={card}
          viewerCanDiscuss={viewerCanDiscuss}
          viewerIsAdmin={viewerIsAdmin}
        />
      </div>
    </article>
  );
}

function RoadmapSection({
  section,
  viewerCanVote,
  viewerCanDiscuss,
  viewerIsAdmin
}: {
  section: BlueprintRoadmapSectionModel;
  viewerCanVote: boolean;
  viewerCanDiscuss: boolean;
  viewerIsAdmin: boolean;
}) {
  return (
    <section className="relative grid gap-5 lg:grid-cols-[minmax(190px,0.34fr)_minmax(0,1fr)]">
      <div className="relative z-10">
        <div className="sticky top-24 rounded-2xl border border-gold/24 bg-background/30 p-5 backdrop-blur">
          <span className="mb-4 grid h-10 w-10 place-items-center rounded-full border border-gold/35 bg-gold/12 text-gold shadow-gold-soft">
            <Sparkles size={16} />
          </span>
          <h2 className="font-display text-2xl text-foreground">{section.title}</h2>
          {section.copy ? <p className="mt-3 text-sm leading-6 text-muted">{section.copy}</p> : null}
        </div>
      </div>
      <div className="relative space-y-4 lg:border-l lg:border-gold/22 lg:pl-7">
        {section.cards.map((card) => (
          <BlueprintCard
            key={card.id}
            card={card}
            viewerCanVote={viewerCanVote}
            viewerCanDiscuss={viewerCanDiscuss}
            viewerIsAdmin={viewerIsAdmin}
          />
        ))}
      </div>
    </section>
  );
}

function RoadmapCanvas({
  sections,
  viewerCanVote,
  viewerCanDiscuss,
  viewerIsAdmin
}: {
  sections: BlueprintRoadmapSectionModel[];
  viewerCanVote: boolean;
  viewerCanDiscuss: boolean;
  viewerIsAdmin: boolean;
}) {
  if (!sections.length) {
    return (
      <section className="empty-state-panel">
        <p className="text-sm text-muted">The roadmap canvas is being shaped.</p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-silver/14 bg-background/24 p-4 shadow-panel backdrop-blur sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute left-8 top-10 bottom-10 hidden w-px bg-gradient-to-b from-gold/0 via-gold/32 to-gold/0 lg:block" />
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="premium-kicker">
            <GitBranch size={13} />
            Connected build map
          </p>
          <h2 className="mt-3 font-display text-3xl text-foreground">Roadmap Canvas</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Not a public promise list. A living map of what exists, what is being strengthened, and what is earning deeper attention.
        </p>
      </div>
      <div className="space-y-8">
        {sections.map((section) => (
          <RoadmapSection
            key={section.id}
            section={section}
            viewerCanVote={viewerCanVote}
            viewerCanDiscuss={viewerCanDiscuss}
            viewerIsAdmin={viewerIsAdmin}
          />
        ))}
      </div>
    </section>
  );
}

export default async function BlueprintPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const blueprint = await getBlueprintPageData({
    viewerUserId: session.user.id,
    viewerRole: session.user.role,
    viewerTier: session.user.membershipTier
  });

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            feedback.type === "notice"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
          )}
        >
          {feedback.message}
        </div>
      ) : null}
      <HeroSection />
      <IntroTimeline sections={blueprint.introSections} />
      <RoadmapCanvas
        sections={blueprint.roadmapSections}
        viewerCanVote={blueprint.viewerCanVote}
        viewerCanDiscuss={blueprint.viewerCanDiscuss}
        viewerIsAdmin={blueprint.viewerIsAdmin}
      />
    </div>
  );
}
