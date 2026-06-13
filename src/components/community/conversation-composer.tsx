"use client";

import { useRef, useState } from "react";
import { Hash, PencilLine, Send, Sparkles, Tag, X } from "lucide-react";
import { createCommunityPostAction } from "@/actions/community/feed.actions";
import { FeedSubmitButton } from "@/components/community/feed-submit-button";
import type { CommunityFeedChannelModel } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildCommunityChannelPath } from "@/lib/community-paths";
import { getCommunityChannelDisplayName } from "@/lib/community/channel-display";
import type { ConversationPromptSuggestion } from "@/lib/community-rhythm";

type ConversationComposerProps = {
  id?: string;
  channelName: string;
  channelSlug: string;
  channels: CommunityFeedChannelModel[];
  currentUserName?: string | null;
  currentUserImage?: string | null;
  prompts: ConversationPromptSuggestion[];
};

export function ConversationComposer({
  id,
  channelName,
  channelSlug,
  channels,
  currentUserName,
  currentUserImage,
  prompts
}: ConversationComposerProps) {
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(channelSlug);
  const [showTags, setShowTags] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const postableChannels = channels.filter((channel) => channel.allowMemberPosts);
  const selectedChannel =
    postableChannels.find((channel) => channel.slug === selectedSlug) ??
    postableChannels.find((channel) => channel.slug === channelSlug);
  const returnPath = buildCommunityChannelPath(selectedChannel?.slug ?? channelSlug);
  const displayName = currentUserName || "Member";
  const selectedChannelDisplayName = getCommunityChannelDisplayName(
    selectedChannel ?? { name: channelName, slug: channelSlug }
  );

  function expandComposer() {
    setIsExpanded(true);
    window.setTimeout(() => {
      contentRef.current?.focus();
    }, 0);
  }

  return (
    <Card id={id} className="rounded-xl border-silver/18 bg-card/68">
      <CardContent className="p-3 sm:p-4">
        {!isExpanded ? (
          <button
            type="button"
            onClick={expandComposer}
            className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-silver/12 bg-background/18 px-3 text-left transition-colors hover:border-silver/24 hover:bg-background/26"
            aria-label="Write something"
          >
            <Avatar name={displayName} image={currentUserImage} className="h-10 w-10 shrink-0" />
            <span className="min-w-0 flex-1 text-sm text-muted">Write something...</span>
            <PencilLine size={16} className="shrink-0 text-silver" />
          </button>
        ) : (
        <form action={createCommunityPostAction} className="space-y-3">
          <input type="hidden" name="returnPath" value={returnPath} />

          <div className="flex items-start gap-3">
            <Avatar name={displayName} image={currentUserImage} className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <Input
                name="title"
                placeholder="Optional title"
                aria-label="Optional post title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />

              <Textarea
                ref={contentRef}
                name="content"
                rows={4}
                placeholder={
                  currentUserName
                    ? `${currentUserName}, write something...`
                    : "Write something..."
                }
                className="min-h-[132px]"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="relative block min-w-0">
              <Hash size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
              <select
                name="channelSlug"
                aria-label="Room"
                value={selectedChannel?.slug ?? channelSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
                className="input-surface field-shell h-10 w-full min-w-0 rounded-lg border-0 bg-transparent py-2 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80"
              >
                {postableChannels.map((channel) => (
                  <option key={channel.id} value={channel.slug} className="bg-background text-foreground">
                    {getCommunityChannelDisplayName(channel)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted hover:text-foreground"
                onClick={() => setShowTags((current) => !current)}
              >
                <Tag size={13} />
                {showTags ? "Hide tags" : "Add tags"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted hover:text-foreground"
                onClick={() => {
                  setIsExpanded(false);
                  setSelectedPromptId(null);
                  setTitle("");
                  setContent("");
                  setShowTags(false);
                  setSelectedSlug(channelSlug);
                }}
              >
                <X size={13} />
                Cancel
              </Button>
              <FeedSubmitButton type="submit" size="sm" pendingLabel="Posting...">
                <Send size={13} className="mr-1.5" />
                Post
              </FeedSubmitButton>
            </div>
          </div>

          {showTags ? (
            <div className="pl-0 sm:pl-[3.25rem]">
              <Input
                name="tags"
                placeholder="Optional tags"
                aria-label="Optional tags"
                defaultValue=""
              />
            </div>
          ) : (
            <input type="hidden" name="tags" value="" />
          )}

          {prompts.length ? (
            <details className="rounded-lg border border-silver/12 bg-background/12 px-3 py-2">
              <summary className="cursor-pointer text-xs text-muted">
                Prompt ideas for {selectedChannelDisplayName}
              </summary>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {prompts.map((prompt) => {
                  const selected = selectedPromptId === prompt.id;

                  return (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => {
                        setSelectedPromptId(prompt.id);
                        setSelectedSlug(prompt.channelSlug);
                        setTitle(prompt.title);
                        setContent(prompt.prompt);
                        contentRef.current?.focus();
                      }}
                      className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                        selected
                          ? "border-gold/30 bg-gold/10"
                          : "border-silver/12 bg-background/16 hover:border-silver/24"
                      }`}
                    >
                      <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-silver">
                        <Sparkles size={11} />
                        Idea
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">{prompt.title}</p>
                    </button>
                  );
                })}
              </div>
            </details>
          ) : null}
        </form>
        )}
      </CardContent>
    </Card>
  );
}
