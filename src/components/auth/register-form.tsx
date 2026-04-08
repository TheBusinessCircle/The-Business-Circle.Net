"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  formatMembershipPrice,
  getMembershipTierLabel,
  getMembershipTierPricing
} from "@/config/membership";
import {
  type MembershipBillingIntervalValue,
  type RegisterMemberFormInput,
  registerMemberFormSchema
} from "@/lib/auth/schemas";
import { safeRedirectPath } from "@/lib/auth/utils";

type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

type RegisterFormProps = {
  from?: string;
  loginFrom?: string;
  defaultTier?: MembershipTier;
  selectedTier?: MembershipTier;
  onTierChange?: (tier: MembershipTier) => void;
  inviteCode?: string;
  billingInterval?: MembershipBillingIntervalValue;
  coreAccessConfirmed?: boolean;
  showTierSelector?: boolean;
  showCoreConfirmation?: boolean;
  submitDisabled?: boolean;
  tierOptions?: Array<{
    value: MembershipTier;
    label: string;
  }>;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  tier: MembershipTier;
  billingInterval: MembershipBillingIntervalValue;
  coreAccessConfirmed: boolean;
  businessName?: string;
  businessStatus?: "IDEA_STARTUP" | "REGISTERED_BUSINESS" | "ESTABLISHED_COMPANY";
  companyNumber?: string;
  businessStage?: "IDEA" | "STARTUP" | "GROWTH" | "SCALE" | "ESTABLISHED";
  inviteCode?: string;
};

type RegisterResponse = {
  ok?: boolean;
  error?: string;
  checkoutUrl?: string;
};

function withFrom(pathname: string, from?: string) {
  const target = from ? safeRedirectPath(from, "") : "";
  if (!target) {
    return pathname;
  }

  const params = new URLSearchParams({ from: target });
  return `${pathname}?${params.toString()}`;
}

function withJoinWelcome(pathname: string) {
  const target = safeRedirectPath(pathname);
  const url = new URL(target, "http://localhost");

  if (url.pathname !== "/dashboard") {
    return `${url.pathname}${url.search}`;
  }

  url.searchParams.set("welcome", "1");
  url.searchParams.set("source", "join");
  return `${url.pathname}${url.search}`;
}

const DEFAULT_TIER_OPTIONS: NonNullable<RegisterFormProps["tierOptions"]> = [
  {
    value: "FOUNDATION",
    label: `${getMembershipTierLabel("FOUNDATION")} - ${formatMembershipPrice(getMembershipTierPricing("FOUNDATION").standardMonthlyPrice)}/month`
  },
  {
    value: "INNER_CIRCLE",
    label: `${getMembershipTierLabel("INNER_CIRCLE")} - ${formatMembershipPrice(getMembershipTierPricing("INNER_CIRCLE").standardMonthlyPrice)}/month`
  },
  {
    value: "CORE",
    label: `${getMembershipTierLabel("CORE")} - ${formatMembershipPrice(getMembershipTierPricing("CORE").standardMonthlyPrice)}/month`
  }
];

const tierHeroCopy: Record<
  MembershipTier,
  {
    label: string;
    highlight: string;
    description: string;
  }
> = {
  FOUNDATION: {
    label: "Foundation selected",
    highlight: "Clearest place to begin",
    description:
      "A strong entry into the ecosystem for members who want structure, signal, and a calmer room."
  },
  INNER_CIRCLE: {
    label: "Inner Circle selected",
    highlight: "The balanced next move",
    description:
      "A more focused environment with stronger business context and a better level of conversation."
  },
  CORE: {
    label: "Core selected",
    highlight: "Closest strategic access",
    description:
      "The highest-value room for members who want the deepest layer of proximity and context."
  }
};

export function RegisterForm({
  from,
  loginFrom,
  defaultTier = "FOUNDATION",
  selectedTier,
  onTierChange,
  inviteCode,
  billingInterval = "monthly",
  coreAccessConfirmed = false,
  showTierSelector = true,
  showCoreConfirmation = true,
  submitDisabled = false,
  tierOptions = DEFAULT_TIER_OPTIONS
}: RegisterFormProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const targetPath = useMemo(() => safeRedirectPath(from), [from]);
  const loginTargetPath = useMemo(
    () => safeRedirectPath(loginFrom ?? from),
    [from, loginFrom]
  );
  const resolvedTierOptions = tierOptions ?? DEFAULT_TIER_OPTIONS;

  const form = useForm<RegisterMemberFormInput>({
    resolver: zodResolver(registerMemberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      tier: defaultTier,
      billingInterval,
      coreAccessConfirmed,
      businessName: "",
      businessStatus: "",
      companyNumber: "",
      businessStage: "",
      inviteCode: inviteCode ?? ""
    }
  });
  const tierField = form.register("tier");
  const activeTier = form.watch("tier") as MembershipTier;
  const activeTierContent = tierHeroCopy[activeTier];

  useEffect(() => {
    if (!selectedTier) {
      return;
    }

    form.setValue("tier", selectedTier, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true
    });
  }, [form, selectedTier]);

  useEffect(() => {
    form.setValue("billingInterval", billingInterval, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false
    });
  }, [billingInterval, form]);

  useEffect(() => {
    form.setValue("coreAccessConfirmed", coreAccessConfirmed, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false
    });
  }, [coreAccessConfirmed, form]);

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);

    startTransition(async () => {
      const payload: RegisterPayload = {
        name: values.name,
        email: values.email,
        password: values.password,
        tier: values.tier,
        billingInterval: values.billingInterval,
        coreAccessConfirmed: values.coreAccessConfirmed
      };

      if (values.inviteCode?.trim()) {
        payload.inviteCode = values.inviteCode.trim();
      }

      if (values.businessName?.trim()) {
        payload.businessName = values.businessName.trim();
      }

      if (values.businessStatus) {
        payload.businessStatus = values.businessStatus;
      }

      if (values.companyNumber?.trim()) {
        payload.companyNumber = values.companyNumber.trim();
      }

      if (values.businessStage) {
        payload.businessStage = values.businessStage;
      }

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        setNotice(data.error ?? "Unable to create account.");
        return;
      }

      if (data.checkoutUrl) {
        await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false
        });

        window.location.assign(data.checkoutUrl);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false
      });

      if (signInResult?.error) {
        setNotice("Account created. Please sign in.");
        router.push(withFrom("/login", loginTargetPath));
        router.refresh();
        return;
      }

      router.push(withJoinWelcome(targetPath));
      router.refresh();
    });
  });

  return (
    <Card className="overflow-hidden border-gold/25 bg-gradient-to-b from-card/95 via-card/84 to-background/76 shadow-[0_24px_70px_rgba(2,6,23,0.32)] backdrop-blur-xl">
      <CardHeader className="gap-4 border-b border-border/70 bg-gradient-to-br from-gold/12 via-background/12 to-transparent pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                <Sparkles size={12} className="mr-1" />
                Your entry point
              </Badge>
              <Badge variant="outline" className="border-border/80 bg-background/35 text-silver">
                <LockKeyhole size={12} className="mr-1" />
                Secure setup
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-[2rem]">Create your account and choose your room</CardTitle>
            <CardDescription className="max-w-xl text-sm">
              Start with the room that fits where your business is now, then continue into secure
              membership setup.
            </CardDescription>
          </div>

          <div className="w-full rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 shadow-gold-soft sm:min-w-[180px] sm:max-w-[18rem] sm:w-auto">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">{activeTierContent.label}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{activeTierContent.highlight}</p>
            <div className="gold-divider my-3" />
            <p className="mt-2 text-sm text-muted">{activeTierContent.description}</p>
          </div>
        </div>

        {inviteCode ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-gold">Member invite attached</p>
            <p className="mt-2 text-sm text-muted">
              Invite code{" "}
              <span className="font-medium tracking-[0.08em] text-foreground">{inviteCode}</span>{" "}
              will stay attached when you register.
            </p>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {notice ? (
          <p
            aria-live="polite"
            className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary"
          >
            {notice}
          </p>
        ) : null}

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(10.75rem,1fr))]">
          {[
            "Business-first member environment",
            "Secure membership setup",
            "Clear room progression"
          ].map((item) => (
            <div
              key={item}
              className="min-h-[84px] min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/28 px-4 py-3.5 text-sm text-muted"
            >
              <p className="flex min-w-0 items-start gap-2.5 leading-relaxed">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                <span className="min-w-0 break-words">{item}</span>
              </p>
            </div>
          ))}
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("billingInterval")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-name">Full Name</Label>
              <Input id="register-name" autoComplete="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input id="register-email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : (
                <p className="text-xs text-muted">
                  Use at least 10 characters with uppercase, lowercase, number, and symbol.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">Confirm Password</Label>
              <Input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-gold/20 bg-gold/8 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Membership tier</p>
                <p className="mt-1 text-sm text-muted">
                  Choose the room you want your registration and billing flow to continue with.
                </p>
              </div>
              <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs text-gold">
                {activeTierContent.label}
              </span>
            </div>

            {showTierSelector ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="register-tier">Membership Tier</Label>
                <Select
                  id="register-tier"
                  {...tierField}
                  onChange={(event) => {
                    tierField.onChange(event);
                    onTierChange?.(event.target.value as MembershipTier);
                  }}
                >
                  {resolvedTierOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <input type="hidden" {...tierField} />
            )}

            {showCoreConfirmation && activeTier === "CORE" ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-gold/25 bg-background/35 px-4 py-4">
                <label
                  htmlFor="register-core-access-confirmed"
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <input
                    id="register-core-access-confirmed"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                    {...form.register("coreAccessConfirmed")}
                  />
                  <span>I am actively running a business or generating revenue from a business</span>
                </label>
                <p className="text-xs text-muted">
                  Core is designed for operators already running or scaling a business.
                </p>
                {form.formState.errors.coreAccessConfirmed ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.coreAccessConfirmed.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-business-name">Business Name</Label>
            <Input
              id="register-business-name"
              autoComplete="organization"
              placeholder="Your business or project name"
              {...form.register("businessName")}
            />
            {form.formState.errors.businessName ? (
              <p className="text-xs text-destructive">{form.formState.errors.businessName.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-business-status">Business Status</Label>
              <Select id="register-business-status" {...form.register("businessStatus")}>
                <option value="">Select status</option>
                <option value="IDEA_STARTUP">Idea / Startup</option>
                <option value="REGISTERED_BUSINESS">Registered Business</option>
                <option value="ESTABLISHED_COMPANY">Established Company</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-business-stage">Business Stage</Label>
              <Select id="register-business-stage" {...form.register("businessStage")}>
                <option value="">Select stage</option>
                <option value="IDEA">Idea</option>
                <option value="STARTUP">Startup</option>
                <option value="GROWTH">Growth</option>
                <option value="SCALE">Scale</option>
                <option value="ESTABLISHED">Established</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-company-number">Company Number</Label>
            <Input
              id="register-company-number"
              placeholder="Optional, but useful for registered businesses"
              {...form.register("companyNumber")}
            />
            <p className="text-xs text-muted">
              Leave this blank if the business is still at idea or startup stage.
            </p>
          </div>

          <input type="hidden" {...form.register("inviteCode")} />

          <Button disabled={isPending || submitDisabled} type="submit" className="w-full" size="lg">
            <span className="inline-flex items-center gap-2">
              {isPending ? "Creating Account..." : "Create Account And Continue"}
              {isPending ? null : <ArrowRight size={16} />}
            </span>
          </Button>

          {submitDisabled ? (
            <p className="text-xs text-muted">
              Confirm Core eligibility above to continue.
            </p>
          ) : null}
        </form>

        <p className="text-sm text-muted">
          Already a member?{" "}
          <Link href={withFrom("/login", loginTargetPath)} className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
