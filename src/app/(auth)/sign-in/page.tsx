import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sign In Redirect",
  description: "Redirecting to the Business Circle sign in page.",
  path: "/sign-in",
  noIndex: true
});

export default function SignInPage() {
  redirect("/login");
}
