"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setCircleCardVisibilityAction } from "@/actions/circle-card.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VisibilitySafetyProps = {
  isDefaultCard: boolean;
  isOnlyLiveCard: boolean;
};

function confirmHide({ isDefaultCard, isOnlyLiveCard }: VisibilitySafetyProps) {
  if (isOnlyLiveCard) {
    return window.confirm(
      "This is your only live Circle Card. Hiding it means visitors won\u2019t be able to view your public card."
    );
  }

  if (isDefaultCard) {
    return window.confirm(
      "This is your default public card. Hiding it will make your next live Circle Card the default."
    );
  }

  return true;
}

type CircleCardVisibilityToggleProps = VisibilitySafetyProps & {
  cardId: string;
  isPublished: boolean;
  returnPath: string;
  className?: string;
};

export function CircleCardVisibilityToggle({
  cardId,
  isPublished,
  isDefaultCard,
  isOnlyLiveCard,
  returnPath,
  className
}: CircleCardVisibilityToggleProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isPublished && !confirmHide({ isDefaultCard, isOnlyLiveCard })) {
      event.preventDefault();
    }
  }

  const Icon = isPublished ? EyeOff : Eye;

  return (
    <form action={setCircleCardVisibilityAction} onSubmit={handleSubmit} className={className}>
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="visibility" value={isPublished ? "hidden" : "live"} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className={cn(
          "h-10 w-full gap-2",
          isPublished
            ? "border-silver/18 text-foreground"
            : "border-emerald-400/24 bg-emerald-400/8 text-emerald-100 hover:bg-emerald-400/14"
        )}
      >
        <Icon size={15} />
        {isPublished ? "Hide Card" : "Set Live"}
      </Button>
    </form>
  );
}

type CircleCardVisibilityCheckboxProps = VisibilitySafetyProps & {
  id: string;
  defaultChecked: boolean;
};

export function CircleCardVisibilityCheckbox({
  id,
  defaultChecked,
  isDefaultCard,
  isOnlyLiveCard
}: CircleCardVisibilityCheckboxProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.currentTarget.checked && !confirmHide({ isDefaultCard, isOnlyLiveCard })) {
      event.currentTarget.checked = true;
    }
  }

  return (
    <input
      id={id}
      name="isPublished"
      type="checkbox"
      value="on"
      defaultChecked={defaultChecked}
      onChange={handleChange}
      className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
    />
  );
}
