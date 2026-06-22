"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { CircleCardAccountType } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  ContactRound,
  Eye,
  Globe2,
  Rocket,
  Sparkles,
  Tags,
  UsersRound,
  UserRound
} from "lucide-react";
import { completeCircleCardOnboardingAction } from "@/actions/circle-card.actions";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CIRCLE_CARD_ACCOUNT_TYPE_COPY,
  CIRCLE_CARD_ACCOUNT_TYPES,
  CIRCLE_CARD_IDENTITY_TAGS,
  getCircleCardIdentityTagLabel
} from "@/lib/circle-card/identity";
import { getCircleCardOnboardingPlanGuidance } from "@/lib/circle-card/plans";
import {
  CIRCLE_CARD_DISCOVER_HIDDEN_LABEL,
  CIRCLE_CARD_DISCOVER_SETTING_COPY,
  CIRCLE_CARD_DISCOVER_VISIBLE_LABEL
} from "@/lib/circle-card/privacy";
import { cn } from "@/lib/utils";

type CircleCardOnboardingDefaults = {
  accountType: CircleCardAccountType | "";
  identityTags: string[];
  fullName: string;
  businessName: string;
  role: string;
  tagline: string;
  websiteUrl: string;
  profileImageUrl: string;
  businessLogoUrl: string;
  profileImagePositionX: number;
  profileImagePositionY: number;
  profileImageScale: number;
  businessLogoPositionX: number;
  businessLogoPositionY: number;
  businessLogoScale: number;
  showInDiscover: boolean;
};

type CircleCardOnboardingFlowProps = {
  defaults: CircleCardOnboardingDefaults;
};

const STEPS = [
  {
    id: "accountType",
    title: "What best describes you?",
    label: "Account type",
    description: "Choose the foundation that fits how you will use Circle Card.",
    icon: UserRound,
    optional: false,
    placeholder: ""
  },
  {
    id: "identityTags",
    title: "Identity tags",
    label: "Identity tags",
    description: "Pick a few tags that help people understand what you do.",
    icon: Tags,
    optional: true,
    placeholder: ""
  },
  {
    id: "profileImageUrl",
    title: "Profile photo",
    label: "Profile photo",
    description: "Upload a portrait from your device, or skip and add a photo later.",
    icon: Camera,
    optional: true,
    placeholder: "https://..."
  },
  {
    id: "businessLogoUrl",
    title: "Business logo",
    label: "Business logo",
    description: "Add a business mark for the small identity badge, or skip this step.",
    icon: Building2,
    optional: true,
    placeholder: "https://..."
  },
  {
    id: "fullName",
    title: "Full name",
    label: "Full name",
    description: "This is the main name people will see on your public Circle Card.",
    icon: UserRound,
    optional: false,
    placeholder: "Your name"
  },
  {
    id: "businessName",
    title: "Business name",
    label: "Business name",
    description: "Add the business or project you want associated with this card.",
    icon: BriefcaseBusiness,
    optional: true,
    placeholder: "Your business"
  },
  {
    id: "role",
    title: "Role",
    label: "Role",
    description: "Give people a quick sense of what you do.",
    icon: ContactRound,
    optional: true,
    placeholder: "Founder, operator, advisor"
  },
  {
    id: "tagline",
    title: "Tagline",
    label: "Tagline",
    description: "A short line that makes the card feel useful and memorable.",
    icon: Sparkles,
    optional: true,
    placeholder: "What people should remember"
  },
  {
    id: "websiteUrl",
    title: "Website",
    label: "Website",
    description: "Add the best next step for people who want to learn more.",
    icon: Globe2,
    optional: true,
    placeholder: "https://example.com"
  },
  {
    id: "discover",
    title: "Want to be found by other Circle Card users?",
    label: "Discover visibility",
    description: CIRCLE_CARD_DISCOVER_SETTING_COPY,
    icon: Eye,
    optional: false,
    placeholder: ""
  },
  {
    id: "publish",
    title: "Publish card",
    label: "Publish",
    description: "Create your first Circle Card and make it available at its public link.",
    icon: BadgeCheck,
    optional: false,
    placeholder: ""
  }
] as const;

type FieldKey = keyof CircleCardOnboardingDefaults;
type TextFieldKey = Exclude<
  FieldKey,
  | "accountType"
  | "identityTags"
  | "profileImagePositionX"
  | "profileImagePositionY"
  | "profileImageScale"
  | "businessLogoPositionX"
  | "businessLogoPositionY"
  | "businessLogoScale"
  | "showInDiscover"
>;

const CIRCLE_CARD_LOGO_SRC = "/branding/circle-card-logo.png";
const ACCOUNT_TYPE_ICONS = {
  INDIVIDUAL: UserRound,
  FOUNDER: Rocket,
  TEAM: UsersRound
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full gap-2" size="lg">
      {pending ? "Publishing..." : "Publish Circle Card"}
      {pending ? null : <BadgeCheck size={16} />}
    </Button>
  );
}

export function CircleCardOnboardingFlow({ defaults }: CircleCardOnboardingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<CircleCardOnboardingDefaults>(defaults);
  const [stepError, setStepError] = useState<string | null>(null);
  const currentStep = STEPS[stepIndex];
  const StepIcon = currentStep.icon;
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const currentValue =
    currentStep.id !== "publish" &&
    currentStep.id !== "accountType" &&
    currentStep.id !== "identityTags" &&
    currentStep.id !== "discover"
      ? String(values[currentStep.id as TextFieldKey] ?? "")
      : "";

  const previewName = values.fullName.trim() || "Your name";
  const previewMeta = useMemo(
    () => [values.role, values.businessName].filter(Boolean).join(" at "),
    [values.businessName, values.role]
  );
  const accountTypeLabel = values.accountType
    ? CIRCLE_CARD_ACCOUNT_TYPE_COPY[values.accountType].shortLabel
    : null;
  const selectedPlanGuidance = getCircleCardOnboardingPlanGuidance(values.accountType);
  const identityTagLabels = useMemo(
    () => values.identityTags.map(getCircleCardIdentityTagLabel).slice(0, 2),
    [values.identityTags]
  );

  function updateValue(key: TextFieldKey, value: string) {
    setValues((previous) => ({
      ...previous,
      [key]: value
    }));

    if (key === "fullName" && value.trim().length >= 2) {
      setStepError(null);
    }
  }

  function updateAccountType(accountType: CircleCardAccountType) {
    setValues((previous) => ({
      ...previous,
      accountType
    }));
    setStepError(null);
  }

  function toggleIdentityTag(tag: string) {
    setValues((previous) => {
      const selectedTags = new Set(previous.identityTags);

      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
      } else if (selectedTags.size < 8) {
        selectedTags.add(tag);
      }

      return {
        ...previous,
        identityTags: Array.from(selectedTags)
      };
    });
  }

  function updateDiscoverVisibility(showInDiscover: boolean) {
    setValues((previous) => ({
      ...previous,
      showInDiscover
    }));
  }

  function updateImageAdjustments(
    prefix: "profileImage" | "businessLogo",
    adjustment: {
      positionX: number;
      positionY: number;
      scale: number;
    }
  ) {
    if (prefix === "profileImage") {
      setValues((previous) => ({
        ...previous,
        profileImagePositionX: adjustment.positionX,
        profileImagePositionY: adjustment.positionY,
        profileImageScale: adjustment.scale
      }));
      return;
    }

    setValues((previous) => ({
      ...previous,
      businessLogoPositionX: adjustment.positionX,
      businessLogoPositionY: adjustment.positionY,
      businessLogoScale: adjustment.scale
    }));
  }

  function canLeaveCurrentStep() {
    if (currentStep.id === "accountType" && !values.accountType) {
      setStepError("Choose the option that best describes you.");
      return false;
    }

    if (currentStep.id !== "fullName") {
      return true;
    }

    if (values.fullName.trim().length < 2) {
      setStepError("Add your full name before continuing.");
      return false;
    }

    return true;
  }

  function goNext() {
    if (!canLeaveCurrentStep()) {
      return;
    }

    setStepIndex((previous) => Math.min(previous + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStepIndex((previous) => Math.max(previous - 1, 0));
  }

  function skipStep() {
    if (currentStep.id === "identityTags") {
      setValues((previous) => ({
        ...previous,
        identityTags: []
      }));
      goNext();
      return;
    }

    if (currentStep.id !== "publish" && currentStep.optional) {
      updateValue(currentStep.id as TextFieldKey, "");
    }

    goNext();
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="border-silver/16 bg-card/72">
        <CardHeader className="border-b border-silver/12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="border-gold/25 text-gold">
              Step {stepIndex + 1} of {STEPS.length}
            </Badge>
            <span className="text-xs text-muted">{progress}% complete</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/50">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
              <StepIcon size={20} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                Circle Card setup
              </p>
              <CardTitle className="mt-2 text-3xl">{currentStep.title}</CardTitle>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {currentStep.description}
              </p>
            </div>
          </div>

          <form action={completeCircleCardOnboardingAction} className="space-y-5">
            {Object.entries(values).flatMap(([key, value]) =>
              Array.isArray(value)
                ? value.map((item) => (
                    <input key={`${key}-${item}`} type="hidden" name={key} value={String(item)} />
                  ))
                : [<input key={key} type="hidden" name={key} value={String(value)} />]
            )}
            <input type="hidden" name="isPublished" value="true" />

            {currentStep.id === "publish" ? (
              <div className="rounded-2xl border border-gold/24 bg-gold/10 p-5">
                <p className="text-sm font-medium text-foreground">Ready to publish</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Your card will be live straight away. You can edit every field from the Circle
                  Card dashboard after setup.
                </p>
              </div>
            ) : currentStep.id === "accountType" ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {CIRCLE_CARD_ACCOUNT_TYPES.map((type) => {
                    const copy = CIRCLE_CARD_ACCOUNT_TYPE_COPY[type];
                    const planGuidance = getCircleCardOnboardingPlanGuidance(type);
                    const Icon = ACCOUNT_TYPE_ICONS[type];
                    const selected = values.accountType === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateAccountType(type)}
                        className={cn(
                          "flex min-h-44 flex-col gap-3 rounded-2xl border bg-background/22 p-4 text-left text-sm transition",
                          selected
                            ? "border-gold/45 bg-gold/10 text-foreground shadow-gold-soft"
                            : "border-silver/14 text-muted hover:border-silver/28 hover:text-foreground"
                        )}
                      >
                        <span className="inline-flex items-center gap-2 font-medium text-foreground">
                          <Icon size={17} className="text-gold" />
                          {copy.label}
                        </span>
                        {planGuidance ? (
                          <span className="w-fit rounded-full border border-gold/24 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                            Suggested: {planGuidance.suggestedLabel}
                          </span>
                        ) : null}
                        <span className="text-xs leading-relaxed text-muted">{copy.description}</span>
                        <span className="mt-auto flex flex-wrap gap-1.5">
                          {copy.points.slice(0, 3).map((point) => (
                            <span
                              key={point}
                              className="rounded-full border border-silver/14 bg-card/50 px-2 py-1 text-[11px] text-silver"
                            >
                              {point}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div
                  className={cn(
                    "rounded-2xl border border-silver/14 bg-background/18 p-4 text-sm text-muted",
                    selectedPlanGuidance?.warning ? "border-amber-500/30 bg-amber-500/10" : ""
                  )}
                >
                  <p className="font-medium text-foreground">
                    {selectedPlanGuidance
                      ? `Recommended path: ${selectedPlanGuidance.suggestedLabel}`
                      : "Choose the path that fits how you will share your card."}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {selectedPlanGuidance
                      ? selectedPlanGuidance.description
                      : "Individual cards can stay on Free, while business growth and team rollout will have clearer upgrade paths."}
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {selectedPlanGuidance?.guidance ??
                      "Start free. Upgrade when your card becomes part of your business growth system."}
                  </p>
                  {selectedPlanGuidance?.warning ? (
                    <p className="mt-2 font-medium text-amber-200">{selectedPlanGuidance.warning}</p>
                  ) : null}
                </div>
                {stepError ? <p className="text-xs text-destructive">{stepError}</p> : null}
              </div>
            ) : currentStep.id === "identityTags" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {CIRCLE_CARD_IDENTITY_TAGS.map((tag) => {
                    const selected = values.identityTags.includes(tag.value);

                    return (
                      <button
                        key={tag.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleIdentityTag(tag.value)}
                        className={cn(
                          "inline-flex min-h-10 items-center rounded-full border px-3 text-xs font-medium transition",
                          selected
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-silver/14 bg-background/22 text-silver hover:border-silver/28 hover:text-foreground"
                        )}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted">Optional. Choose up to eight.</p>
              </div>
            ) : currentStep.id === "discover" ? (
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Discover visibility">
                {[
                  {
                    value: false,
                    title: "No, keep me hidden",
                    label: CIRCLE_CARD_DISCOVER_HIDDEN_LABEL,
                    description:
                      "Your public card link still works when you share it directly."
                  },
                  {
                    value: true,
                    title: "Yes, show my card",
                    label: CIRCLE_CARD_DISCOVER_VISIBLE_LABEL,
                    description:
                      "Other Circle Card users can find your public card in Discover."
                  }
                ].map((option) => {
                  const selected = values.showInDiscover === option.value;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => updateDiscoverVisibility(option.value)}
                      className={cn(
                        "min-h-36 rounded-2xl border bg-background/22 p-4 text-left text-sm transition",
                        selected
                          ? "border-gold/45 bg-gold/10 text-foreground shadow-gold-soft"
                          : "border-silver/14 text-muted hover:border-silver/28 hover:text-foreground"
                      )}
                    >
                      <span className="text-base font-semibold text-foreground">{option.title}</span>
                      <span className="mt-2 block text-xs font-medium text-gold">{option.label}</span>
                      <span className="mt-3 block text-xs leading-relaxed text-muted">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : currentStep.id === "profileImageUrl" || currentStep.id === "businessLogoUrl" ? (
              <CircleCardImageUploadField
                id={`onboarding-${currentStep.id}`}
                label={currentStep.label}
                uploadKind={currentStep.id === "profileImageUrl" ? "profile-photo" : "business-logo"}
                value={currentValue}
                onValueChange={(nextValue) => updateValue(currentStep.id as TextFieldKey, nextValue)}
                positionX={
                  currentStep.id === "profileImageUrl"
                    ? values.profileImagePositionX
                    : values.businessLogoPositionX
                }
                positionY={
                  currentStep.id === "profileImageUrl"
                    ? values.profileImagePositionY
                    : values.businessLogoPositionY
                }
                scale={
                  currentStep.id === "profileImageUrl"
                    ? values.profileImageScale
                    : values.businessLogoScale
                }
                onAdjustmentChange={(nextValues) =>
                  updateImageAdjustments(
                    currentStep.id === "profileImageUrl" ? "profileImage" : "businessLogo",
                    nextValues
                  )
                }
                previewAlt="Circle Card onboarding image preview"
                helperText="Optional. You can skip this for now."
                previewClassName="rounded-full"
              />
            ) : (
              <div className="space-y-2">
                <Label htmlFor={`onboarding-${currentStep.id}`}>{currentStep.label}</Label>
                <Input
                  id={`onboarding-${currentStep.id}`}
                  value={currentValue}
                  placeholder={currentStep.placeholder}
                  type={currentStep.id === "websiteUrl" ? "url" : "text"}
                  autoComplete={currentStep.id === "fullName" ? "name" : undefined}
                  onChange={(event) => updateValue(currentStep.id as TextFieldKey, event.target.value)}
                />
                {currentStep.id === "fullName" && stepError ? (
                  <p className="text-xs text-destructive">{stepError}</p>
                ) : currentStep.optional ? (
                  <p className="text-xs text-muted">Optional. You can skip this for now.</p>
                ) : null}
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 border-t border-silver/12 bg-card/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:px-7 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
              {currentStep.id === "publish" ? (
                <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                    <ArrowLeft size={16} />
                    Back
                  </Button>
                  <SubmitButton />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={stepIndex === 0}
                    className="gap-2"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </Button>
                  {currentStep.optional ? (
                    <Button type="button" variant="ghost" onClick={skipStep}>
                      Skip
                    </Button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                  <Button type="button" onClick={goNext} className="gap-2">
                    Next
                    <ArrowRight size={16} />
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="rounded-[2rem] border border-silver/16 bg-card/62 p-5 shadow-panel-soft">
        <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Preview</p>
        <div className="mt-5 rounded-[1.5rem] border border-gold/24 bg-background/36 p-5">
          <div className="flex items-start gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-gold/24 bg-background/40 text-sm font-semibold text-foreground">
              {values.profileImageUrl ? (
                <CircleCardFramedImage
                  src={values.profileImageUrl}
                  alt=""
                  positionX={values.profileImagePositionX}
                  positionY={values.profileImagePositionY}
                  scale={values.profileImageScale}
                >
                  {previewName.slice(0, 2).toUpperCase()}
                </CircleCardFramedImage>
              ) : (
                previewName.slice(0, 2).toUpperCase()
              )}
              {values.businessLogoUrl ? (
                <span className="absolute bottom-0 right-0 grid h-7 w-7 overflow-hidden rounded-full border border-gold/60 bg-background shadow-gold-soft">
                  <CircleCardFramedImage
                    src={values.businessLogoUrl}
                    fallbackSrc={CIRCLE_CARD_LOGO_SRC}
                    alt=""
                    positionX={values.businessLogoPositionX}
                    positionY={values.businessLogoPositionY}
                    scale={values.businessLogoScale}
                    fallbackPositionX={50}
                    fallbackPositionY={50}
                    fallbackScale={1}
                  />
                </span>
              ) : null}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl leading-tight text-foreground">
                {previewName}
              </h2>
              <p className="mt-2 text-sm text-silver">{previewMeta || "Circle Card"}</p>
            </div>
          </div>
          {values.tagline ? (
            <p className="mt-5 text-sm leading-relaxed text-muted">{values.tagline}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-gold/25 text-gold">
              Circle Card Free
            </Badge>
            {selectedPlanGuidance ? (
              <Badge variant="outline" className="border-gold/25 text-gold">
                Suggested: {selectedPlanGuidance.suggestedLabel}
              </Badge>
            ) : null}
            {accountTypeLabel ? (
              <Badge variant="outline" className="border-silver/18 text-silver">
                {accountTypeLabel}
              </Badge>
            ) : null}
            {identityTagLabels.map((tagLabel) => (
              <Badge key={tagLabel} variant="outline" className="border-silver/18 text-silver">
                {tagLabel}
              </Badge>
            ))}
            <Badge variant="outline" className="border-silver/18 text-silver">
              Wallet ready
            </Badge>
            <Badge variant="outline" className="border-silver/18 text-silver">
              {values.showInDiscover
                ? CIRCLE_CARD_DISCOVER_VISIBLE_LABEL
                : CIRCLE_CARD_DISCOVER_HIDDEN_LABEL}
            </Badge>
          </div>
        </div>
        <div
          className={cn(
            "mt-5 rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4 text-sm text-muted",
            stepIndex === STEPS.length - 1 ? "border-gold/24 bg-gold/10 text-gold" : ""
          )}
        >
          BCN membership features stay separate. This setup only creates your free Circle Card.
        </div>
      </aside>
    </div>
  );
}
