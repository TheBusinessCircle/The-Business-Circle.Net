import type { CircleCardAccountType } from "@prisma/client";
import { Rocket, UserRound, UsersRound } from "lucide-react";
import { updateCircleCardIdentityAction } from "@/actions/circle-card.actions";
import { Button } from "@/components/ui/button";
import {
  CIRCLE_CARD_ACCOUNT_TYPE_COPY,
  CIRCLE_CARD_ACCOUNT_TYPES,
  CIRCLE_CARD_IDENTITY_TAGS
} from "@/lib/circle-card/identity";
import { cn } from "@/lib/utils";

type CircleCardIdentityFieldsProps = {
  accountType?: CircleCardAccountType | null;
  identityTags?: string[];
  compact?: boolean;
  idPrefix?: string;
  required?: boolean;
};

type CircleCardIdentityBannerProps = {
  cardId: string;
  returnPath: string;
  accountType?: CircleCardAccountType | null;
  identityTags?: string[];
};

const ACCOUNT_TYPE_ICONS = {
  INDIVIDUAL: UserRound,
  FOUNDER: Rocket,
  TEAM: UsersRound
} as const;

export function CircleCardIdentityFields({
  accountType,
  identityTags = [],
  compact = false,
  idPrefix = "circle-card-identity",
  required = false
}: CircleCardIdentityFieldsProps) {
  const selectedTags = new Set(identityTags);

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">What best describes you?</legend>
        <div className={cn("grid gap-3", compact ? "md:grid-cols-3" : "lg:grid-cols-3")}>
          {CIRCLE_CARD_ACCOUNT_TYPES.map((type) => {
            const copy = CIRCLE_CARD_ACCOUNT_TYPE_COPY[type];
            const Icon = ACCOUNT_TYPE_ICONS[type];
            const id = `${idPrefix}-account-${type.toLowerCase()}`;

            return (
              <label key={type} htmlFor={id} className="block cursor-pointer">
                <input
                  id={id}
                  type="radio"
                  name="accountType"
                  value={type}
                  defaultChecked={accountType === type}
                  required={required}
                  className="peer sr-only"
                />
                <span className="flex h-full flex-col gap-3 rounded-2xl border border-silver/14 bg-background/22 p-4 text-sm text-muted transition peer-checked:border-gold/40 peer-checked:bg-gold/10 peer-checked:text-foreground">
                  <span className="inline-flex items-center gap-2 font-medium text-foreground">
                    <Icon size={16} className="text-gold" />
                    {copy.label}
                  </span>
                  <span className="text-xs leading-relaxed text-muted">{copy.description}</span>
                  {!compact ? (
                    <span className="flex flex-wrap gap-1.5">
                      {copy.points.slice(0, 3).map((point) => (
                        <span
                          key={point}
                          className="rounded-full border border-silver/14 bg-card/50 px-2 py-1 text-[11px] text-silver"
                        >
                          {point}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Identity tags</legend>
        <div className="flex flex-wrap gap-2">
          {CIRCLE_CARD_IDENTITY_TAGS.map((tag) => {
            const id = `${idPrefix}-tag-${tag.value}`;

            return (
              <label key={tag.value} htmlFor={id} className="cursor-pointer">
                <input
                  id={id}
                  type="checkbox"
                  name="identityTags"
                  value={tag.value}
                  defaultChecked={selectedTags.has(tag.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-9 items-center rounded-full border border-silver/14 bg-background/22 px-3 text-xs font-medium text-silver transition peer-checked:border-gold/35 peer-checked:bg-gold/10 peer-checked:text-gold">
                  {tag.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function CircleCardIdentityBanner({
  cardId,
  returnPath,
  accountType,
  identityTags
}: CircleCardIdentityBannerProps) {
  return (
    <details className="rounded-2xl border border-gold/24 bg-gold/10 p-4">
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
        Help personalise your Circle Card.
        <span className="ml-2 text-xs font-normal text-gold">Choose account type</span>
      </summary>
      <form action={updateCircleCardIdentityAction} className="mt-4 space-y-4">
        <input type="hidden" name="cardId" value={cardId} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <CircleCardIdentityFields
          accountType={accountType}
          identityTags={identityTags}
          idPrefix="circle-card-identity-banner"
          compact
          required
        />
        <Button type="submit" size="sm" className="gap-2">
          Save identity
        </Button>
      </form>
    </details>
  );
}
