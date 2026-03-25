"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UserSummary = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: UserSummary;
};

type ChatPanelProps = {
  slug: string;
};

export function ChatPanel({ slug }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/channels/${slug}/messages`, { cache: "no-store" });
    const payload = (await response.json()) as { messages?: Message[]; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Failed to load messages.");
      return;
    }

    setError(null);
    setMessages(payload.messages ?? []);
  }, [slug]);

  useEffect(() => {
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3500);

    return () => clearInterval(interval);
  }, [loadMessages]);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();
    if (!content) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/channels/${slug}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
      });

      const payload = (await response.json()) as { error?: string; message?: Message };

      const message = payload.message;

      if (!response.ok || !message) {
        setError(payload.error ?? "Failed to send message.");
        return;
      }

      setError(null);
      setInput("");
      setMessages((current) => [...current, message]);
    });
  };

  const content = useMemo(() => {
    if (!messages.length) {
      return <p className="text-sm text-muted">No messages yet. Start the conversation.</p>;
    }

    return messages.map((message) => (
      <div key={message.id} className="rounded-xl border border-border bg-background/50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Avatar name={message.user.name || message.user.email} image={message.user.image} className="h-8 w-8" />
          <div>
            <p className="text-sm font-medium">{message.user.name || message.user.email}</p>
            <p className="text-xs text-muted">{formatDistanceToNowStrict(new Date(message.createdAt), { addSuffix: true })}</p>
          </div>
        </div>
        <p className="text-sm text-foreground">{message.content}</p>
      </div>
    ));
  }, [messages]);

  return (
    <div className="flex h-[68vh] flex-col rounded-2xl border border-border bg-card/70">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-lg font-semibold">#{slug}</h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{content}</div>
      <form onSubmit={submitMessage} className="border-t border-border p-4">
        {error ? <p className="mb-2 text-sm text-primary">{error}</p> : null}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Write your message..."
            maxLength={1200}
          />
          <Button type="submit" disabled={isPending}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

