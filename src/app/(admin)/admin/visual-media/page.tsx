import type { Metadata } from "next";
import { ChevronDown, ImageIcon, ListChecks, Save, Sparkles } from "lucide-react";
import {
  updateVisualMediaPlacementDetailsAction,
} from "@/actions/admin/visual-media.actions";
import { VisualMediaPromptPanel } from "@/components/admin/visual-media-prompt-panel";
import { VisualMediaSlotDiagnostics } from "@/components/admin/visual-media-slot-diagnostics";
import { VisualMediaUploadPanel } from "@/components/admin/visual-media-upload-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";
import {
  getVisualMediaPlacementDefinition,
  VISUAL_MEDIA_PAGE_LABELS,
  VISUAL_MEDIA_PAGE_ORDER,
  type VisualMediaPlacementKey
} from "@/lib/visual-media/constants";
import type {
  VisualMediaAdminPreviewFamily,
  VisualMediaPlacementDefinition
} from "@/lib/visual-media/types";
import { syncVisualMediaPlacementRegistry } from "@/server/visual-media";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Visual Media",
  description:
    "Manage curated visual media placements across the homepage, join, membership, about, community, resources, BCN Intelligence, and services surfaces.",
  path: "/admin/visual-media",
  noIndex: true
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function messageFromMap(map: Record<string, string>, key: string) {
  if (!key || !Object.prototype.hasOwnProperty.call(map, key)) {
    return null;
  }

  return map[key];
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "placement-saved": "Placement settings saved.",
    "desktop-uploaded": "Desktop image uploaded.",
    "mobile-uploaded": "Mobile image uploaded.",
    "desktop-removed": "Desktop image removed.",
    "mobile-removed": "Mobile image removed."
  };

  const errorMap: Record<string, string> = {
    "invalid-placement": "That placement could not be updated.",
    "missing-file": "Choose an image before uploading.",
    "invalid-file": "Only valid image files can be uploaded here.",
    "file-too-large": "That image is too large. Keep uploads under 8MB.",
    "upload-timeout": "The image upload timed out. Try again with a smaller image or check Cloudinary.",
    "upload-failed": "The image upload could not be completed right now."
  };

  const noticeMessage = messageFromMap(noticeMap, input.notice);

  if (noticeMessage) {
    return { type: "notice" as const, message: noticeMessage };
  }

  const errorMessage = messageFromMap(errorMap, input.error);

  if (errorMessage) {
    return { type: "error" as const, message: errorMessage };
  }

  return null;
}

function updatedAtLabel(value: Date | null) {
  return value ? formatDate(value) : "Not updated yet";
}

function previewFrameClassName(family: VisualMediaAdminPreviewFamily) {
  switch (family) {
    case "hero":
      return "h-52 rounded-[1.6rem]";
    case "editorial":
      return "h-40 rounded-[1.35rem]";
    case "founders":
      return "h-44 rounded-[1.45rem]";
    default:
      return "h-44 rounded-[1.45rem]";
  }
}

function previewOverlayClassName(family: VisualMediaAdminPreviewFamily) {
  switch (family) {
    case "hero":
      return "bg-[linear-gradient(180deg,rgba(4,10,23,0.08),rgba(4,10,23,0.18)_26%,rgba(4,10,23,0.48)_60%,rgba(4,10,23,0.84)_100%)]";
    case "editorial":
      return "bg-[linear-gradient(180deg,rgba(4,10,23,0.04),rgba(4,10,23,0.1)_40%,rgba(4,10,23,0.22)_82%,rgba(4,10,23,0.36)_100%)]";
    case "founders":
      return "bg-[linear-gradient(180deg,rgba(17,12,7,0.04),rgba(17,12,7,0.12)_28%,rgba(4,10,23,0.28)_64%,rgba(4,10,23,0.46)_100%)]";
    default:
      return "bg-[linear-gradient(180deg,rgba(4,10,23,0.03),rgba(4,10,23,0.08)_38%,rgba(4,10,23,0.24)_80%,rgba(4,10,23,0.4)_100%)]";
  }
}

function placeholderClassName(family: VisualMediaAdminPreviewFamily) {
  switch (family) {
    case "hero":
      return "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.1),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(8,15,31,0.86))]";
    case "editorial":
      return "bg-[linear-gradient(180deg,rgba(14,21,40,0.92),rgba(10,17,33,0.84)),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,24px_24px]";
    case "founders":
      return "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(8,15,31,0.88))]";
    default:
      return "bg-[radial-gradient(circle_at_top,rgba(192,192,192,0.08),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(8,15,31,0.86))]";
  }
}

function imageFamilyLabel(definition: VisualMediaPlacementDefinition) {
  switch (definition.imageFamilyTag) {
    case "cinematic-atmosphere":
      return "Cinematic atmosphere";
    case "founder-conversation":
      return "Founder conversation";
    case "platform-mockup":
      return "Platform mockup";
    case "exclusivity":
      return "Exclusivity";
    case "story-mission":
      return "Story and mission";
    case "editorial-insight":
      return "Editorial insight";
    case "strategy-process":
      return "Strategy process";
    default:
      return "Premium imagery";
  }
}

function GuidanceSection({
  title,
  items
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-foreground/86">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function PlacementGuidancePanel({
  definition
}: {
  definition: VisualMediaPlacementDefinition;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-background/16 p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-gold" />
        <p className="text-sm font-medium text-foreground">Slot direction</p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-gold/20 bg-gold/10 text-gold">
            {definition.bestImageType}
          </Badge>
          <Badge variant="outline" className="border-silver/16 bg-silver/10 text-silver">
            {imageFamilyLabel(definition)}
          </Badge>
          <Badge variant="outline" className="border-silver/16 bg-silver/10 text-silver">
            Ratio guide {definition.recommendedAspectRatio}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-sm leading-6 text-foreground/88">{definition.longAdminGuidance}</p>
          <p className="text-sm leading-6 text-muted">{definition.imagePurpose}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {definition.emotionalTone.map((tone) => (
            <Badge
              key={tone}
              variant="outline"
              className="border-silver/16 bg-background/18 normal-case tracking-normal text-silver"
            >
              {tone}
            </Badge>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <GuidanceSection
            title="Recommended subject matter"
            items={definition.recommendedSubjectMatter}
          />
          <GuidanceSection
            title="Composition guidance"
            items={definition.recommendedComposition}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <GuidanceSection
            title="Lighting and mood"
            items={definition.recommendedLightingMood}
          />
          <GuidanceSection title="Avoid" items={definition.avoid} />
        </div>

        <div className="rounded-2xl border border-silver/12 bg-background/18 p-4">
          <div className="flex items-center gap-2">
            <ListChecks size={14} className="text-silver" />
            <p className="text-sm font-medium text-foreground">Quality checklist</p>
          </div>
          <div className="mt-3 grid gap-2">
            {definition.qualityChecklist.map((item) => (
              <p key={item} className="text-sm leading-6 text-foreground/84">
                {item}
              </p>
            ))}
          </div>
        </div>

        {definition.contentLayerNote ? (
          <div className="rounded-2xl border border-gold/18 bg-gold/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Content-layer guardrail</p>
            <p className="mt-2 text-sm leading-6 text-foreground/86">
              {definition.contentLayerNote}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PreviewPane({
  title,
  imageUrl,
  altText,
  family
}: {
  title: string;
  imageUrl: string | null;
  altText: string;
  family: VisualMediaAdminPreviewFamily;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{title}</p>
      <div
        className={cn(
          "relative overflow-hidden border border-white/10 bg-background/28",
          previewFrameClassName(family)
        )}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={altText}
              className="h-full w-full object-cover"
            />
            <div className={cn("pointer-events-none absolute inset-0", previewOverlayClassName(family))} />
            <div className="pointer-events-none absolute inset-x-4 bottom-4 space-y-2">
              <div className="h-2.5 w-24 rounded-full bg-white/20" />
              <div className="h-2 w-2/3 max-w-[12rem] rounded-full bg-white/12" />
            </div>
          </>
        ) : (
          <div
            className={cn(
              "flex h-full items-center justify-center px-4 text-center text-sm text-muted",
              placeholderClassName(family)
            )}
          >
            <div className="space-y-2">
              <p className="text-sm text-foreground/82">No image uploaded yet</p>
              <p className="text-xs text-muted">This slot will keep the page layout intact until one is assigned.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminVisualMediaPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const returnPath = "/admin/visual-media";
  let placementRecords: NonNullable<
    Awaited<ReturnType<typeof syncVisualMediaPlacementRegistry>>[number]
  >[] = [];

  try {
    const placements = await syncVisualMediaPlacementRegistry();
    placementRecords = placements.filter(
      (placement): placement is NonNullable<(typeof placements)[number]> => Boolean(placement)
    );
  } catch (error) {
    console.error("[visual-media] failed to load admin registry", {
      message: error instanceof Error ? error.message : "unknown-error"
    });

    return (
      <div className="space-y-6">
        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/82 to-card/72">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                  <ImageIcon size={12} className="mr-1" />
                  Curated Site Imagery
                </Badge>
                <CardTitle className="mt-3 font-display text-3xl">
                  Visual Media Manager
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-base">
                  The visual-media registry could not be loaded right now. Existing live images are unaffected, but this admin surface needs a quick server-side check before it can be edited safely.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-red-500/35 bg-red-500/10">
          <CardContent className="py-5">
            <p className="text-sm text-red-100">
              Visual media admin failed to initialise. Check the server logs for the
              <span className="mx-1 font-mono">[visual-media] failed to load admin registry</span>
              entry and confirm the latest deployment finished cleanly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const placementsByPage = new Map(
    VISUAL_MEDIA_PAGE_ORDER.map((page) => [
      page,
      placementRecords
        .filter((placement) => placement.page === page)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label))
    ])
  );

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/82 to-card/72">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <ImageIcon size={12} className="mr-1" />
                Curated Site Imagery
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">
                Visual Media Manager
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Manage the exact approved image placements across BCN without touching page code.
                Each card below maps to a live hero or supporting section already wired into the
                current experience.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-silver/25 bg-silver/10 text-silver">
              {placementRecords.length} approved placement{placementRecords.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card
          className={
            feedback.type === "error"
              ? "border-red-500/40 bg-red-500/10"
              : "border-gold/30 bg-gold/10"
          }
        >
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {VISUAL_MEDIA_PAGE_ORDER.map((page) => {
        const pagePlacements = placementsByPage.get(page) ?? [];

        if (!pagePlacements.length) {
          return null;
        }

        return (
          <section key={page} className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl text-foreground">
                {VISUAL_MEDIA_PAGE_LABELS[page]}
              </h2>
              <p className="text-sm text-muted">
                Live curated placements for the {VISUAL_MEDIA_PAGE_LABELS[page]} surface.
              </p>
            </div>

            <div className="grid gap-5 2xl:grid-cols-2">
              {pagePlacements.map((placement) => (
                <Card key={placement.key} className="border-border/80 bg-card/66 shadow-panel-soft">
                  {(() => {
                    const definition =
                      getVisualMediaPlacementDefinition(
                        placement.key as VisualMediaPlacementKey
                      ) ?? null;
                    const previewFamily = definition?.adminPreviewFamily ?? "human";
                    const helperText =
                      definition?.adminHelperText ||
                      placement.adminHelperText ||
                      "Upload and manage the image for this live placement.";

                    return (
                      <>
                        <CardHeader className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <CardTitle className="text-2xl">{placement.label}</CardTitle>
                              <CardDescription className="text-sm">
                                <span className="font-mono text-xs text-silver">{placement.key}</span>
                              </CardDescription>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-silver/20 bg-silver/10 text-silver">
                                  {placement.variant === "HERO" ? "Hero placement" : "Supporting placement"}
                                </Badge>
                                <Badge variant="outline" className="border-gold/20 bg-gold/10 text-gold">
                                  {helperText}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  placement.isActive && placement.imageUrl
                                    ? "border-gold/30 bg-gold/10 text-gold"
                                    : "border-silver/20 bg-silver/10 text-silver"
                                }
                              >
                                {placement.isActive && placement.imageUrl ? "Active" : "Inactive"}
                              </Badge>
                              {placement.supportsMobile ? (
                                <Badge variant="outline" className="border-silver/20 bg-silver/10 text-silver">
                                  Mobile variant
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-muted">{helperText}</p>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <section className="space-y-3">
                            <div className="space-y-1">
                              <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-silver">
                                Preview row
                              </h3>
                              <p className="text-sm text-muted">
                                Live desktop and mobile previews for this saved placement.
                              </p>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              <PreviewPane
                                title="Desktop preview"
                                imageUrl={placement.imageUrl}
                                altText={placement.altText?.trim() || placement.label}
                                family={previewFamily}
                              />
                              <PreviewPane
                                title="Mobile preview"
                                imageUrl={placement.mobileImageUrl}
                                altText={placement.altText?.trim() || placement.label}
                                family={previewFamily}
                              />
                            </div>
                          </section>

                          <section className="space-y-3 border-t border-white/8 pt-5">
                            <div className="space-y-1">
                              <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-silver">
                                Upload controls
                              </h3>
                              <p className="text-sm text-muted">
                                Choose a file, preview it locally, then upload only when the crop looks right.
                              </p>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              <VisualMediaUploadPanel
                                placementKey={placement.key}
                                placementLabel={placement.label}
                                mode="desktop"
                                returnPath={returnPath}
                                family={previewFamily}
                                savedImageUrl={placement.imageUrl}
                                altText={placement.altText?.trim() || placement.label}
                              />
                              {placement.supportsMobile ? (
                                <VisualMediaUploadPanel
                                  placementKey={placement.key}
                                  placementLabel={placement.label}
                                  mode="mobile"
                                  returnPath={returnPath}
                                  family={previewFamily}
                                  savedImageUrl={placement.mobileImageUrl}
                                  altText={placement.altText?.trim() || placement.label}
                                />
                              ) : (
                                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-background/12 p-5 text-sm text-muted">
                                  This placement is using a single responsive image only, so a separate mobile upload is not required here.
                                </div>
                              )}
                            </div>
                          </section>

                          <section className="space-y-3 border-t border-white/8 pt-5">
                            <div className="space-y-1">
                              <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-silver">
                                Settings
                              </h3>
                              <p className="text-sm text-muted">
                                Adjust accessibility copy, crop positioning, overlay styling, and live status.
                              </p>
                            </div>

                            <form action={updateVisualMediaPlacementDetailsAction} className="space-y-4 rounded-[1.5rem] border border-white/8 bg-background/16 p-4">
                              <input type="hidden" name="key" value={placement.key} />
                              <input type="hidden" name="returnPath" value={returnPath} />

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor={`${placement.key}-alt`}>Alt text</Label>
                                  <Input
                                    id={`${placement.key}-alt`}
                                    name="altText"
                                    defaultValue={placement.altText ?? ""}
                                    placeholder="Describe the image for accessibility"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`${placement.key}-object-position`}>Object position</Label>
                                  <Input
                                    id={`${placement.key}-object-position`}
                                    name="objectPosition"
                                    defaultValue={placement.objectPosition ?? ""}
                                    placeholder="center center"
                                  />
                                </div>
                              </div>

                              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-end">
                                <div className="space-y-2">
                                  <Label htmlFor={`${placement.key}-overlay`}>Overlay style</Label>
                                  <select
                                    id={`${placement.key}-overlay`}
                                    name="overlayStyle"
                                    defaultValue={placement.overlayStyle ?? ""}
                                    className="flex h-11 w-full rounded-xl border border-border/90 bg-background/35 px-3 py-2 text-sm text-foreground shadow-inner-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80"
                                  >
                                    <option value="">No overlay</option>
                                    <option value="SOFT_DARK">Soft Dark</option>
                                    <option value="DARK">Dark</option>
                                    <option value="CINEMATIC">Cinematic</option>
                                  </select>
                                </div>

                                <label className="inline-flex items-center gap-3 rounded-xl border border-white/8 bg-background/18 px-4 py-3 text-sm text-foreground">
                                  <input
                                    type="checkbox"
                                    name="isActive"
                                    defaultChecked={placement.isActive && Boolean(placement.imageUrl)}
                                    disabled={!placement.imageUrl}
                                    className="h-4 w-4 rounded border-border/90 bg-background/35 accent-gold"
                                  />
                                  Active on site
                                </label>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
                                <p className="text-xs text-muted">
                                  Updated {updatedAtLabel(placement.updatedAt)}.
                                </p>
                                <Button type="submit">
                                  <Save size={14} className="mr-1" />
                                  Save placement settings
                                </Button>
                              </div>
                            </form>
                          </section>

                          {definition ? (
                            <details className="group rounded-[1.5rem] border border-white/8 bg-background/12">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-foreground">
                                    Guidance tools
                                  </p>
                                  <p className="text-sm text-muted">
                                    Slot direction, soft checks, quality checklist, and prompt editing stay available here when you need them.
                                  </p>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 text-silver transition-transform group-open:rotate-180" />
                              </summary>

                              <div className="space-y-4 border-t border-white/8 px-5 py-5">
                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                                  <PlacementGuidancePanel definition={definition} />
                                  <VisualMediaSlotDiagnostics
                                    label={placement.label}
                                    variant={placement.variant}
                                    family={previewFamily}
                                    imageUrl={placement.imageUrl}
                                    mobileImageUrl={placement.mobileImageUrl}
                                    altText={placement.altText}
                                    objectPosition={placement.objectPosition}
                                    supportsMobile={placement.supportsMobile}
                                    recommendedAspectRatio={placement.recommendedAspectRatio}
                                  />
                                </div>

                                <VisualMediaPromptPanel definition={definition} />
                              </div>
                            </details>
                          ) : null}
                        </CardContent>
                      </>
                    );
                  })()}
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
