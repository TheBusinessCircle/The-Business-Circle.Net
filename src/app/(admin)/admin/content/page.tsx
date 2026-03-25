import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Content Redirect",
  description: "Redirecting to Business Circle site content management.",
  path: "/admin/content",
  noIndex: true
});

export default function AdminContentRedirectPage() {
  redirect("/admin/site-content");
}
