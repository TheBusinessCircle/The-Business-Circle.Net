import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Join Redirect",
  description: "Redirecting to the Business Circle join page.",
  path: "/sign-up",
  noIndex: true
});

export default function SignUpPage() {
  redirect("/join");
}
