import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Forgot Password",
  description: "Request a secure password reset link for your Business Circle account.",
  path: "/forgot-password",
  noIndex: true
});

export default function ForgotPasswordPage() {
  return (
    <div className="grid w-full min-w-0 gap-6 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:px-8 2xl:px-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            Recover access to your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted">
          <p>
            Request a secure password reset link and set a new password in minutes.
          </p>
          <p>
            If you still cannot access your account, contact{" "}
            <Link href="/contact" className="text-primary hover:underline">
              support
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <ForgotPasswordForm />
    </div>
  );
}
