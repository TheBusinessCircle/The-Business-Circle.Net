"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2
} from "lucide-react";
import {
  updateCircleCardSocialLinksInlineAction,
  type CircleCardSocialLinksInlineActionResult
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  CircleCardSocialLink,
  CircleCardSocialPlatform
} from "@/lib/circle-card/schema";
import { cn } from "@/lib/utils";

type CircleCardSocialLinkEditorProps = {
  cardId?: string | null;
  initialLinks: CircleCardSocialLink[];
};

const SOCIAL_PLATFORM_LABELS: Record<CircleCardSocialPlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  discord: "Discord",
  website: "Website",
  twitch: "Twitch",
  podcast: "Podcast",
  other: "Other"
};

const SOCIAL_PLATFORM_OPTIONS = Object.entries(SOCIAL_PLATFORM_LABELS) as Array<
  [CircleCardSocialPlatform, string]
>;

function newSocialId() {
  try {
    return window.crypto.randomUUID();
  } catch {
    return `social-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function sortLinks(links: CircleCardSocialLink[]) {
  return [...links]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link, index) => ({ ...link, sortOrder: index }));
}

function createEmptyLink(sortOrder: number): CircleCardSocialLink {
  return {
    id: newSocialId(),
    platform: "instagram",
    label: null,
    url: "",
    isActive: true,
    sortOrder
  };
}

function serializeLinks(links: CircleCardSocialLink[]) {
  return JSON.stringify(
    sortLinks(links)
      .filter((link) => link.url.trim())
      .map((link) => ({
        id: link.id,
        platform: link.platform,
        label: link.label?.trim() || null,
        url: link.url.trim(),
        isActive: link.isActive,
        sortOrder: link.sortOrder
      }))
  );
}

export function CircleCardSocialLinkEditor({
  cardId,
  initialLinks
}: CircleCardSocialLinkEditorProps) {
  const [links, setLinks] = useState(() =>
    sortLinks(initialLinks.length ? initialLinks : [createEmptyLink(0)])
  );
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">("info");
  const [saving, setSaving] = useState(false);
  const serializedLinks = useMemo(() => serializeLinks(links), [links]);
  const activeCount = links.filter((link) => link.isActive && link.url.trim()).length;

  function updateLink(id: string, updates: Partial<CircleCardSocialLink>) {
    setStatus("");
    setLinks((current) =>
      current.map((link) => (link.id === id ? { ...link, ...updates } : link))
    );
  }

  function addLink() {
    setStatus("");
    setLinks((current) => sortLinks([...current, createEmptyLink(current.length)]));
  }

  function removeLink(id: string) {
    setStatus("Deleted");
    setStatusTone("success");
    setLinks((current) => {
      const next = current.filter((link) => link.id !== id);
      return sortLinks(next.length ? next : [createEmptyLink(0)]);
    });
  }

  function moveLink(id: string, direction: "up" | "down") {
    setStatus("");
    setLinks((current) => {
      const next = sortLinks(current);
      const currentIndex = next.findIndex((link) => link.id === id);

      if (currentIndex < 0) {
        return next;
      }

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return next;
      }

      const [movedLink] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, movedLink);
      return sortLinks(next);
    });
  }

  async function saveSocialLinks() {
    if (!cardId) {
      return;
    }

    setSaving(true);
    setStatus("Saving...");
    setStatusTone("info");

    const result: CircleCardSocialLinksInlineActionResult =
      await updateCircleCardSocialLinksInlineAction({
        cardId,
        socialLinksJson: serializedLinks
      });

    if (result.ok) {
      setLinks(sortLinks(result.links.length ? result.links : [createEmptyLink(0)]));
      setStatus("Saved");
      setStatusTone("success");
    } else {
      setStatus(result.message || "Failed");
      setStatusTone("error");
    }

    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="socialLinksJson" value={serializedLinks} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="outline" className="border-gold/25 text-gold">
            {activeCount} active
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={addLink}>
            <Plus size={15} />
            Add another social link
          </Button>
          {cardId ? (
            <Button type="button" className="gap-2" disabled={saving} onClick={saveSocialLinks}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving..." : "Save social links"}
            </Button>
          ) : null}
        </div>
      </div>

      {status ? (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-2xl border px-4 py-3 text-sm",
            statusTone === "success"
              ? "border-gold/24 bg-gold/10 text-gold"
              : statusTone === "error"
                ? "border-destructive/24 bg-destructive/10 text-destructive"
                : "border-silver/14 bg-background/22 text-muted"
          )}
        >
          {statusTone === "success" ? <CheckCircle2 size={14} /> : null}
          {status}
        </p>
      ) : null}

      <div className="space-y-3">
        {links.map((link, index) => {
          const isFirst = index === 0;
          const isLast = index === links.length - 1;

          return (
            <div
              key={link.id}
              className="rounded-2xl border border-silver/14 bg-background/18 p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor={`social-platform-${link.id}`}>Platform</Label>
                  <Select
                    id={`social-platform-${link.id}`}
                    value={link.platform}
                    onChange={(event) =>
                      updateLink(link.id, {
                        platform: event.target.value as CircleCardSocialPlatform
                      })
                    }
                  >
                    {SOCIAL_PLATFORM_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`social-label-${link.id}`}>Label</Label>
                  <Input
                    id={`social-label-${link.id}`}
                    value={link.label ?? ""}
                    maxLength={80}
                    placeholder={`${SOCIAL_PLATFORM_LABELS[link.platform]} account`}
                    onChange={(event) => updateLink(link.id, { label: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`social-url-${link.id}`}>URL or handle</Label>
                  <Input
                    id={`social-url-${link.id}`}
                    value={link.url}
                    placeholder="https://... or @handle"
                    onChange={(event) => updateLink(link.id, { url: event.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 px-0"
                    disabled={isFirst}
                    title="Move social link up"
                    onClick={() => moveLink(link.id, "up")}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 px-0"
                    disabled={isLast}
                    title="Move social link down"
                    onClick={() => moveLink(link.id, "down")}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2"
                    onClick={() => removeLink(link.id)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </Button>
                </div>
              </div>
              <label
                htmlFor={`social-active-${link.id}`}
                className="mt-3 flex items-start gap-3 text-sm text-foreground"
              >
                <input
                  id={`social-active-${link.id}`}
                  type="checkbox"
                  checked={link.isActive}
                  className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                  onChange={(event) => updateLink(link.id, { isActive: event.target.checked })}
                />
                <span>
                  Active on public card
                  <span className="mt-0.5 block text-xs text-muted">
                    Paused social links stay saved but hidden publicly.
                  </span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
