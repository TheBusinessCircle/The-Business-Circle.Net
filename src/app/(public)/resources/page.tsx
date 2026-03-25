import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/utils";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Resources",
  description: "Business Circle resources are available inside the member dashboard.",
  path: "/resources",
  noIndex: true
});

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?from=${encodeURIComponent(safeRedirectPath("/dashboard/resources"))}`);
  }

  if (session.user.suspended) {
    redirect("/login?error=suspended");
  }

  if (session.user.role !== "ADMIN" && !session.user.hasActiveSubscription) {
    redirect("/membership?billing=required");
  }

  redirect("/dashboard/resources");
}
