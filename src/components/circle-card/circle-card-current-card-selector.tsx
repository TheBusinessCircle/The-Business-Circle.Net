"use client";

import { useEffect, useMemo, useState } from "react";
import { ContactRound, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const CURRENT_CARD_STORAGE_KEY = "circle-card.dashboard.current-card-id";

export type CircleCardCurrentCardSelectorOption = {
  id: string;
  label: string;
  detail: string;
  typeLabel: string;
  statusLabel: string;
  isDefault: boolean;
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
  const [pendingCardId, setPendingCardId] = useState(selectedCardId || cards[0]?.id || "");
  const selectedCard = useMemo(
    () => cards.find((candidate) => candidate.id === pendingCardId) ?? cards[0] ?? null,
    [cards, pendingCardId]
  );

  useEffect(() => {
    if (selectedCardId && hasExplicitSelection) {
      window.sessionStorage.setItem(CURRENT_CARD_STORAGE_KEY, selectedCardId);
      setPendingCardId(selectedCardId);
      return;
    }

    const storedCardId = window.sessionStorage.getItem(CURRENT_CARD_STORAGE_KEY);
    if (!storedCardId || !cards.some((candidate) => candidate.id === storedCardId)) {
      return;
    }

    if (storedCardId !== selectedCardId) {
      window.location.replace(cardSwitchUrl(storedCardId, currentSection));
      return;
    }

    setPendingCardId(selectedCardId);
  }, [cards, currentSection, hasExplicitSelection, selectedCardId]);

  function switchCard(cardId: string) {
    setPendingCardId(cardId);
    window.sessionStorage.setItem(CURRENT_CARD_STORAGE_KEY, cardId);
    window.location.assign(cardSwitchUrl(cardId, currentSection));
  }

  if (!cards.length || !selectedCard) {
    return null;
  }

  return (
    <section
      id="current-card"
      className="scroll-mt-24 rounded-2xl border border-silver/14 bg-card/64 p-4 shadow-inner-surface sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Current Card</p>
          <div className="mt-2 flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
              <ContactRound size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl text-foreground">{selectedCard.label}</h2>
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
    </section>
  );
}
