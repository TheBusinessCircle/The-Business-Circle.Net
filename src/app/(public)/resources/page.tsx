import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/utils";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";

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

  await requireUser();

  redirect("/dashboard/resources");
}
