"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { ArrowRight, ContactRound, LockKeyhole, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TERMS_LABEL } from "@/config/legal";
import {
  type CircleCardRegistrationFormInput,
  circleCardRegistrationFormSchema
} from "@/lib/auth/schemas";

type CircleCardRegisterResponse = {
  ok?: boolean;
  error?: string;
  redirectTo?: string;
};

type CircleCardRegisterFormProps = {
  defaults?: {
    name?: string;
    email?: string;
    businessName?: string;
  };
  returnTo?: string;
  sourceCardSlug?: string;
  referralCode?: string;
};

export function CircleCardRegisterForm({
  defaults,
  returnTo,
  sourceCardSlug,
  referralCode
}: CircleCardRegisterFormProps = {}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CircleCardRegistrationFormInput>({
    resolver: zodResolver(circleCardRegistrationFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      source: "circle-card",
      name: defaults?.name ?? "",
      email: defaults?.email ?? "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
      minimumAgeConfirmed: false,
      marketingEmailOptIn: false,
      businessName: defaults?.businessName ?? "",
      returnTo: returnTo ?? "",
      sourceCardSlug: sourceCardSlug ?? "",
      referralCode: referralCode ?? ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            source: "circle-card",
            name: values.name,
            email: values.email,
            password: values.password,
            acceptedTerms: values.acceptedTerms,
            minimumAgeConfirmed: values.minimumAgeConfirmed,
            marketingEmailOptIn: values.marketingEmailOptIn,
            businessName: values.businessName,
            returnTo: values.returnTo,
            sourceCardSlug: values.sourceCardSlug,
            referralCode: values.referralCode
          })
        });
        const data = (await response.json().catch(() => ({}))) as CircleCardRegisterResponse;

        if (!response.ok) {
          setNotice(data.error ?? "Unable to create your free Circle Card account.");
          return;
        }

        const signInResult = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false
        });

        if (signInResult?.error) {
          setAccountCreated(true);
          setNotice("Account created. Use the Sign in link below to continue your Circle Card setup.");
          return;
        }

        // The registration request performs the primary attribution. This
        // authenticated retry closes the small failure window between account
        // creation and referral persistence without creating duplicates.
        await fetch("/api/circle-card/referral-attribution/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            referralCode: values.referralCode,
            sourceCardSlug: values.sourceCardSlug,
            returnTo: values.returnTo
          })
        }).catch(() => undefined);

        router.push(data.redirectTo ?? "/dashboard/circle-card/onboarding");
        router.refresh();
      } catch {
        setNotice("We could not reach the registration service. Your details are still here; please try again.");
      }
    });
  });

  const canSubmit = form.formState.isValid && !isPending;

  return (
    <Card className="overflow-hidden border-gold/25 bg-gradient-to-b from-card/95 via-card/84 to-background/76 shadow-[0_24px_70px_rgba(2,6,23,0.32)] backdrop-blur-xl">
      <CardHeader className="gap-4 border-b border-border/70 bg-gradient-to-br from-gold/12 via-background/12 to-transparent pb-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
            <ContactRound size={12} className="mr-1" />
            Circle Card Free
          </Badge>
          <Badge variant="outline" className="border-border/80 bg-background/35 text-silver">
            <LockKeyhole size={12} className="mr-1" />
            One BCN login
          </Badge>
        </div>
        <div>
          <CardTitle className="text-2xl sm:text-[2rem]">
            Create your free Circle Card
          </CardTitle>
          <CardDescription className="mt-2 max-w-xl text-sm">
            Start with a public card, Circle Wallet, QR sharing and basic analytics. BCN member
            rooms stay locked until you choose a membership.
          </CardDescription>
        </div>
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

        <form className="space-y-5" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("source")} />
          <input type="hidden" {...form.register("returnTo")} />
          <input type="hidden" {...form.register("sourceCardSlug")} />
          <input type="hidden" {...form.register("referralCode")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="circle-card-register-name">Full Name</Label>
              <Input id="circle-card-register-name" autoComplete="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="circle-card-register-email">Email</Label>
              <Input
                id="circle-card-register-email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="circle-card-register-business">Business Name</Label>
            <Input
              id="circle-card-register-business"
              autoComplete="organization"
              placeholder="Optional"
              {...form.register("businessName")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="circle-card-register-password">Password</Label>
              <Input
                id="circle-card-register-password"
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
              <Label htmlFor="circle-card-register-confirm-password">Confirm Password</Label>
              <Input
                id="circle-card-register-confirm-password"
                type="password"
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/20 p-4">
            <label
              htmlFor="circle-card-register-accepted-terms"
              className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
            >
              <input
                id="circle-card-register-accepted-terms"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                {...form.register("acceptedTerms")}
              />
              <span className="min-w-0">
                I agree to the{" "}
                <Link href="/terms-of-service" className="text-primary hover:underline">
                  {TERMS_LABEL}
                </Link>{" "}
                and{" "}
                <Link href="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                , and understand I will receive essential account emails.
              </span>
            </label>
            {form.formState.errors.acceptedTerms ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.acceptedTerms.message}
              </p>
            ) : null}
            <label
              htmlFor="circle-card-register-minimum-age"
              className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
            >
              <input
                id="circle-card-register-minimum-age"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                {...form.register("minimumAgeConfirmed")}
              />
              <span className="min-w-0">
                I confirm I am at least 13 years old and agree to the{" "}
                <Link href="/circle-card/community-standards" className="text-primary hover:underline">
                  Circle Card Community Standards
                </Link>
                .
              </span>
            </label>
            {form.formState.errors.minimumAgeConfirmed ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.minimumAgeConfirmed.message}
              </p>
            ) : null}
            <label
              htmlFor="circle-card-register-marketing-opt-in"
              className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
            >
              <input
                id="circle-card-register-marketing-opt-in"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                {...form.register("marketingEmailOptIn")}
              />
              <span className="min-w-0">
                Send me BCN updates, business growth tips and opportunities by email.
              </span>
            </label>
            <p className="text-xs leading-relaxed text-muted">
              Optional updates are separate from service emails and can be left unticked.
            </p>
          </div>

          <Button disabled={!canSubmit} type="submit" className="w-full" size="lg">
            <span className="inline-flex items-center gap-2">
              {isPending ? "Creating Account..." : "Create Free Circle Card"}
              {isPending ? null : <ArrowRight size={16} />}
            </span>
          </Button>
        </form>

        <div className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-sm text-muted">
          <p className="flex items-start gap-2">
            <WalletCards size={15} className="mt-0.5 shrink-0 text-silver" />
            <span>
              Already have a BCN account?{" "}
              <Link
                href={`/login?from=${encodeURIComponent(
                  accountCreated
                    ? "/dashboard/circle-card/onboarding"
                    : returnTo || "/dashboard/circle-card"
                )}`}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>{" "}
              and Circle Card will be available from your dashboard.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
