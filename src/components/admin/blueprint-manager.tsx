"use client";

import { useMemo, useRef, useState } from "react";
import type { BlueprintDiscussionMode, MembershipTier } from "@prisma/client";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";
import {
  resetBlueprintVotesAction,
  saveBlueprintAction
} from "@/actions/admin/blueprint.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLUEPRINT_VOTE_LABELS, BLUEPRINT_VOTE_TYPES } from "@/config/blueprint";
import { getMembershipTierLabel } from "@/config/membership";
import type {
  BlueprintManagerModel,
  BlueprintManagerPayload,
  BlueprintManagerPayloadCard,
  BlueprintManagerPayloadIntroSection,
  BlueprintManagerPayloadRoadmapSection,
  BlueprintManagerPayloadStatus
} from "@/types/blueprint";
import { cn } from "@/lib/utils";

type BlueprintManagerProps = {
  initialData: BlueprintManagerModel;
};

type DragState =
  | {
      type: "section";
      sectionClientId: string;
    }
  | {
      type: "card";
      sectionClientId: string;
      cardClientId: string;
    };

const TIER_OPTIONS = ["FOUNDATION", "INNER_CIRCLE", "CORE"] as const satisfies readonly MembershipTier[];
const DISCUSSION_MODES = ["AUTO", "LOCKED", "UNLOCKED"] as const satisfies readonly BlueprintDiscussionMode[];

function makeClientId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePositions<T extends { position: number }>(items: T[]): T[] {
  return items.map((item, position) => ({
    ...item,
    position
  }));
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item);
  return next;
}

function toInitialState(data: BlueprintManagerModel): BlueprintManagerPayload {
  return {
    statuses: data.statuses.map((status) => ({
      id: status.id,
      clientId: status.id,
      label: status.label,
      position: status.position,
      isHidden: status.isHidden
    })),
    introSections: data.introSections.map((section) => ({
      id: section.id,
      clientId: section.id,
      title: section.title,
      copy: section.copy,
      position: section.position,
      isHidden: section.isHidden
    })),
    roadmapSections: data.roadmapSections.map((section) => ({
      id: section.id,
      clientId: section.id,
      title: section.title,
      copy: section.copy,
      position: section.position,
      isHidden: section.isHidden,
      cards: section.cards.map((card) => ({
        id: card.id,
        clientId: card.id,
        title: card.title,
        shortDescription: card.shortDescription,
        detail: card.detail ?? "",
        statusId: card.status?.id ?? "",
        tierRelevance: card.tierRelevance ?? "",
        isCurrentFocus: card.isCurrentFocus,
        isMemberShaped: card.isMemberShaped,
        discussionMode: card.discussionMode,
        position: card.position,
        isHidden: card.isHidden
      }))
    }))
  };
}

function findCardVoteCounts(data: BlueprintManagerModel, cardId?: string) {
  if (!cardId) {
    return null;
  }

  for (const section of data.roadmapSections) {
    const card = section.cards.find((item) => item.id === cardId);
    if (card) {
      return card.voteCounts;
    }
  }

  return null;
}

function FieldLabel({ children }: { children: string }) {
  return <label className="text-xs uppercase tracking-[0.08em] text-silver">{children}</label>;
}

export function BlueprintManager({ initialData }: BlueprintManagerProps) {
  const [state, setState] = useState<BlueprintManagerPayload>(() => toInitialState(initialData));
  const dragRef = useRef<DragState | null>(null);
  const savePayload = useMemo(() => JSON.stringify(state), [state]);

  const updateStatus = (
    clientId: string,
    updater: (status: BlueprintManagerPayloadStatus) => BlueprintManagerPayloadStatus
  ) => {
    setState((current) => ({
      ...current,
      statuses: current.statuses.map((status) =>
        status.clientId === clientId ? updater(status) : status
      )
    }));
  };

  const updateIntroSection = (
    clientId: string,
    updater: (
      section: BlueprintManagerPayloadIntroSection
    ) => BlueprintManagerPayloadIntroSection
  ) => {
    setState((current) => ({
      ...current,
      introSections: current.introSections.map((section) =>
        section.clientId === clientId ? updater(section) : section
      )
    }));
  };

  const updateRoadmapSection = (
    clientId: string,
    updater: (
      section: BlueprintManagerPayloadRoadmapSection
    ) => BlueprintManagerPayloadRoadmapSection
  ) => {
    setState((current) => ({
      ...current,
      roadmapSections: current.roadmapSections.map((section) =>
        section.clientId === clientId ? updater(section) : section
      )
    }));
  };

  const updateCard = (
    sectionClientId: string,
    cardClientId: string,
    updater: (card: BlueprintManagerPayloadCard) => BlueprintManagerPayloadCard
  ) => {
    updateRoadmapSection(sectionClientId, (section) => ({
      ...section,
      cards: section.cards.map((card) => (card.clientId === cardClientId ? updater(card) : card))
    }));
  };

  const moveRoadmapSection = (sectionClientId: string, direction: -1 | 1) => {
    setState((current) => {
      const fromIndex = current.roadmapSections.findIndex(
        (section) => section.clientId === sectionClientId
      );
      return {
        ...current,
        roadmapSections: normalizePositions(
          moveItem(current.roadmapSections, fromIndex, fromIndex + direction)
        )
      };
    });
  };

  const moveCardByButton = (sectionClientId: string, cardClientId: string, direction: -1 | 1) => {
    updateRoadmapSection(sectionClientId, (section) => {
      const fromIndex = section.cards.findIndex((card) => card.clientId === cardClientId);
      return {
        ...section,
        cards: normalizePositions(moveItem(section.cards, fromIndex, fromIndex + direction))
      };
    });
  };

  const handleSectionDrop = (targetClientId: string) => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag || drag.type !== "section") {
      return;
    }

    setState((current) => {
      const fromIndex = current.roadmapSections.findIndex(
        (section) => section.clientId === drag.sectionClientId
      );
      const toIndex = current.roadmapSections.findIndex(
        (section) => section.clientId === targetClientId
      );
      return {
        ...current,
        roadmapSections: normalizePositions(moveItem(current.roadmapSections, fromIndex, toIndex))
      };
    });
  };

  const handleCardDrop = (
    targetSectionClientId: string,
    targetCardClientId: string | null = null
  ) => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag || drag.type !== "card") {
      return;
    }

    setState((current) => {
      let movingCard: BlueprintManagerPayloadCard | null = null;
      const withoutCard = current.roadmapSections.map((section) => {
        if (section.clientId !== drag.sectionClientId) {
          return section;
        }

        const nextCards = section.cards.filter((card) => {
          if (card.clientId === drag.cardClientId) {
            movingCard = card;
            return false;
          }

          return true;
        });

        return {
          ...section,
          cards: normalizePositions(nextCards)
        };
      });

      if (!movingCard) {
        return current;
      }

      return {
        ...current,
        roadmapSections: withoutCard.map((section) => {
          if (section.clientId !== targetSectionClientId) {
            return section;
          }

          const insertionIndex = targetCardClientId
            ? Math.max(
                0,
                section.cards.findIndex((card) => card.clientId === targetCardClientId)
              )
            : section.cards.length;
          const nextCards = [...section.cards];
          nextCards.splice(insertionIndex, 0, movingCard!);

          return {
            ...section,
            cards: normalizePositions(nextCards)
          };
        })
      };
    });
  };

  const addStatus = () => {
    setState((current) => ({
      ...current,
      statuses: normalizePositions([
        ...current.statuses,
        {
          clientId: makeClientId("status"),
          label: "New Status",
          position: current.statuses.length,
          isHidden: false
        }
      ])
    }));
  };

  const addIntroSection = () => {
    setState((current) => ({
      ...current,
      introSections: normalizePositions([
        ...current.introSections,
        {
          clientId: makeClientId("intro"),
          title: "New Timeline Step",
          copy: "",
          position: current.introSections.length,
          isHidden: false
        }
      ])
    }));
  };

  const addRoadmapSection = () => {
    setState((current) => ({
      ...current,
      roadmapSections: normalizePositions([
        ...current.roadmapSections,
        {
          clientId: makeClientId("section"),
          title: "New Blueprint Branch",
          copy: "",
          position: current.roadmapSections.length,
          isHidden: false,
          cards: []
        }
      ])
    }));
  };

  const addCard = (sectionClientId: string) => {
    const defaultStatusId = state.statuses.find((status) => !status.isHidden)?.clientId ?? "";
    updateRoadmapSection(sectionClientId, (section) => ({
      ...section,
      cards: normalizePositions([
        ...section.cards,
        {
          clientId: makeClientId("card"),
          title: "New Blueprint Card",
          shortDescription: "Short member-facing description.",
          detail: "",
          statusId: defaultStatusId,
          tierRelevance: "",
          isCurrentFocus: false,
          isMemberShaped: false,
          discussionMode: "AUTO",
          position: section.cards.length,
          isHidden: false
        }
      ])
    }));
  };

  const deleteStatus = (clientId: string) => {
    setState((current) => ({
      ...current,
      statuses: normalizePositions(current.statuses.filter((status) => status.clientId !== clientId)),
      roadmapSections: current.roadmapSections.map((section) => ({
        ...section,
        cards: section.cards.map((card) =>
          card.statusId === clientId ? { ...card, statusId: "" } : card
        )
      }))
    }));
  };

  const totalCards = state.roadmapSections.reduce((count, section) => count + section.cards.length, 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-gold/25 bg-card/72 p-6 shadow-panel backdrop-blur">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="premium-kicker">Blueprint Manager</p>
            <h1 className="mt-3 font-display text-4xl text-foreground">Interchangeable Roadmap Editor</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Edit the intro timeline, status language, roadmap branches, cards, discussion access, and order. Save once to publish the updated Blueprint.
            </p>
          </div>
          <form action={saveBlueprintAction} className="flex shrink-0">
            <input type="hidden" name="payload" value={savePayload} />
            <Button type="submit" className="gap-2">
              <Save size={15} />
              Save Blueprint
            </Button>
          </form>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge variant="premium" className="normal-case tracking-normal">
            {state.roadmapSections.length} roadmap sections
          </Badge>
          <Badge variant="muted" className="normal-case tracking-normal">
            {totalCards} cards
          </Badge>
          <Badge variant="outline" className="normal-case tracking-normal">
            {state.statuses.length} statuses
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(260px,0.32fr)_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-silver/14 bg-background/24 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-foreground">Statuses</h2>
              <Button type="button" size="sm" variant="outline" onClick={addStatus}>
                <Plus size={13} />
                Status
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {state.statuses.map((status) => (
                <div
                  key={status.clientId}
                  className="rounded-xl border border-silver/14 bg-background/20 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={status.label}
                      onChange={(event) =>
                        updateStatus(status.clientId, (item) => ({
                          ...item,
                          label: event.target.value
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={status.isHidden ? "Show status" : "Hide status"}
                      onClick={() =>
                        updateStatus(status.clientId, (item) => ({
                          ...item,
                          isHidden: !item.isHidden
                        }))
                      }
                    >
                      {status.isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="danger"
                      aria-label="Delete status"
                      onClick={() => deleteStatus(status.clientId)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-silver/14 bg-background/24 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-foreground">Intro Timeline</h2>
              <Button type="button" size="sm" variant="outline" onClick={addIntroSection}>
                <Plus size={13} />
                Step
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {state.introSections.map((section, index) => (
                <div
                  key={section.clientId}
                  className="rounded-xl border border-silver/14 bg-background/20 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Move intro section up"
                        onClick={() =>
                          setState((current) => {
                            const fromIndex = current.introSections.findIndex(
                              (item) => item.clientId === section.clientId
                            );
                            return {
                              ...current,
                              introSections: normalizePositions(
                                moveItem(current.introSections, fromIndex, fromIndex - 1)
                              )
                            };
                          })
                        }
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Move intro section down"
                        onClick={() =>
                          setState((current) => {
                            const fromIndex = current.introSections.findIndex(
                              (item) => item.clientId === section.clientId
                            );
                            return {
                              ...current,
                              introSections: normalizePositions(
                                moveItem(current.introSections, fromIndex, fromIndex + 1)
                              )
                            };
                          })
                        }
                      >
                        <ArrowDown size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={section.isHidden ? "Show intro section" : "Hide intro section"}
                        onClick={() =>
                          updateIntroSection(section.clientId, (item) => ({
                            ...item,
                            isHidden: !item.isHidden
                          }))
                        }
                      >
                        {section.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="danger"
                        aria-label="Delete intro section"
                        onClick={() =>
                          setState((current) => ({
                            ...current,
                            introSections: normalizePositions(
                              current.introSections.filter(
                                (item) => item.clientId !== section.clientId
                              )
                            )
                          }))
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <FieldLabel>Title</FieldLabel>
                    <Input
                      value={section.title}
                      onChange={(event) =>
                        updateIntroSection(section.clientId, (item) => ({
                          ...item,
                          title: event.target.value
                        }))
                      }
                    />
                    <FieldLabel>Short copy</FieldLabel>
                    <Textarea
                      rows={3}
                      value={section.copy}
                      onChange={(event) =>
                        updateIntroSection(section.clientId, (item) => ({
                          ...item,
                          copy: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-silver/14 bg-background/24 p-4 shadow-panel backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl text-foreground">Roadmap Family Tree</h2>
              <p className="mt-1 text-sm text-muted">
                Drag branches or cards, or use the arrow controls for exact ordering.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addRoadmapSection}>
              <Plus size={14} />
              Roadmap Section
            </Button>
          </div>

          <div className="space-y-5">
            {state.roadmapSections.map((section) => (
              <section
                key={section.clientId}
                draggable
                onDragStart={() =>
                  (dragRef.current = {
                    type: "section",
                    sectionClientId: section.clientId
                  })
                }
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleSectionDrop(section.clientId)}
                className={cn(
                  "rounded-2xl border bg-card/55 p-4 transition-colors",
                  section.isHidden ? "border-dashed border-silver/14 opacity-70" : "border-gold/20"
                )}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(190px,0.3fr)_1fr]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-silver">
                        <GripVertical size={14} />
                        Branch
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Move section up"
                          onClick={() => moveRoadmapSection(section.clientId, -1)}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Move section down"
                          onClick={() => moveRoadmapSection(section.clientId, 1)}
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={section.isHidden ? "Show section" : "Hide section"}
                          onClick={() =>
                            updateRoadmapSection(section.clientId, (item) => ({
                              ...item,
                              isHidden: !item.isHidden
                            }))
                          }
                        >
                          {section.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="danger"
                          aria-label="Delete section"
                          onClick={() =>
                            setState((current) => ({
                              ...current,
                              roadmapSections: normalizePositions(
                                current.roadmapSections.filter(
                                  (item) => item.clientId !== section.clientId
                                )
                              )
                            }))
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Section name</FieldLabel>
                      <Input
                        value={section.title}
                        onChange={(event) =>
                          updateRoadmapSection(section.clientId, (item) => ({
                            ...item,
                            title: event.target.value
                          }))
                        }
                      />
                      <FieldLabel>Short copy</FieldLabel>
                      <Textarea
                        rows={3}
                        value={section.copy}
                        onChange={(event) =>
                          updateRoadmapSection(section.clientId, (item) => ({
                            ...item,
                            copy: event.target.value
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => addCard(section.clientId)}
                      >
                        <Plus size={13} />
                        Add Card
                      </Button>
                    </div>
                  </div>

                  <div
                    className="space-y-3 border-l border-gold/20 pl-4"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleCardDrop(section.clientId)}
                  >
                    {section.cards.length ? (
                      section.cards.map((card) => {
                        const voteCounts = findCardVoteCounts(initialData, card.id);
                        return (
                          <article
                            key={card.clientId}
                            draggable
                            onDragStart={(event) => {
                              event.stopPropagation();
                              dragRef.current = {
                                type: "card",
                                sectionClientId: section.clientId,
                                cardClientId: card.clientId
                              };
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.stopPropagation();
                              handleCardDrop(section.clientId, card.clientId);
                            }}
                            className={cn(
                              "rounded-2xl border bg-background/24 p-4",
                              card.isHidden ? "border-dashed border-silver/14 opacity-70" : "border-silver/14"
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-silver">
                                <GripVertical size={14} />
                                Card
                              </span>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Move card up"
                                  onClick={() => moveCardByButton(section.clientId, card.clientId, -1)}
                                >
                                  <ArrowUp size={14} />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Move card down"
                                  onClick={() => moveCardByButton(section.clientId, card.clientId, 1)}
                                >
                                  <ArrowDown size={14} />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={card.isHidden ? "Show card" : "Hide card"}
                                  onClick={() =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      isHidden: !item.isHidden
                                    }))
                                  }
                                >
                                  {card.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="danger"
                                  aria-label="Delete card"
                                  onClick={() =>
                                    updateRoadmapSection(section.clientId, (item) => ({
                                      ...item,
                                      cards: normalizePositions(
                                        item.cards.filter(
                                          (candidate) => candidate.clientId !== card.clientId
                                        )
                                      )
                                    }))
                                  }
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                              <div className="space-y-2 lg:col-span-2">
                                <FieldLabel>Title</FieldLabel>
                                <Input
                                  value={card.title}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      title: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2 lg:col-span-2">
                                <FieldLabel>Short description</FieldLabel>
                                <Textarea
                                  rows={3}
                                  value={card.shortDescription}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      shortDescription: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2 lg:col-span-2">
                                <FieldLabel>Optional extra detail</FieldLabel>
                                <Textarea
                                  rows={3}
                                  value={card.detail}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      detail: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <FieldLabel>Status</FieldLabel>
                                <Select
                                  value={card.statusId}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      statusId: event.target.value
                                    }))
                                  }
                                >
                                  <option value="">No status</option>
                                  {state.statuses.map((status) => (
                                    <option key={status.clientId} value={status.clientId}>
                                      {status.label}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <FieldLabel>Tier relevance</FieldLabel>
                                <Select
                                  value={card.tierRelevance}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      tierRelevance: event.target.value as MembershipTier | ""
                                    }))
                                  }
                                >
                                  <option value="">No tier relevance</option>
                                  {TIER_OPTIONS.map((tier) => (
                                    <option key={tier} value={tier}>
                                      {getMembershipTierLabel(tier)}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <FieldLabel>Discussion</FieldLabel>
                                <Select
                                  value={card.discussionMode}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      discussionMode: event.target.value as BlueprintDiscussionMode
                                    }))
                                  }
                                >
                                  {DISCUSSION_MODES.map((mode) => (
                                    <option key={mode} value={mode}>
                                      {mode === "AUTO"
                                        ? "Auto unlock"
                                        : mode === "LOCKED"
                                          ? "Manually locked"
                                          : "Manually unlocked"}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <FieldLabel>Move to section</FieldLabel>
                                <Select
                                  value={section.clientId}
                                  onChange={(event) => handleCardDrop(event.target.value)}
                                  onFocus={() =>
                                    (dragRef.current = {
                                      type: "card",
                                      sectionClientId: section.clientId,
                                      cardClientId: card.clientId
                                    })
                                  }
                                >
                                  {state.roadmapSections.map((option) => (
                                    <option key={option.clientId} value={option.clientId}>
                                      {option.title}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <label className="inline-flex items-center gap-2 rounded-xl border border-silver/14 bg-background/20 px-3 py-2 text-sm text-muted">
                                <input
                                  type="checkbox"
                                  checked={card.isCurrentFocus}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      isCurrentFocus: event.target.checked
                                    }))
                                  }
                                />
                                Current focus
                              </label>
                              <label className="inline-flex items-center gap-2 rounded-xl border border-silver/14 bg-background/20 px-3 py-2 text-sm text-muted">
                                <input
                                  type="checkbox"
                                  checked={card.isMemberShaped}
                                  onChange={(event) =>
                                    updateCard(section.clientId, card.clientId, (item) => ({
                                      ...item,
                                      isMemberShaped: event.target.checked
                                    }))
                                  }
                                />
                                Member shaped
                              </label>
                            </div>

                            {voteCounts ? (
                              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 p-3">
                                {BLUEPRINT_VOTE_TYPES.map((voteType) => (
                                  <Badge
                                    key={voteType}
                                    variant="premium"
                                    className="normal-case tracking-normal"
                                  >
                                    {BLUEPRINT_VOTE_LABELS[voteType]}: {voteCounts[voteType]}
                                  </Badge>
                                ))}
                                <form action={resetBlueprintVotesAction} className="ml-auto">
                                  <input type="hidden" name="returnPath" value="/admin/blueprint" />
                                  <input type="hidden" name="cardId" value={card.id} />
                                  <Button type="submit" size="sm" variant="outline">
                                    <RotateCcw size={13} />
                                    Reset votes
                                  </Button>
                                </form>
                              </div>
                            ) : null}
                          </article>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-silver/14 bg-background/16 p-5 text-sm text-muted">
                        No cards in this branch yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
