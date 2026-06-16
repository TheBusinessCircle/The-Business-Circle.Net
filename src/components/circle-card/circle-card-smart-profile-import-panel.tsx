"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Search,
  Sparkles,
  Tag
} from "lucide-react";
import {
  applyCircleCardSmartImportAction,
  scanCircleCardSmartImportLinksAction
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCircleCardSmartImportDescription,
  buildCircleCardSmartImportLinkLabel,
  CIRCLE_CARD_SMART_IMPORT_SOCIAL_PLATFORMS,
  getCircleCardSmartImportPlatformLabel,
  suggestCircleCardSmartImportLinkType,
  type CircleCardSmartImportMetadata,
  type CircleCardSmartImportSocialPlatform
} from "@/lib/circle-card/smart-import";
import { CIRCLE_CARD_LINK_TYPES, type CircleCardLinkType } from "@/lib/circle-card/schema";
import { cn } from "@/lib/utils";

type CircleCardSmartProfileImportPanelProps = {
  cardId: string;
  returnPath: string;
  isCreatorLayout: boolean;
  existingTagline?: string | null;
  existingProfileImageUrl?: string | null;
  existingWebsiteUrl?: string | null;
  existingSocialLinks: Record<string, string | undefined>;
  customLinkLimitLabel: string;
};

const LINK_TYPE_LABELS: Record<CircleCardLinkType, string> = {
  GENERAL: "General",
  BOOK_CALL: "Book a call",
  PORTFOLIO: "Portfolio",
  LATEST_OFFER: "Latest offer",
  COMMUNITY: "Community",
  DOWNLOAD: "Download",
  REVIEW: "Review",
  SHOP: "Shop",
  MENU: "Menu",
  CASE_STUDY: "Case study"
};

function isSocialPlatform(value: string): value is CircleCardSmartImportSocialPlatform {
  return CIRCLE_CARD_SMART_IMPORT_SOCIAL_PLATFORMS.includes(
    value as CircleCardSmartImportSocialPlatform
  );
}

function hostLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function CircleCardSmartProfileImportPanel({
  cardId,
  returnPath,
  isCreatorLayout,
  existingTagline,
  existingProfileImageUrl,
  existingWebsiteUrl,
  existingSocialLinks,
  customLinkLimitLabel
}: CircleCardSmartProfileImportPanelProps) {
  const [links, setLinks] = useState("");
  const [results, setResults] = useState<CircleCardSmartImportMetadata[]>([]);
  const [scanError, setScanError] = useState("");
  const [selectedTaglineIndex, setSelectedTaglineIndex] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedWebsiteIndex, setSelectedWebsiteIndex] = useState<number | null>(null);
  const [selectedSocials, setSelectedSocials] = useState<Record<string, number>>({});
  const [selectedLinks, setSelectedLinks] = useState<Record<number, boolean>>({});
  const [selectedLinkImages, setSelectedLinkImages] = useState<Record<number, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const successfulResults = results.filter((result) => result.ok);
  const hasSelections = useMemo(
    () =>
      selectedTaglineIndex !== null ||
      selectedImageIndex !== null ||
      selectedWebsiteIndex !== null ||
      Object.keys(selectedSocials).length > 0 ||
      Object.values(selectedLinks).some(Boolean),
    [selectedImageIndex, selectedLinks, selectedSocials, selectedTaglineIndex, selectedWebsiteIndex]
  );

  function scanLinks() {
    setScanError("");

    startTransition(async () => {
      const response = await scanCircleCardSmartImportLinksAction({ links });

      if (!response.ok) {
        setResults(response.results);
        setScanError(response.error);
        return;
      }

      setResults(response.results);
      setSelectedTaglineIndex(null);
      setSelectedImageIndex(null);
      setSelectedWebsiteIndex(null);
      setSelectedSocials({});
      setSelectedLinks({});
      setSelectedLinkImages({});

      if (!response.results.some((result) => result.ok)) {
        setScanError("We couldn't read those links automatically, but you can still add them manually.");
      }
    });
  }

  function toggleSocial(platform: CircleCardSmartImportSocialPlatform, index: number) {
    setSelectedSocials((current) => {
      const next = { ...current };

      if (next[platform] === index) {
        delete next[platform];
      } else {
        next[platform] = index;
      }

      return next;
    });
  }

  function toggleSmartLink(index: number) {
    setSelectedLinks((current) => {
      const selected = !current[index];

      if (!selected) {
        setSelectedLinkImages((currentImages) => {
          const nextImages = { ...currentImages };
          delete nextImages[index];
          return nextImages;
        });
      }

      return {
        ...current,
        [index]: selected
      };
    });
  }

  function toggleSmartLinkImage(index: number) {
    setSelectedLinkImages((current) => ({
      ...current,
      [index]: !current[index]
    }));
  }

  return (
    <Card className="border-gold/18 bg-gold/8">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Sparkles size={17} className="text-gold" />
              Smart Profile Import
            </CardTitle>
            <CardDescription>
              Paste your links and Circle Card will try to build your profile faster.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-gold/25 text-gold">
            Review before saving
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="smart-import-links">Links to scan</Label>
          <Textarea
            id="smart-import-links"
            rows={4}
            value={links}
            onChange={(event) => setLinks(event.target.value)}
            placeholder="Paste TikTok, Instagram, YouTube, LinkedIn, Facebook, X, Discord, website, portfolio or blog links."
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted">
              Circle Card reads safe public metadata only. Some platforms block metadata, and that is OK.
            </p>
            <Button
              type="button"
              onClick={scanLinks}
              disabled={isPending}
              className="w-full gap-2 sm:w-auto"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Scan links
            </Button>
          </div>
        </div>

        {scanError ? (
          <p className="rounded-2xl border border-destructive/24 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {scanError}
          </p>
        ) : null}

        {results.length ? (
          <form action={applyCircleCardSmartImportAction} className="space-y-4">
            <input type="hidden" name="cardId" value={cardId} />
            <input type="hidden" name="returnPath" value={returnPath} />

            {selectedTaglineIndex !== null && results[selectedTaglineIndex]?.description ? (
              <>
                <input type="hidden" name="useTagline" value="on" />
                <input
                  type="hidden"
                  name="taglineValue"
                  value={results[selectedTaglineIndex].description ?? ""}
                />
              </>
            ) : null}

            {selectedImageIndex !== null && results[selectedImageIndex]?.image ? (
              <>
                <input type="hidden" name="useProfileImage" value="on" />
                <input
                  type="hidden"
                  name="profileImageUrl"
                  value={results[selectedImageIndex].image ?? ""}
                />
              </>
            ) : null}

            {selectedWebsiteIndex !== null ? (
              <>
                <input type="hidden" name="useWebsite" value="on" />
                <input type="hidden" name="websiteUrl" value={results[selectedWebsiteIndex]?.url ?? ""} />
              </>
            ) : null}

            {Object.entries(selectedSocials).map(([platform, index]) => (
              <span key={platform}>
                <input type="hidden" name="socialPlatform" value={platform} />
                <input type="hidden" name={`socialUrl-${platform}`} value={results[index]?.url ?? ""} />
              </span>
            ))}

            <div className="grid gap-3">
              {results.map((result, index) => {
                const platformLabel = getCircleCardSmartImportPlatformLabel(result.detectedPlatform);
                const socialPlatform = isSocialPlatform(result.detectedPlatform)
                  ? result.detectedPlatform
                  : null;
                const suggestedLinkType = suggestCircleCardSmartImportLinkType(result);
                const isSmartLinkSelected = Boolean(selectedLinks[index]);
                const linkLabel = buildCircleCardSmartImportLinkLabel(result);
                const linkDescription = buildCircleCardSmartImportDescription(result);
                const linkImageUrl = result.image ?? result.favicon ?? "";
                const isSmartLinkImageSelected = Boolean(selectedLinkImages[index]);

                return (
                  <article
                    key={`${result.inputUrl}-${index}`}
                    className={cn(
                      "rounded-2xl border p-4",
                      result.ok
                        ? "border-silver/16 bg-background/22"
                        : "border-silver/12 bg-background/12 opacity-80"
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-silver/14 bg-background/30 text-silver">
                          {result.image ? (
                            <img src={result.image} alt="" className="h-full w-full object-cover" />
                          ) : result.favicon ? (
                            <img src={result.favicon} alt="" className="h-6 w-6 object-contain" />
                          ) : result.ok ? (
                            <LinkIcon size={18} />
                          ) : (
                            <AlertCircle size={18} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-silver/18 text-silver">
                              {platformLabel}
                            </Badge>
                            {result.handleGuess ? (
                              <Badge variant="muted">{result.handleGuess}</Badge>
                            ) : null}
                            {result.ok ? (
                              <Badge variant="outline" className="border-gold/20 text-gold">
                                Metadata found
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                            {result.title || result.siteName || hostLabel(result.url)}
                          </h3>
                          {result.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                              {result.description}
                            </p>
                          ) : result.error ? (
                            <p className="mt-1 text-sm leading-relaxed text-muted">
                              We could not read this link automatically, but you can still add it manually.
                            </p>
                          ) : null}
                          <p className="mt-2 truncate text-xs text-muted">{result.url}</p>
                        </div>
                      </div>

                      {result.ok ? (
                        <div className="grid gap-2 lg:w-64">
                          {result.description ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTaglineIndex(
                                  selectedTaglineIndex === index ? null : index
                                )
                              }
                              className={cn(
                                "flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs transition-colors",
                                selectedTaglineIndex === index
                                  ? "border-gold/35 bg-gold/12 text-gold"
                                  : "border-silver/14 bg-background/18 text-muted hover:text-foreground"
                              )}
                            >
                              <Tag size={13} />
                              {existingTagline ? "Replace tagline" : "Use as tagline"}
                            </button>
                          ) : null}

                          {result.image ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageIndex(selectedImageIndex === index ? null : index)
                              }
                              className={cn(
                                "flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs transition-colors",
                                selectedImageIndex === index
                                  ? "border-gold/35 bg-gold/12 text-gold"
                                  : "border-silver/14 bg-background/18 text-muted hover:text-foreground"
                              )}
                            >
                              <ImageIcon size={13} />
                              {existingProfileImageUrl ? "Replace profile image" : "Use image"}
                            </button>
                          ) : null}

                          {result.detectedPlatform === "website" ||
                          result.detectedPlatform === "portfolio" ||
                          result.detectedPlatform === "blog" ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedWebsiteIndex(
                                  selectedWebsiteIndex === index ? null : index
                                )
                              }
                              className={cn(
                                "flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs transition-colors",
                                selectedWebsiteIndex === index
                                  ? "border-gold/35 bg-gold/12 text-gold"
                                  : "border-silver/14 bg-background/18 text-muted hover:text-foreground"
                              )}
                            >
                              <LinkIcon size={13} />
                              {existingWebsiteUrl ? "Replace website" : "Use as website"}
                            </button>
                          ) : null}

                          {socialPlatform ? (
                            <button
                              type="button"
                              onClick={() => toggleSocial(socialPlatform, index)}
                              className={cn(
                                "flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs transition-colors",
                                selectedSocials[socialPlatform] === index
                                  ? "border-gold/35 bg-gold/12 text-gold"
                                  : "border-silver/14 bg-background/18 text-muted hover:text-foreground"
                              )}
                            >
                              <CheckCircle2 size={13} />
                              {existingSocialLinks[socialPlatform]
                                ? `Replace ${platformLabel}`
                                : `Add ${platformLabel}`}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => toggleSmartLink(index)}
                            className={cn(
                              "flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs transition-colors",
                              isSmartLinkSelected
                                ? "border-gold/35 bg-gold/12 text-gold"
                                : "border-silver/14 bg-background/18 text-muted hover:text-foreground"
                            )}
                          >
                            <Sparkles size={13} />
                            Add as smart link
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isSmartLinkSelected ? (
                      <div className="mt-4 grid gap-3 border-t border-silver/12 pt-4 md:grid-cols-[180px_minmax(0,1fr)]">
                        <input type="hidden" name="smartLinkIndex" value={String(index)} />
                        <input type="hidden" name={`linkUrl-${index}`} value={result.url} />
                        {isSmartLinkImageSelected && linkImageUrl ? (
                          <input type="hidden" name={`linkImageUrl-${index}`} value={linkImageUrl} />
                        ) : null}
                        <div className="space-y-2">
                          <Label htmlFor={`smart-import-link-type-${index}`}>Link type</Label>
                          <Select
                            id={`smart-import-link-type-${index}`}
                            name={`linkType-${index}`}
                            defaultValue={suggestedLinkType}
                          >
                            {CIRCLE_CARD_LINK_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {LINK_TYPE_LABELS[type]}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`smart-import-link-label-${index}`}>Label</Label>
                            <Input
                              id={`smart-import-link-label-${index}`}
                              name={`linkLabel-${index}`}
                              defaultValue={linkLabel}
                              maxLength={90}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`smart-import-link-description-${index}`}>
                              Description
                            </Label>
                            <Input
                              id={`smart-import-link-description-${index}`}
                              name={`linkDescription-${index}`}
                              defaultValue={linkDescription}
                              maxLength={220}
                            />
                          </div>
                        </div>
                        {linkImageUrl ? (
                          <div className="space-y-2 md:col-span-2">
                            <button
                              type="button"
                              onClick={() => toggleSmartLinkImage(index)}
                              className={cn(
                                "flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left text-xs transition-colors",
                                isSmartLinkImageSelected
                                  ? "border-gold/35 bg-gold/12 text-gold"
                                  : "border-silver/14 bg-background/18 text-muted hover:text-foreground"
                              )}
                            >
                              <span className="grid h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-silver/14 bg-background/30">
                                <img
                                  src={linkImageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </span>
                              <span>
                                <span className="block font-medium">
                                  {isSmartLinkImageSelected ? "Link image selected" : "Use as link image"}
                                </span>
                                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                                  Uses {result.image ? "the page preview image" : "the site favicon"} on Creator cards.
                                </span>
                              </span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {successfulResults.length ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-silver/14 bg-background/18 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Review everything before saving.
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {isCreatorLayout
                      ? "Creator layout suggestions can help with tagline, social handles, preview images and featured links."
                      : "Switching to Creator layout later will use the same profile details and smart links."}
                  </p>
                  <p className="mt-1 text-xs text-muted">Smart links: {customLinkLimitLabel}</p>
                </div>
                <Button type="submit" disabled={!hasSelections} className="w-full gap-2 sm:w-auto">
                  <Sparkles size={15} />
                  Apply selected
                </Button>
              </div>
            ) : null}
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
