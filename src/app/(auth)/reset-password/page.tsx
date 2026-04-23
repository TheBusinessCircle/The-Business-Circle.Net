import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = createPageMetadata({
  title: "Reset Password",
  description: "Set a new password for your Business Circle account.",
  path: "/reset-password",
  noIndex: true
});

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = firstValue(params.token);
  const email = firstValue(params.email);

  return (
    <div className="grid w-full min-w-0 gap-6 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:px-8 2xl:px-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            Set a new account password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted">
          <p>Use a strong password you have not used before on this account.</p>
          <p>
            Return to{" "}
            <Link href="/login" className="text-primary hover:underline">
              sign in
            </Link>{" "}
            once your password is updated.
          </p>
        </CardContent>
      </Card>

      <ResetPasswordForm token={token} email={email} />
    </div>
  );
}
