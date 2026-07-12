"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarDays,
  ContactRound,
  Crown,
  Download,
  Link as LinkIcon,
  Loader2,
  Menu as MenuIcon,
  Save,
  ShoppingBag,
  Star,
  Trash2,
  WalletCards
} from "lucide-react";
import {
  deleteCircleCardLinkInlineAction,
  moveCircleCardLinkInlineAction,
  toggleCircleCardLinkInlineAction,
  upsertCircleCardLinkInlineAction,
  type CircleCardDashboardLinkPayload
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleCardSmartLinkFields } from "@/components/circle-card/circle-card-smart-link-fields";
import type { CircleCardLinkType } from "@/lib/circle-card/schema";
import {
  circleCardFileActionLabel,
  circleCardFileKindLabel,
  detectCircleCardFileKind,
  resolveCircleCardFileAction
} from "@/lib/circle-card/file-actions";
import {
  compareCircleCardLinksForPlan,
  isCircleCardLinkEligibleForPublicLaunch,
  selectCircleCardLinksWithinPlan
} from "@/lib/circle-card/plan-policy";
import { cn } from "@/lib/utils";

type PendingAction = "save" | "delete" | "toggle" | "up" | "down";

type CircleCardSmartLinkManagerProps = {
  cardId: string;
  cardSlug: string;
  initialLinks: CircleCardDashboardLinkPayload[];
  focusedLinkId?: string;
  activeLinkLimit: number;
  readOnly?: boolean;
};

type CircleCardSmartLinkCreateFormProps = {
  cardId: string;
  sortOrder: number;
  defaultActive: boolean;
  examples: readonly string[];
  activeLimitLabel: string;
};

const CIRCLE_CARD_LINK_CREATED_EVENT = "circle-card-link-created";

const CUSTOM_LINK_TYPE_LABELS: Record<CircleCardLinkType, string> = {
  GENERAL: "General link",
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

function sortLinks(links: CircleCardDashboardLinkPayload[]) {
  return [...links].sort(compareCircleCardLinksForPlan);
}

function resolveCustomLinkType(value: string | null | undefined): CircleCardLinkType {
  return value && value in CUSTOM_LINK_TYPE_LABELS ? (value as CircleCardLinkType) : "GENERAL";
}

function customLinkTypeLabel(type: string | null | undefined) {
  return CUSTOM_LINK_TYPE_LABELS[resolveCustomLinkType(type)];
}

function displayCustomLinkUrl(value: string | null | undefined) {
  if (!value) {
    return "Uploaded file";
  }

  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function CustomLinkIcon({ icon, type }: { icon: string | null | undefined; type?: string | null }) {
  switch (resolveCustomLinkType(type)) {
    case "BOOK_CALL":
      return <CalendarDays size={16} />;
    case "PORTFOLIO":
      return <ContactRound size={16} />;
    case "LATEST_OFFER":
      return <Crown size={16} />;
    case "COMMUNITY":
      return <WalletCards size={16} />;
    case "DOWNLOAD":
      return <Download size={16} />;
    case "REVIEW":
      return <Star size={16} />;
    case "SHOP":
      return <ShoppingBag size={16} />;
    case "MENU":
      return <MenuIcon size={16} />;
    case "CASE_STUDY":
      return <BookOpen size={16} />;
    default:
      break;
  }

  switch (icon) {
    case "calendar":
      return <CalendarDays size={16} />;
    case "download":
      return <Download size={16} />;
    case "review":
      return <Star size={16} />;
    case "shop":
      return <ShoppingBag size={16} />;
    case "menu":
      return <MenuIcon size={16} />;
    case "case-studies":
      return <BookOpen size={16} />;
    case "offer":
      return <Crown size={16} />;
    case "portfolio":
      return <ContactRound size={16} />;
    case "community":
      return <WalletCards size={16} />;
    default:
      return <LinkIcon size={16} />;
  }
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optimisticLinkFromForm(
  link: CircleCardDashboardLinkPayload,
  formData: FormData
): CircleCardDashboardLinkPayload {
  const type = resolveCustomLinkType(formText(formData, "type"));
  const sortOrder = Number(formData.get("sortOrder"));

  return {
    ...link,
    type,
    actionMode: (formText(formData, "actionMode") ?? "AUTO") as CircleCardDashboardLinkPayload["actionMode"],
    visibility: (formText(formData, "visibility") ?? "PUBLIC") as CircleCardDashboardLinkPayload["visibility"],
    label: formText(formData, "label") ?? link.label,
    url: formText(formData, "url"),
    description: formText(formData, "description"),
    imageUrl: formText(formData, "imageUrl"),
    fileUrl: formText(formData, "fileUrl"),
    fileName: formText(formData, "fileName"),
    fileMimeType: formText(formData, "fileMimeType"),
    buttonText: formText(formData, "buttonText"),
    expiresAt: formText(formData, "expiresAt"),
    accessCodeHint: formText(formData, "accessCodeHint"),
    hasAccessCode: link.hasAccessCode || Boolean(formText(formData, "accessCodePlain")),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : link.sortOrder,
    isActive: formData.get("isActive") === "on"
  };
}

function reorderLinks(
  links: CircleCardDashboardLinkPayload[],
  linkId: string,
  direction: "up" | "down"
) {
  const next = sortLinks(links);
  const currentIndex = next.findIndex((link) => link.id === linkId);

  if (currentIndex < 0) {
    return next;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= next.length) {
    return next;
  }

  const [movedLink] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, movedLink);

  return next.map((link, index) => ({
    ...link,
    sortOrder: index
  }));
}

function pendingKey(linkId: string, action: PendingAction) {
  return `${linkId}:${action}`;
}

function featuredLinkImageDraftKey(cardId: string, linkId: string) {
  return `circle-card:featured-link-image-draft:${cardId}:${linkId}`;
}

function clearFeaturedLinkImageDraft(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // A successful server save is authoritative even if storage is unavailable.
  }
}

export function CircleCardSmartLinkCreateForm({
  cardId,
  sortOrder,
  defaultActive,
  examples,
  activeLimitLabel
}: CircleCardSmartLinkCreateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [nextSortOrder, setNextSortOrder] = useState(sortOrder);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const imageDraftKey = featuredLinkImageDraftKey(cardId, "new");

  useEffect(() => {
    setNextSortOrder(sortOrder);
  }, [sortOrder]);

  async function saveNewLink(formData: FormData) {
    setSaving(true);
    setNotice("Saving...");
    setError("");

    const result = await upsertCircleCardLinkInlineAction(formData);

    if (result.ok && result.link) {
      const createdLink = result.link;
      setNotice("Saved");
      clearFeaturedLinkImageDraft(imageDraftKey);
      formRef.current?.reset();
      setFormKey((current) => current + 1);
      setNextSortOrder((current) => Math.max(current + 1, createdLink.sortOrder + 1));
      window.dispatchEvent(
        new CustomEvent<{ link: CircleCardDashboardLinkPayload }>(CIRCLE_CARD_LINK_CREATED_EVENT, {
          detail: { link: createdLink }
        })
      );
    } else if (!result.ok) {
      setNotice("");
      setError(result.message);
    }

    setSaving(false);
  }

  return (
    <Card className="border-gold/18 bg-gold/8">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <LinkIcon size={17} className="text-gold" />
          Add link
        </CardTitle>
        <CardDescription>
          Add booking pages, offers, downloads, reviews, shops, menus or portfolio links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            saveNewLink(new FormData(event.currentTarget));
          }}
        >
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="sortOrder" value={nextSortOrder} />

          <CircleCardSmartLinkFields
            key={formKey}
            idPrefix={`customLinkNew-${formKey}`}
            imageDraftKey={imageDraftKey}
          />

          <label
            htmlFor={`customLinkIsActive-${formKey}`}
            className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
          >
            <input
              id={`customLinkIsActive-${formKey}`}
              name="isActive"
              type="checkbox"
              defaultChecked={defaultActive}
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            <span>
              Active on public card
              <span className="mt-1 block text-xs text-muted">
                {activeLimitLabel}
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <Badge key={example} variant="outline" className="border-silver/18 text-silver">
                {example}
              </Badge>
            ))}
          </div>

          {notice ? (
            <p className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-3 text-sm text-gold">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-destructive/24 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Add link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CircleCardSmartLinkManager({
  cardId,
  cardSlug,
  initialLinks,
  focusedLinkId = "",
  activeLinkLimit,
  readOnly = false
}: CircleCardSmartLinkManagerProps) {
  const [links, setLinks] = useState(() => sortLinks(initialLinks));
  const [openLinkId, setOpenLinkId] = useState(focusedLinkId);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const planVisibleLinkIds = new Set(
    selectCircleCardLinksWithinPlan(links, activeLinkLimit).map((link) => link.id)
  );

  useEffect(() => {
    setLinks(sortLinks(initialLinks));
  }, [initialLinks]);

  useEffect(() => {
    if (focusedLinkId) {
      setOpenLinkId(focusedLinkId);
    }
  }, [focusedLinkId]);

  useEffect(() => {
    function handleCreatedLink(event: Event) {
      const link = (event as CustomEvent<{ link?: CircleCardDashboardLinkPayload }>).detail?.link;

      if (!link) {
        return;
      }

      setLinks((current) => sortLinks([...current.filter((item) => item.id !== link.id), link]));
      setOpenLinkId(link.id);
      showNotice("Saved");
    }

    window.addEventListener(CIRCLE_CARD_LINK_CREATED_EVENT, handleCreatedLink);
    return () => window.removeEventListener(CIRCLE_CARD_LINK_CREATED_EVENT, handleCreatedLink);
  }, []);

  function setPending(linkId: string, action: PendingAction, pending: boolean) {
    setPendingActions((current) => {
      const next = new Set(current);
      const key = pendingKey(linkId, action);

      if (pending) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }

  function isPending(linkId: string, action: PendingAction) {
    return pendingActions.has(pendingKey(linkId, action));
  }

  function showNotice(message: string) {
    setNotice(message);
    setError("");
  }

  function showError(message: string) {
    setError(message);
    setNotice("");
  }

  async function toggleLink(link: CircleCardDashboardLinkPayload) {
    const previousLinks = links;
    setPending(link.id, "toggle", true);
    setLinks((current) =>
      current.map((item) => (item.id === link.id ? { ...item, isActive: !item.isActive } : item))
    );
    showNotice(link.isActive ? "Pausing..." : "Activating...");

    const result = await toggleCircleCardLinkInlineAction({ cardId, linkId: link.id });

    if (result.ok && result.link) {
      setLinks((current) =>
        sortLinks(current.map((item) => (item.id === result.link!.id ? result.link! : item)))
      );
      showNotice(result.link.isActive ? "Activated" : "Paused");
    } else if (!result.ok) {
      setLinks(previousLinks);
      showError(result.message);
    }

    setPending(link.id, "toggle", false);
  }

  async function deleteLink(link: CircleCardDashboardLinkPayload) {
    const previousLinks = links;
    setPending(link.id, "delete", true);
    setLinks((current) => current.filter((item) => item.id !== link.id));
    showNotice("Deleting...");

    const result = await deleteCircleCardLinkInlineAction({ cardId, linkId: link.id });

    if (result.ok) {
      showNotice("Deleted");
    } else {
      setLinks(previousLinks);
      showError(result.message);
    }

    setPending(link.id, "delete", false);
  }

  async function moveLink(link: CircleCardDashboardLinkPayload, direction: "up" | "down") {
    const previousLinks = links;
    setPending(link.id, direction, true);
    setLinks((current) => reorderLinks(current, link.id, direction));
    showNotice(direction === "up" ? "Moving up..." : "Moving down...");

    const result = await moveCircleCardLinkInlineAction({ cardId, linkId: link.id, direction });

    if (result.ok) {
      if (result.links) {
        setLinks(sortLinks(result.links));
      }
      showNotice(result.notice);
    } else {
      setLinks(previousLinks);
      showError(result.message);
    }

    setPending(link.id, direction, false);
  }

  async function saveLink(link: CircleCardDashboardLinkPayload, formData: FormData) {
    const previousLinks = links;
    const optimisticLink = optimisticLinkFromForm(link, formData);
    setPending(link.id, "save", true);
    setLinks((current) =>
      sortLinks(current.map((item) => (item.id === link.id ? optimisticLink : item)))
    );
    showNotice("Saving...");

    const result = await upsertCircleCardLinkInlineAction(formData);

    if (result.ok && result.link) {
      clearFeaturedLinkImageDraft(featuredLinkImageDraftKey(cardId, link.id));
      setLinks((current) =>
        sortLinks(current.map((item) => (item.id === result.link!.id ? result.link! : item)))
      );
      showNotice("Saved");
    } else if (!result.ok) {
      setLinks(previousLinks);
      showError(result.message);
    }

    setPending(link.id, "save", false);
  }

  if (!links.length) {
    return (
      <Card className="border-dashed border-silver/18 bg-card/48">
        <CardContent className="py-8 text-center">
          <LinkIcon className="mx-auto text-silver" size={22} />
          <h3 className="mt-4 font-display text-2xl text-foreground">No custom links yet</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            Add a booking page, portfolio, offer, review page or download to turn this Circle Card
            into a link hub.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {readOnly ? (
        <p className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-3 text-sm text-muted">
          Links on this saved extra card are preserved read-only until Circle Card Pro is restored.
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-3 text-sm text-gold">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-destructive/24 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {links.map((customLink, index) => {
        const isFirst = index === 0;
        const isLast = index === links.length - 1;
        const saving = isPending(customLink.id, "save");
        const toggling = isPending(customLink.id, "toggle");
        const deleting = isPending(customLink.id, "delete");
        const hiddenByPlan =
          isCircleCardLinkEligibleForPublicLaunch(customLink) &&
          !planVisibleLinkIds.has(customLink.id);

        return (
          <Card
            id={`custom-link-${customLink.id}`}
            key={customLink.id}
            className={cn(
              "scroll-mt-24 border-silver/16 bg-card/62 transition-opacity",
              customLink.isActive ? "border-gold/20" : "opacity-78",
              deleting ? "opacity-45" : ""
            )}
          >
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  {customLink.imageUrl ? (
                    <span className="inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gold/18 bg-background/30">
                      <img src={customLink.imageUrl} alt="" className="h-full w-full object-cover" />
                    </span>
                  ) : (
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
                      <CustomLinkIcon icon={customLink.icon} type={customLink.type} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{customLink.label}</h3>
                      <Badge
                        variant={customLink.isActive ? "outline" : "muted"}
                        className={customLink.isActive ? "border-gold/25 text-gold" : ""}
                      >
                        {customLink.isActive ? "Active" : "Paused"}
                      </Badge>
                      {customLink.visibility === "PRIVATE_CODE" ? (
                        <Badge variant="outline" className="border-gold/25 text-gold">
                          Private code
                        </Badge>
                      ) : null}
                      {hiddenByPlan ? (
                        <Badge variant="outline" className="border-gold/28 text-gold">
                          Hidden by Free plan
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-silver">
                      {displayCustomLinkUrl(customLink.fileUrl || customLink.url)}
                    </p>
                    {customLink.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {customLink.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted">
                      {customLinkTypeLabel(customLink.type)}
                      {customLink.fileName ? ` - ${customLink.fileName}` : ""}
                      {customLink.fileUrl || customLink.fileMimeType ? (
                        <>
                          {" - "}
                          {circleCardFileKindLabel(detectCircleCardFileKind(customLink))}
                          {" - "}
                          {circleCardFileActionLabel(resolveCircleCardFileAction(customLink))}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-2 sm:w-10 sm:px-0"
                    disabled={readOnly || isFirst || isPending(customLink.id, "up")}
                    title="Move link up"
                    onClick={() => moveLink(customLink, "up")}
                  >
                    {isPending(customLink.id, "up") ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ArrowUp size={14} />
                    )}
                    <span className="sm:sr-only">Move up</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-2 sm:w-10 sm:px-0"
                    disabled={readOnly || isLast || isPending(customLink.id, "down")}
                    title="Move link down"
                    onClick={() => moveLink(customLink, "down")}
                  >
                    {isPending(customLink.id, "down") ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                    <span className="sm:sr-only">Move down</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-2 sm:w-auto"
                    disabled={readOnly || toggling}
                    onClick={() => toggleLink(customLink)}
                  >
                    {toggling ? <Loader2 size={14} className="animate-spin" /> : null}
                    {toggling ? (customLink.isActive ? "Pausing..." : "Activating...") : customLink.isActive ? "Pause" : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-2 sm:w-auto"
                    disabled={readOnly || deleting}
                    onClick={() => deleteLink(customLink)}
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>

              <details
                open={openLinkId === customLink.id}
                onToggle={(event) => setOpenLinkId(event.currentTarget.open ? customLink.id : "")}
                className="rounded-2xl border border-silver/14 bg-background/18 p-3"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-silver">
                  Edit link
                </summary>
                <form
                  className="mt-4 space-y-4"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveLink(customLink, new FormData(event.currentTarget));
                  }}
                >
                  <fieldset disabled={readOnly} className="contents">
                  <input type="hidden" name="cardId" value={cardId} />
                  <input type="hidden" name="linkId" value={customLink.id} />
                  <input type="hidden" name="sortOrder" value={customLink.sortOrder} />

                  <CircleCardSmartLinkFields
                    idPrefix={`customLink-${customLink.id}`}
                    defaultType={customLink.type}
                    defaultLabel={customLink.label}
                    defaultUrl={customLink.url}
                    defaultDescription={customLink.description}
                    defaultFileUrl={customLink.fileUrl}
                    defaultFileName={customLink.fileName}
                    defaultFileMimeType={customLink.fileMimeType}
                    defaultImageUrl={customLink.imageUrl}
                    defaultButtonText={customLink.buttonText}
                    defaultExpiresAt={customLink.expiresAt}
                    defaultActionMode={customLink.actionMode}
                    defaultVisibility={customLink.visibility}
                    defaultAccessCodeHint={customLink.accessCodeHint}
                    hasAccessCode={customLink.hasAccessCode}
                    imageDraftKey={featuredLinkImageDraftKey(cardId, customLink.id)}
                  />

                  <label
                    htmlFor={`customLinkIsActive-${customLink.id}`}
                    className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-foreground"
                  >
                    <input
                      id={`customLinkIsActive-${customLink.id}`}
                      name="isActive"
                      type="checkbox"
                      defaultChecked={customLink.isActive}
                      className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                    />
                    <span>
                      Active on public card
                      <span className="mt-1 block text-xs text-muted">
                        Paused links stay saved but hidden from /card/{cardSlug}.
                      </span>
                    </span>
                  </label>

                  <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={saving}>
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={16} />}
                    {saving ? "Saving..." : "Save link"}
                  </Button>
                  </fieldset>
                </form>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
