"use client";

import { useRef, useState } from "react";
import { PencilLine, Send, Sparkles } from "lucide-react";
import { createCommunityPostAction } from "@/actions/community/feed.actions";
import { FeedSubmitButton } from "@/components/community/feed-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildCommunityChannelPath } from "@/lib/community-paths";
import type { ConversationPromptSuggestion } from "@/lib/community-rhythm";

type ConversationComposerProps = {
  channelName: string;
  channelSlug: string;
  currentUserName?: string | null;
  prompts: ConversationPromptSuggestion[];
};

export function ConversationComposer({
  channelName,
  channelSlug,
  currentUserName,
  prompts
}: ConversationComposerProps) {
  const returnPath = buildCommunityChannelPath(channelSlug);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  return (
    <Card className="border-silver/22 bg-gradient-to-br from-silver/12 via-card/82 to-card/72">
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <PencilLine size={18} className="text-gold" />
            Start a conversation
          </CardTitle>
          <CardDescription>
            Keep it clear and useful. Use one of the prompts below if you want a cleaner place to begin in {channelName}.
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="muted" className="normal-case tracking-normal">
            Clear title
          </Badge>
          <Badge variant="muted" className="normal-case tracking-normal">
            Useful detail
          </Badge>
          <Badge variant="muted" className="normal-case tracking-normal">
            Better replies
          </Badge>
        </div>

        {prompts.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {prompts.map((prompt) => {
              const selected = selectedPromptId === prompt.id;

              return (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => {
                    setSelectedPromptId(prompt.id);
                    setTitle(prompt.title);
                    setContent(prompt.prompt);
                    contentRef.current?.focus();
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    selected
                      ? "border-gold/32 bg-gold/10 shadow-gold-soft"
                      : "border-silver/14 bg-background/20 hover:border-silver/26 hover:bg-background/28"
                  }`}
                >
                  <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-silver">
                    <Sparkles size={12} />
                    Prompt
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">{prompt.title}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{prompt.prompt}</p>
                </button>
              );
            })}
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        <form action={createCommunityPostAction} className="space-y-4">
          <input type="hidden" name="returnPath" value={returnPath} />
          <input type="hidden" name="channelSlug" value={channelSlug} />

          <div className="space-y-2">
            <Input
              name="title"
              placeholder="Post title"
              aria-label="Post title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Textarea
              ref={contentRef}
              name="content"
              rows={5}
              placeholder={
                currentUserName
                  ? `${currentUserName}, what is worth discussing right now?`
                  : "What is worth discussing right now?"
              }
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Input
                name="tags"
                placeholder="Optional tags, separated by commas"
                aria-label="Optional tags"
                defaultValue=""
              />
              <p className="text-xs text-muted">
                Tags are optional. Use them only when they help people scan the room more quickly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedPromptId ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setSelectedPromptId(null);
                    setTitle("");
                    setContent("");
                  }}
                >
                  Clear prompt
                </Button>
              ) : null}
              <FeedSubmitButton type="submit" size="lg" pendingLabel="Publishing...">
                <Send size={14} className="mr-2" />
                Start discussion
              </FeedSubmitButton>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
