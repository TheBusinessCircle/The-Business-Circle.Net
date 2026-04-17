"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type DirectMessageComposerProps = {
  threadId: string;
  disabled?: boolean;
  disabledMessage?: string | null;
};

export function DirectMessageComposer({
  threadId,
  disabled = false,
  disabledMessage
}: DirectMessageComposerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const canSend = useMemo(() => Boolean(content.trim().length || files.length), [content, files.length]);

  async function handleSubmit() {
    if (!canSend || disabled) {
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("content", content);
      files.forEach((file) => formData.append("attachments", file));

      const response = await fetch(`/api/messages/threads/${threadId}/messages`, {
        method: "POST",
        body: formData
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to send the message.");
      }

      setContent("");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to send the message."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-[26px] border border-silver/16 bg-card/78 p-4 shadow-panel-soft">
      <div className="space-y-3">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          placeholder={
            disabled
              ? "Private replies are currently unavailable in this thread."
              : "Write a focused private reply, share context, or send the next useful step."
          }
          disabled={disabled || isPending}
          className="min-h-[120px]"
        />

        {files.length ? (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <span
                key={`${file.name}-${file.size}`}
                className="rounded-full border border-silver/14 bg-background/22 px-3 py-1 text-xs text-silver"
              >
                {file.name}
              </span>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        {disabledMessage ? (
          <p className="text-xs text-muted">{disabledMessage}</p>
        ) : (
          <p className="text-xs text-muted">
            Images and working files stay inside this private conversation.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={14} className="mr-1" />
            Attach files
          </Button>
        </div>

        <Button type="button" disabled={disabled || isPending || !canSend} onClick={() => void handleSubmit()}>
          {isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <SendHorizontal size={14} className="mr-2" />}
          Send message
        </Button>
      </div>
    </div>
  );
}
