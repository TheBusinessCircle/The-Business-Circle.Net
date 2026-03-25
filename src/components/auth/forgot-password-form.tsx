"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordResetRequestSchema } from "@/lib/auth/schemas";

const formSchema = passwordResetRequestSchema;
type Values = z.infer<typeof formSchema>;

type ForgotPasswordApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof Values, string[]>>;
};

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);
    setIsSuccess(false);
    form.clearErrors();

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(values)
        });

        const payload = (await response.json().catch(() => ({}))) as ForgotPasswordApiResponse;

        if (!response.ok || !payload.ok) {
          const emailError = payload.fieldErrors?.email?.[0];
          if (emailError) {
            form.setError("email", {
              type: "server",
              message: emailError
            });
          }

          setNotice(payload.error ?? "Unable to process password reset right now.");
          return;
        }

        setIsSuccess(true);
        setNotice(
          payload.message ??
            "If an account exists with that email, a password reset link has been sent."
        );
      } catch {
        setNotice("Unable to process password reset right now.");
      }
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          Enter your email address and we will send a secure reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              disabled={isPending}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
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

          <Button disabled={isPending} type="submit" className="w-full">
            {isPending ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>

        <p className="text-sm text-muted">
          Back to{" "}
          <Link href="/login" className="text-primary hover:underline">
            sign in
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
