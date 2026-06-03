"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  ContactRound,
  Globe2,
  Sparkles,
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
import { cn } from "@/lib/utils";

type CircleCardOnboardingDefaults = {
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
};

type CircleCardOnboardingFlowProps = {
  defaults: CircleCardOnboardingDefaults;
};

const STEPS = [
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
  | "profileImagePositionX"
  | "profileImagePositionY"
  | "profileImageScale"
  | "businessLogoPositionX"
  | "businessLogoPositionY"
  | "businessLogoScale"
>;

const CIRCLE_CARD_LOGO_SRC = "/branding/circle-card-logo.png";

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
  const [nameError, setNameError] = useState<string | null>(null);
  const currentStep = STEPS[stepIndex];
  const StepIcon = currentStep.icon;
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const currentValue = currentStep.id !== "publish" ? String(values[currentStep.id as TextFieldKey] ?? "") : "";

  const previewName = values.fullName.trim() || "Your name";
  const previewMeta = useMemo(
    () => [values.role, values.businessName].filter(Boolean).join(" at "),
    [values.businessName, values.role]
  );

  function updateValue(key: TextFieldKey, value: string) {
    setValues((previous) => ({
      ...previous,
      [key]: value
    }));

    if (key === "fullName" && value.trim().length >= 2) {
      setNameError(null);
    }
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
    if (currentStep.id !== "fullName") {
      return true;
    }

    if (values.fullName.trim().length < 2) {
      setNameError("Add your full name before continuing.");
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
    setNameError(null);
    setStepIndex((previous) => Math.max(previous - 1, 0));
  }

  function skipStep() {
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
            {Object.entries(values).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={String(value)} />
            ))}
            <input type="hidden" name="isPublished" value="true" />

            {currentStep.id === "publish" ? (
              <div className="rounded-2xl border border-gold/24 bg-gold/10 p-5">
                <p className="text-sm font-medium text-foreground">Ready to publish</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Your card will be live straight away. You can edit every field from the Circle
                  Card dashboard after setup.
                </p>
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
                {currentStep.id === "fullName" && nameError ? (
                  <p className="text-xs text-destructive">{nameError}</p>
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
            <Badge variant="outline" className="border-silver/18 text-silver">
              Wallet ready
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
