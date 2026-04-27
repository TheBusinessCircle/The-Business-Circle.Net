"use client";

import { useMemo, useState } from "react";
import type {
  ResourceApprovalStatus,
  ResourceGenerationSource,
  ResourceImageStatus,
  ResourceStatus,
  ResourceTier,
  ResourceType
} from "@prisma/client";
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
import { ResourceCoverImage } from "@/components/resources/resource-cover-image";
import { generateResourceDraftFromTitle } from "@/lib/resources";
import { slugify } from "@/lib/utils";

export type ResourceEditorInitialValues = {
  resourceId?: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  generatedImageUrl: string;
  imageDirection: string;
  imagePrompt: string;
  imageStatus: ResourceImageStatus;
  approvalStatus: ResourceApprovalStatus;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  content: string;
  status: ResourceStatus;
  scheduledFor: string;
  generationBatchId?: string | null;
  generationDate?: string | null;
  generationSource?: ResourceGenerationSource | string | null;
  lockedAt?: string | null;
  generationMetadata?: string | null;
};

type ResourceEditorFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  imageAction?: (formData: FormData) => void | Promise<void>;
  imageGenerationAvailable?: boolean;
  cloudinaryConfigured?: boolean;
  returnPath: string;
  initialValues: ResourceEditorInitialValues;
};

const APPROVAL_STATUS_OPTIONS: ResourceApprovalStatus[] = [
  "MANUAL",
  "GENERATED",
  "PENDING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "REJECTED",
  "REGENERATE_REQUESTED"
];

const IMAGE_STATUS_OPTIONS: ResourceImageStatus[] = [
  "MANUAL",
  "PROMPT_READY",
  "QUEUED",
  "GENERATING",
  "GENERATED",
  "FAILED",
  "SKIPPED",
  "NEEDS_REVIEW"
];

function formatOptionLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function imageFailureReasonFromMetadata(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      imageGeneration?: {
        message?: unknown;
        reason?: unknown;
        code?: unknown;
      };
    };
    const reason =
      typeof parsed.imageGeneration?.message === "string"
        ? parsed.imageGeneration.message
        : typeof parsed.imageGeneration?.reason === "string"
          ? parsed.imageGeneration.reason
          : typeof parsed.imageGeneration?.code === "string"
            ? parsed.imageGeneration.code
            : "";

    return reason.trim() ? reason.replace(/\s+/g, " ").slice(0, 180) : null;
  } catch {
    return null;
  }
}

export function ResourceEditorForm({
  mode,
  action,
  imageAction,
  imageGenerationAvailable = false,
  cloudinaryConfigured = false,
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
  const [coverImage, setCoverImage] = useState<string>(initialValues.coverImage);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(initialValues.generatedImageUrl);
  const [imageDirection, setImageDirection] = useState<string>(initialValues.imageDirection);
  const [imagePrompt, setImagePrompt] = useState<string>(initialValues.imagePrompt);
  const [imageStatus, setImageStatus] = useState<ResourceImageStatus>(initialValues.imageStatus);
  const [approvalStatus, setApprovalStatus] = useState<ResourceApprovalStatus>(
    initialValues.approvalStatus
  );
  const [content, setContent] = useState<string>(initialValues.content);

  const categories = useMemo(() => RESOURCE_CATEGORIES_BY_TIER[tier], [tier]);
  const selectedCategory = categories.includes(category) ? category : categories[0];
  const imageFailureReason = imageFailureReasonFromMetadata(initialValues.generationMetadata);

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

      <Card className="border-silver/18 bg-card/70">
        <CardHeader>
          <CardTitle>Resource Image panel</CardTitle>
          <CardDescription>
            Use resource imagery for editorial business atmosphere. Avoid text-heavy covers, generic startup photos, and visuals that rely on the title being baked into the image.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Current preview or fallback preview
            </p>
            <ResourceCoverImage
              resource={{
                title: title || "Resource image preview",
                category: selectedCategory,
                type,
                tier,
                coverImage,
                generatedImageUrl
              }}
              className="aspect-[16/9] rounded-2xl border border-silver/14"
              imageClassName="object-cover"
            />
            <div className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-sm text-muted">
              <p>Generation source: {formatOptionLabel(initialValues.generationSource ?? "MANUAL")}</p>
              <p>Approval status: {formatOptionLabel(approvalStatus)}</p>
              <p>Image status: {formatOptionLabel(imageStatus)}</p>
              {imageStatus === "FAILED" ? (
                <p>
                  Failure reason: {imageFailureReason ?? "No stored reason found. Retry generation to capture the current provider or upload error."}
                </p>
              ) : null}
              <p>Generated image URL: {generatedImageUrl ? "present" : "not present"}</p>
              <p>Image prompt: {imagePrompt ? "present" : "missing"}</p>
              <p>Image direction: {imageDirection ? "present" : "missing"}</p>
              <p>Generation batch ID: {initialValues.generationBatchId ?? "none"}</p>
              <p>Generation metadata: {initialValues.generationMetadata ? "present" : "none"}</p>
            </div>
            {generatedImageUrl ? (
              <div className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-xs text-muted">
                <p className="font-medium text-foreground">Generated image URL</p>
                <p className="mt-2 break-all">{generatedImageUrl}</p>
              </div>
            ) : null}
            {initialValues.generationMetadata ? (
              <div className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-xs text-muted">
                <p className="font-medium text-foreground">Generation metadata</p>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words">
                  {initialValues.generationMetadata}
                </pre>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            {!imageGenerationAvailable ? (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-100">
                Provider warning:{" "}
                {cloudinaryConfigured
                  ? "Image generation provider is not configured. You can still save direction and prompt fields."
                  : "Cloudinary or image generation provider is not configured. You can still save direction and prompt fields."}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                name="coverImage"
                value={coverImage}
                onChange={(event) => setCoverImage(event.target.value)}
                placeholder="https://images.example.com/resource-cover.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generatedImageUrl">Generated Image URL</Label>
              <Input
                id="generatedImageUrl"
                name="generatedImageUrl"
                value={generatedImageUrl}
                onChange={(event) => setGeneratedImageUrl(event.target.value)}
                placeholder="Generated Cloudinary image URL"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="imageStatus">Image Status</Label>
                <Select
                  id="imageStatus"
                  name="imageStatus"
                  value={imageStatus}
                  onChange={(event) => setImageStatus(event.target.value as ResourceImageStatus)}
                >
                  {IMAGE_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatOptionLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvalStatus">Approval Status</Label>
                <Select
                  id="approvalStatus"
                  name="approvalStatus"
                  value={approvalStatus}
                  onChange={(event) =>
                    setApprovalStatus(event.target.value as ResourceApprovalStatus)
                  }
                >
                  {APPROVAL_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatOptionLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageDirection">Image Direction</Label>
              <Textarea
                id="imageDirection"
                name="imageDirection"
                value={imageDirection}
                onChange={(event) => setImageDirection(event.target.value)}
                rows={3}
                placeholder="Premium editorial direction for the cover image."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagePrompt">Image Prompt</Label>
              <Textarea
                id="imagePrompt"
                name="imagePrompt"
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                rows={5}
                placeholder="Dark premium business-owner editorial cover prompt. No text or logos in the image."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {imageAction && initialValues.resourceId ? (
                <>
                  <Button
                    type="submit"
                    formAction={imageAction}
                    formNoValidate
                    variant="outline"
                    name="imageIntent"
                    value="generate_image"
                    disabled={!imageGenerationAvailable}
                  >
                    Generate Cover Image
                  </Button>
                  <Button
                    type="submit"
                    formAction={imageAction}
                    formNoValidate
                    variant="outline"
                    name="imageIntent"
                    value="regenerate_image"
                    disabled={!imageGenerationAvailable}
                  >
                    Regenerate Cover Image
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" disabled>
                  Generate Cover Image After Saving
                </Button>
              )}
              <Button type="submit" name="intent" value="save_draft" variant="outline">
                Save Image Prompt / Direction
              </Button>
            </div>
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
          <CardTitle>Generation & Schedule</CardTitle>
          <CardDescription>
            Review generated workflow state and keep the publishing slot deliberate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {initialValues.generationBatchId || initialValues.generationDate || initialValues.lockedAt ? (
            <div className="rounded-2xl border border-gold/20 bg-gold/8 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Generation metadata</p>
              <div className="mt-2 space-y-1 text-xs text-muted">
                {initialValues.generationBatchId ? (
                  <p>Batch: {initialValues.generationBatchId}</p>
                ) : null}
                {initialValues.generationDate ? <p>Date: {initialValues.generationDate}</p> : null}
                {initialValues.lockedAt ? <p>Locked: {initialValues.lockedAt}</p> : null}
              </div>
            </div>
          ) : null}
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
        {getResourceTypeLabel(type)} | Approval: {formatOptionLabel(approvalStatus)} | Image:{" "}
        {formatOptionLabel(imageStatus)}
      </p>
    </form>
  );
}
