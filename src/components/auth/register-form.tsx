"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { type RegisterMemberFormInput, registerMemberFormSchema } from "@/lib/auth/schemas";
import { safeRedirectPath } from "@/lib/auth/utils";

type RegisterFormProps = {
  from?: string;
  defaultTier?: "FOUNDATION" | "INNER_CIRCLE" | "CORE";
  inviteCode?: string;
  tierOptions?: Array<{
    value: "FOUNDATION" | "INNER_CIRCLE" | "CORE";
    label: string;
  }>;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  tier: "FOUNDATION" | "INNER_CIRCLE" | "CORE";
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
  { value: "FOUNDATION", label: "Foundation - GBP 30/month" },
  { value: "INNER_CIRCLE", label: "Inner Circle - GBP 60/month" },
  { value: "CORE", label: "Core - GBP 120/month" }
];

export function RegisterForm({
  from,
  defaultTier = "FOUNDATION",
  inviteCode,
  tierOptions = DEFAULT_TIER_OPTIONS
}: RegisterFormProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const targetPath = useMemo(() => safeRedirectPath(from), [from]);
  const resolvedTierOptions = tierOptions ?? DEFAULT_TIER_OPTIONS;

  const form = useForm<RegisterMemberFormInput>({
    resolver: zodResolver(registerMemberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      tier: defaultTier,
      businessName: "",
      businessStatus: "",
      companyNumber: "",
      businessStage: "",
      inviteCode: inviteCode ?? ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);

    startTransition(async () => {
      const payload: RegisterPayload = {
        name: values.name,
        email: values.email,
        password: values.password,
        tier: values.tier
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
        router.push(withFrom("/login", from));
        router.refresh();
        return;
      }

      router.push(withJoinWelcome(targetPath));
      router.refresh();
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Create your account, choose the membership level that fits your business, and enter a calmer, more structured founder environment. If you want a better room around the business, you are in the right place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {notice ? (
          <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            {notice}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
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

          <div className="space-y-2">
            <Label htmlFor="register-tier">Membership Tier</Label>
            <Select id="register-tier" {...form.register("tier")}>
              {resolvedTierOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
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
              <p className="text-xs text-destructive">
                {form.formState.errors.businessName.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <Button disabled={isPending} type="submit" className="w-full">
            {isPending ? "Creating Account..." : "Create Account And Continue"}
          </Button>
        </form>

        <p className="text-sm text-muted">
          Already a member?{" "}
          <Link href={withFrom("/login", from)} className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

