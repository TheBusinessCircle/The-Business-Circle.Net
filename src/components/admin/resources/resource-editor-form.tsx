"use client";

import { useMemo, useState } from "react";
import type { ResourceStatus, ResourceTier, ResourceType } from "@prisma/client";
import {
  RESOURCE_CATEGORIES_BY_TIER,
  RESOURCE_SCHEDULE_TIMEZONE,
  RESOURCE_TIER_SCHEDULES,
  RESOURCE_TIER_ORDER,
  RESOURCE_TYPE_OPTIONS,
  getResourceTierLabel,
  getResourceTypeLabel
} from "@/config/resources";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateResourceDraftFromTitle } from "@/lib/resources";
import { slugify } from "@/lib/utils";

export type ResourceEditorInitialValues = {
  resourceId?: string;
  title: string;
  slug: string;
  excerpt: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  content: string;
  status: ResourceStatus;
  scheduledFor: string;
};

type ResourceEditorFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  returnPath: string;
  initialValues: ResourceEditorInitialValues;
};

export function ResourceEditorForm({
  mode,
  action,
  returnPath,
  initialValues
}: ResourceEditorFormProps) {
  const isEdit = mode === "edit";
  const [tier, setTier] = useState<ResourceTier>(initialValues.tier);
  const [title, setTitle] = useState<string>(initialValues.title);
  const [slug, setSlug] = useState<string>(initialValues.slug);
  const [category, setCategory] = useState<string>(initialValues.category);
  const [type, setType] = useState<ResourceType>(initialValues.type);
  const [excerpt, setExcerpt] = useState<string>(initialValues.excerpt);
  const [content, setContent] = useState<string>(initialValues.content);

  const categories = useMemo(() => RESOURCE_CATEGORIES_BY_TIER[tier], [tier]);
  const selectedCategory = categories.includes(category) ? category : categories[0];

  function handleGenerateDraft() {
    if (!title.trim()) {
      return;
    }

    const generated = generateResourceDraftFromTitle({
      title,
      slug: slugify(slug || title),
      tier,
      category: selectedCategory,
      type
    });

    if (!slug.trim()) {
      setSlug(generated.slug);
    }

    setExcerpt(generated.excerpt);
    setContent(generated.content);
  }

  return (
    <form action={action} className="space-y-6">
      {isEdit && initialValues.resourceId ? (
        <input type="hidden" name="resourceId" value={initialValues.resourceId} />
      ) : null}
      <input type="hidden" name="returnPath" value={returnPath} />

      <Card>
        <CardHeader>
          <CardTitle>Resource Metadata</CardTitle>
          <CardDescription>
            Build searchable, tier-aware resources with a clear publishing state and schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="auto-generated-from-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select id="type" name="type" value={type} onChange={(event) => setType(event.target.value as ResourceType)}>
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier">Tier</Label>
            <Select
              id="tier"
              name="tier"
              value={tier}
              onChange={(event) => {
                const nextTier = event.target.value as ResourceTier;
                const nextCategories = RESOURCE_CATEGORIES_BY_TIER[nextTier];
                setTier(nextTier);
                setCategory((current) =>
                  nextCategories.includes(current) ? current : nextCategories[0]
                );
              }}
            >
              {RESOURCE_TIER_ORDER.map((option) => (
                <option key={option} value={option}>
                  {getResourceTierLabel(option)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              name="category"
              value={selectedCategory}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="scheduledFor">Schedule</Label>
            <Input
              id="scheduledFor"
              name="scheduledFor"
              type="datetime-local"
              defaultValue={initialValues.scheduledFor}
            />
            <p className="text-xs text-muted">
              Uses {RESOURCE_SCHEDULE_TIMEZONE}. If left blank while scheduling, the next open tier
              slot is assigned automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Article Content</CardTitle>
              <CardDescription>
                Use the structure: opening line, Reality, Breakdown, Shift, and Next step. Keep
                it clear, direct, and practical.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={handleGenerateDraft}>
              Generate Voice Draft
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={28}
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tier Schedule</CardTitle>
          <CardDescription>
            Monday, Wednesday, and Friday cadence with separated times by tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {RESOURCE_TIER_ORDER.map((resourceTier) => (
            <div
              key={resourceTier}
              className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
            >
              <p className="text-sm font-medium text-foreground">{getResourceTierLabel(resourceTier)}</p>
              <div className="mt-2 space-y-1 text-xs text-muted">
                {RESOURCE_TIER_SCHEDULES[resourceTier].map((slot) => (
                  <p key={`${resourceTier}-${slot.weekday}`}>
                    {slot.dayLabel}: {slot.time}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="intent" value="save_draft" variant="outline">
          Save Draft
        </Button>
        <Button type="submit" name="intent" value="schedule" variant="outline">
          Schedule
        </Button>
        <Button type="submit" name="intent" value="publish">
          Publish Now
        </Button>
      </div>

      <p className="text-xs text-muted">
        Status: {initialValues.status.replaceAll("_", " ").toLowerCase()} | Type:{" "}
        {getResourceTypeLabel(type)}
      </p>
    </form>
  );
}
