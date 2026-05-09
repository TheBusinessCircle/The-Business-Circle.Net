"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ExternalLink, Plus, RefreshCw, Sparkles, Star, ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  BcnIntelligenceItemAdminModel,
  BcnIntelligenceSourceAdminModel
} from "@/server/community/bcn-intelligence-admin.service";
import { cn, formatDate } from "@/lib/utils";

type IntelligenceControlPanelProps = {
  categories: string[];
  items: BcnIntelligenceItemAdminModel[];
  sources: BcnIntelligenceSourceAdminModel[];
};

export function IntelligenceControlPanel({ categories, items, sources }: IntelligenceControlPanelProps) {
  const router = useRouter();
  const [sourceRows, setSourceRows] = useState(sources);
  const [manualUrl, setManualUrl] = useState("");
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setMessageFromResponse(response: Response, fallback: string) {
    return response
      .json()
      .catch(() => ({}))
      .then((payload: { message?: string; error?: string; publishedCount?: number; status?: string }) => {
        setRefreshMessage(payload.message ?? payload.error ?? fallback);
        return payload;
      });
  }

  function toggleSource(sourceId: string, enabled: boolean) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/intelligence/sources/${sourceId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        await setMessageFromResponse(response, "Source update failed.");
        return;
      }

      setSourceRows((current) =>
        current.map((source) =>
          source.id === sourceId
            ? {
                ...source,
                effectiveEnabled: enabled,
                enabledOverride: enabled
              }
            : source
        )
      );
      setRefreshMessage(enabled ? "Source enabled." : "Source disabled.");
    });
  }

  function refreshIntelligence() {
    startTransition(async () => {
      setRefreshMessage("Refreshing intelligence sources.");
      const response = await fetch("/api/admin/intelligence/refresh", {
        method: "POST"
      });
      await setMessageFromResponse(
        response,
        response.ok ? "Intelligence refresh completed." : "Intelligence refresh failed."
      );
      router.refresh();
    });
  }

  function addManualSignal() {
    const url = manualUrl.trim();
    if (!url) {
      setRefreshMessage("Enter an original source URL first.");
      return;
    }

    startTransition(async () => {
      setRefreshMessage("Adding manual intelligence signal.");
      const response = await fetch("/api/admin/intelligence/items", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ url })
      });
      const payload = await setMessageFromResponse(
        response,
        response.ok ? "Manual signal added." : "Manual signal could not be added."
      );
      if (response.ok) {
        setManualUrl("");
        setRefreshMessage(payload.status === "duplicate" ? "That source is already on the signal board." : "Manual signal added.");
        router.refresh();
      }
    });
  }

  function updateItem(postId: string, body: Record<string, unknown>, successMessage: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/intelligence/items/${postId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });
      await setMessageFromResponse(response, response.ok ? successMessage : "Intelligence item update failed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gold/22 bg-gold/10 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Manual refresh</p>
              <p className="mt-1 text-sm text-muted">
                Fetches enabled sources, deduplicates articles, enriches signals, and keeps member comments untouched.
              </p>
            </div>
            <Button type="button" onClick={refreshIntelligence} disabled={isPending} className="gap-2">
              <RefreshCw size={15} className={cn(isPending ? "animate-spin" : "")} />
              Refresh intelligence
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
          <p className="text-sm font-medium text-foreground">Add source article</p>
          <div className="mt-3 flex gap-2">
            <Input
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              placeholder="https://original-source.example/story"
              type="url"
            />
            <Button type="button" onClick={addManualSignal} disabled={isPending} className="gap-2">
              <Plus size={15} />
              Add
            </Button>
          </div>
        </div>
      </div>

      {refreshMessage ? (
        <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm text-silver">
          {refreshMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles size={15} className="text-gold" />
              Curated signals
            </p>
            <p className="mt-1 text-sm text-muted">Feature, re-enrich, archive, or override routing without touching comments.</p>
          </div>
          <Badge variant="outline" className="normal-case tracking-normal text-muted">
            {items.length} recent items
          </Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-silver/12 bg-card/40 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="normal-case tracking-normal text-gold">
                      {item.label ?? "Commercial signal"}
                    </Badge>
                    <Badge variant="outline" className="normal-case tracking-normal text-muted">
                      {item.status}
                    </Badge>
                    {item.featured ? (
                      <Badge variant="outline" className="border-gold/24 bg-gold/10 normal-case tracking-normal text-gold">
                        Featured
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {[item.sourceName, item.primaryCategory, `${item.commentCount} comments`].filter(Boolean).join(" | ")}
                  </p>
                </div>
                {item.sourceUrl ? (
                  <a
                    className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "gap-2")}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={15} />
                    Source
                  </a>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-[0.8fr_0.8fr_1fr_auto]">
                <Select
                  defaultValue={item.primaryCategory ?? ""}
                  onChange={(event) =>
                    updateItem(item.id, { primaryCategory: event.target.value }, "Category updated.")
                  }
                  disabled={isPending}
                >
                  <option value="" disabled>
                    Category
                  </option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
                <Select
                  defaultValue={item.status}
                  onChange={(event) => updateItem(item.id, { status: event.target.value }, "Status updated.")}
                  disabled={isPending}
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
                <Input
                  defaultValue={item.recommendedRoom ?? ""}
                  placeholder="Recommended room"
                  onBlur={(event) =>
                    updateItem(item.id, { recommendedRoom: event.target.value }, "Recommended room updated.")
                  }
                  disabled={isPending}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => updateItem(item.id, { featured: !item.featured }, item.featured ? "Item unfeatured." : "Item featured.")}
                    className="gap-2"
                  >
                    <Star size={15} />
                    {item.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => updateItem(item.id, { action: "reenrich" }, "Item re-enriched.")}
                    className="gap-2"
                  >
                    <RefreshCw size={15} />
                    Enrich
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending || item.status === "ARCHIVED"}
                    onClick={() => updateItem(item.id, { status: "ARCHIVED" }, "Item archived.")}
                    className="gap-2"
                  >
                    <Archive size={15} />
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {sourceRows.map((source) => (
          <div key={source.id} className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{source.name}</p>
                  <Badge variant="outline" className="normal-case tracking-normal text-muted">
                    {source.type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "normal-case tracking-normal",
                      source.effectiveEnabled
                        ? "border-gold/24 bg-gold/10 text-gold"
                        : "border-silver/14 bg-silver/10 text-muted"
                    )}
                  >
                    {source.effectiveEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="outline" className="normal-case tracking-normal text-muted">
                    {source.healthStatus}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{source.domain}</p>
                {source.feedUrl ? <p className="mt-1 break-all text-xs text-muted">{source.feedUrl}</p> : null}
                {source.lastError ? <p className="mt-2 text-xs text-muted">{source.lastError}</p> : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                className="gap-2"
                onClick={() => toggleSource(source.id, !source.effectiveEnabled)}
              >
                {source.effectiveEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                {source.effectiveEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-4">
              <span>Fetched {source.fetchedCount}</span>
              <span>Candidates {source.candidateCount}</span>
              <span>Published {source.publishedCount}</span>
              <span>{source.lastFetchAt ? `Last fetch ${formatDate(source.lastFetchAt)}` : "Not fetched yet"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
