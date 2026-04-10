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
import { resolveAuthErrorMessage } from "@/lib/auth/client";
import { type CredentialsSignInInput, credentialsSignInSchema } from "@/lib/auth/schemas";
import { safeRedirectPath } from "@/lib/auth/utils";

type LoginFormProps = {
  from?: string;
  errorCode?: string;
  errorDetailCode?: string;
  initialNotice?: string;
  initialEmail?: string;
};

function withFrom(pathname: string, from?: string) {
  const target = from ? safeRedirectPath(from, "") : "";
  if (!target) {
    return pathname;
  }

  const params = new URLSearchParams({ from: target });
  return `${pathname}?${params.toString()}`;
}

export function LoginForm({
  from,
  errorCode,
  errorDetailCode,
  initialNotice,
  initialEmail
}: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(
    initialNotice ?? resolveAuthErrorMessage(errorCode, errorDetailCode)
  );
  const targetPath = useMemo(() => safeRedirectPath(from), [from]);

  const form = useForm<CredentialsSignInInput>({
    resolver: zodResolver(credentialsSignInSchema),
    defaultValues: {
      email: initialEmail ?? "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false
      });

      if (result?.error) {
        setNotice(resolveAuthErrorMessage(result.error, result.code));
        return;
      }

      router.push(targetPath);
      router.refresh();
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Access your dashboard, resources, and founder network.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {notice ? (
          <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            {notice}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button disabled={isPending} type="submit" className="w-full">
            {isPending ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <p className="text-sm text-muted">
          Need an account?{" "}
          <Link href={withFrom("/membership", from)} className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
