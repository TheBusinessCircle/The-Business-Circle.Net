"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactRound, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CircleCardDashboardSection } from "@/components/circle-card/circle-card-dashboard-section";
import {
  clearCircleCardCurrentCardPreference,
  persistCircleCardCurrentCardPreference,
  readCircleCardCurrentCardPreference
} from "@/lib/circle-card/current-card-preference";

export type CircleCardCurrentCardSelectorOption = {
  id: string;
  label: string;
  detail: string;
  typeLabel: string;
  statusLabel: string;
  isDefault: boolean;
  isLive: boolean;
};

type CircleCardCurrentCardSelectorProps = {
  cards: CircleCardCurrentCardSelectorOption[];
  selectedCardId: string;
  hasExplicitSelection?: boolean;
  currentSection: string;
  isPlatformOwner?: boolean;
  previewCardTypeLabel?: string;
};

function cardSwitchUrl(cardId: string, section: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("cardId", cardId);
  url.searchParams.set("section", section);
  url.searchParams.delete("newCard");
  url.hash = window.location.hash || "#current-card";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function CircleCardCurrentCardSelector({
  cards,
  selectedCardId,
  hasExplicitSelection = false,
  currentSection,
  isPlatformOwner = false,
  previewCardTypeLabel
}: CircleCardCurrentCardSelectorProps) {
  const router = useRouter();
  const [pendingCardId, setPendingCardId] = useState(selectedCardId || cards[0]?.id || "");
  const selectedCard = useMemo(
    () => cards.find((candidate) => candidate.id === pendingCardId) ?? cards[0] ?? null,
    [cards, pendingCardId]
  );

  useEffect(() => {
    if (selectedCardId && hasExplicitSelection) {
      const explicitCard = cards.find((candidate) => candidate.id === selectedCardId);
      if (explicitCard?.isLive) {
        persistCircleCardCurrentCardPreference(selectedCardId);
      }
      setPendingCardId(selectedCardId);
      return;
    }

    const storedCardId = readCircleCardCurrentCardPreference();
    const storedCard = cards.find((candidate) => candidate.id === storedCardId);
    if (!storedCardId || !storedCard?.isLive) {
      if (storedCardId) clearCircleCardCurrentCardPreference();
      return;
    }

    if (storedCardId !== selectedCardId) {
      persistCircleCardCurrentCardPreference(storedCardId);
      router.replace(cardSwitchUrl(storedCardId, currentSection), { scroll: false });
      return;
    }

    setPendingCardId(selectedCardId);
  }, [cards, currentSection, hasExplicitSelection, router, selectedCardId]);

  function switchCard(cardId: string) {
    setPendingCardId(cardId);
    const selected = cards.find((candidate) => candidate.id === cardId);
    if (selected?.isLive) persistCircleCardCurrentCardPreference(cardId);
    router.replace(cardSwitchUrl(cardId, currentSection), { scroll: false });
  }

  if (!cards.length || !selectedCard) {
    return null;
  }

  return (
    <CircleCardDashboardSection
      id="current-card"
      title="Current Card"
      summary={[selectedCard.label, selectedCard.detail].filter(Boolean).join(" — ")}
      defaultOpen
      badge={
        <Badge variant="outline" className="border-emerald-400/24 text-emerald-200">
          {selectedCard.statusLabel}
        </Badge>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
              <ContactRound size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl text-foreground">{selectedCard.label}</h2>
              {selectedCard.detail ? (
                <p className="mt-1 truncate text-sm text-muted">{selectedCard.detail}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-silver/18 text-silver">
                  {selectedCard.typeLabel} Card
                </Badge>
                <Badge variant="outline" className="border-emerald-400/24 text-emerald-200">
                  {selectedCard.statusLabel}
                </Badge>
                {selectedCard.isDefault ? <Badge variant="premium">Default Public Card</Badge> : null}
              </div>
              {isPlatformOwner && previewCardTypeLabel ? (
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Real selected card. Platform Owner preview card type: {previewCardTypeLabel}.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto] lg:min-w-[420px]">
          <Select
            aria-label="Switch current Circle Card"
            value={pendingCardId}
            onChange={(event) => switchCard(event.target.value)}
          >
            {cards.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} - {option.typeLabel} Card
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => switchCard(pendingCardId)}
          >
            <RefreshCw size={15} />
            Switch
          </Button>
        </div>
      </div>
    </CircleCardDashboardSection>
  );
}
