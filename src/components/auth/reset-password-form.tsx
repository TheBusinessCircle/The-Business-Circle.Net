"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordResetConfirmSchema } from "@/lib/auth/schemas";
import { normalizeEmail } from "@/lib/auth/utils";

const formSchema = passwordResetConfirmSchema;
type Values = z.infer<typeof formSchema>;

type ResetPasswordApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof Values, string[]>>;
};

type ResetPasswordFormProps = {
  token?: string;
  email?: string;
};

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const normalizedEmail = useMemo(() => (email ? normalizeEmail(email) : ""), [email]);
  const hasRequiredTokenData = Boolean(token && normalizedEmail);

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: normalizedEmail,
      token: token ?? "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);
    setIsSuccess(false);
    form.clearErrors();

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(values)
        });

        const payload = (await response.json().catch(() => ({}))) as ResetPasswordApiResponse;

        if (!response.ok || !payload.ok) {
          const passwordError = payload.fieldErrors?.password?.[0];
          const confirmError = payload.fieldErrors?.confirmPassword?.[0];

          if (passwordError) {
            form.setError("password", {
              type: "server",
              message: passwordError
            });
          }

          if (confirmError) {
            form.setError("confirmPassword", {
              type: "server",
              message: confirmError
            });
          }

          setNotice(payload.error ?? "Unable to reset password.");
          return;
        }

        setIsSuccess(true);
        setNotice(payload.message ?? "Password updated. You can now sign in.");
        form.reset({
          email: normalizedEmail,
          token: token ?? "",
          password: "",
          confirmPassword: ""
        });
      } catch {
        setNotice("Unable to reset password.");
      }
    });
  });

  if (!hasRequiredTokenData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Reset link is missing required details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            This reset link is invalid. Request a new password reset email.
          </p>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Request new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Choose a strong new password for your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("email")} />
          <input type="hidden" {...form.register("token")} />

          <div className="space-y-2">
            <Label htmlFor="reset-password-password">New password</Label>
            <Input
              id="reset-password-password"
              type="password"
              autoComplete="new-password"
              disabled={isPending || isSuccess}
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
            <Label htmlFor="reset-password-confirm-password">Confirm password</Label>
            <Input
              id="reset-password-confirm-password"
              type="password"
              autoComplete="new-password"
              disabled={isPending || isSuccess}
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {notice ? (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                isSuccess
                  ? "border border-gold/35 bg-gold/10 text-gold"
                  : "border border-primary/40 bg-primary/10 text-primary"
              }`}
            >
              {notice}
            </p>
          ) : null}

          {!isSuccess ? (
            <Button disabled={isPending} type="submit" className="w-full">
              {isPending ? "Updating password..." : "Update password"}
            </Button>
          ) : null}
        </form>

        <p className="text-sm text-muted">
          Return to{" "}
          <Link href="/login" className="text-primary hover:underline">
            sign in
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
