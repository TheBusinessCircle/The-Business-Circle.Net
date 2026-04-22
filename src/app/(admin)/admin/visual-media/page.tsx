import type { Metadata } from "next";
import { ImageIcon, Save, Smartphone, Upload, X } from "lucide-react";
import {
  removeVisualMediaPlacementAssetAction,
  updateVisualMediaPlacementDetailsAction,
  uploadVisualMediaDesktopImageAction,
  uploadVisualMediaMobileImageAction
} from "@/actions/admin/visual-media.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import {
  VISUAL_MEDIA_PAGE_LABELS,
  VISUAL_MEDIA_PAGE_ORDER
} from "@/lib/visual-media/constants";
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
    "file-too-large": "That image is too large. Keep uploads under 8MB."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function updatedAtLabel(value: Date | null) {
  return value ? formatDate(value) : "Not updated yet";
}

function PreviewPane({
  title,
  imageUrl,
  altText
}: {
  title: string;
  imageUrl: string | null;
  altText: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{title}</p>
      <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-background/28">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={altText}
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-44 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_45%)] px-4 text-center text-sm text-muted">
            No image uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminVisualMediaPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const placements = await syncVisualMediaPlacementRegistry();
  const placementRecords = placements.filter(
    (placement): placement is NonNullable<(typeof placements)[number]> => Boolean(placement)
  );
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const returnPath = "/admin/visual-media";
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
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl">{placement.label}</CardTitle>
                        <CardDescription className="text-sm">
                          <span className="font-mono text-xs text-silver">{placement.key}</span>
                        </CardDescription>
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
                    <p className="text-sm leading-relaxed text-muted">
                      {placement.adminHelperText || "Upload and manage the image for this live placement."}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <PreviewPane
                        title="Desktop preview"
                        imageUrl={placement.imageUrl}
                        altText={placement.altText?.trim() || placement.label}
                      />
                      <PreviewPane
                        title="Mobile preview"
                        imageUrl={placement.mobileImageUrl}
                        altText={placement.altText?.trim() || placement.label}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <form action={uploadVisualMediaDesktopImageAction} className="space-y-3 rounded-[1.5rem] border border-white/8 bg-background/16 p-4">
                        <input type="hidden" name="key" value={placement.key} />
                        <input type="hidden" name="returnPath" value={returnPath} />
                        <input type="hidden" name="mode" value="desktop" />
                        <div className="space-y-2">
                          <Label htmlFor={`${placement.key}-desktop-file`}>Desktop image</Label>
                          <Input id={`${placement.key}-desktop-file`} name="file" type="file" accept="image/*" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" size="sm">
                            <Upload size={14} className="mr-1" />
                            {placement.imageUrl ? "Replace desktop" : "Upload desktop"}
                          </Button>
                          {placement.imageUrl ? (
                            <Button formAction={removeVisualMediaPlacementAssetAction} type="submit" size="sm" variant="outline">
                              <X size={14} className="mr-1" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </form>

                      {placement.supportsMobile ? (
                        <form action={uploadVisualMediaMobileImageAction} className="space-y-3 rounded-[1.5rem] border border-white/8 bg-background/16 p-4">
                          <input type="hidden" name="key" value={placement.key} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input type="hidden" name="mode" value="mobile" />
                          <div className="space-y-2">
                            <Label htmlFor={`${placement.key}-mobile-file`}>Mobile image</Label>
                            <Input id={`${placement.key}-mobile-file`} name="file" type="file" accept="image/*" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="submit" size="sm" variant="outline">
                              <Smartphone size={14} className="mr-1" />
                              {placement.mobileImageUrl ? "Replace mobile" : "Upload mobile"}
                            </Button>
                            {placement.mobileImageUrl ? (
                              <Button formAction={removeVisualMediaPlacementAssetAction} type="submit" size="sm" variant="outline">
                                <X size={14} className="mr-1" />
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </form>
                      ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-background/12 p-4 text-sm text-muted">
                          This placement is using a single responsive image only.
                        </div>
                      )}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
