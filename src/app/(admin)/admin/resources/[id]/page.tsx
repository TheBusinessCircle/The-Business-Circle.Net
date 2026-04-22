import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  toDateTimeLocalValue,
  updateResourceFromEditorAction
} from "@/actions/admin/resource-cms.actions";
import { ResourceEditorForm } from "@/components/admin/resources/resource-editor-form";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Edit Resource",
  description: "Edit resource metadata, content, and scheduling.",
  path: "/admin/resources"
});

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "draft-saved": "Resource saved as draft.",
    scheduled: "Resource scheduled.",
    published: "Resource published."
  };

  const errorMap: Record<string, string> = {
    invalid: "The submitted resource payload was invalid.",
    "invalid-category": "The selected category does not belong to that tier.",
    "invalid-slug": "Please provide a title or slug that resolves to a valid URL slug.",
    "slug-exists": "That slug already exists for another resource.",
    "not-found": "The requested resource could not be found.",
    "invalid-schedule": "The schedule date could not be parsed.",
    "invalid-length": "Scheduled and published resources must be between 600 and 1200 words.",
    "invalid-structure": "The article must include Reality, Breakdown, Shift, and Next step headings.",
    "invalid-tone": "The article content still includes banned punctuation or tone markers."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function AdminResourceDetailsPage({
  params,
  searchParams
}: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const parsedSearchParams = await searchParams;

  const resource = await db.resource.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      tier: true,
      category: true,
      type: true,
      content: true,
      status: true,
      scheduledFor: true
    }
  });

  if (!resource) {
    notFound();
  }

  const feedback = feedbackMessage({
    notice: firstValue(parsedSearchParams.notice),
    error: firstValue(parsedSearchParams.error)
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/resources" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} />
          Back to Resource Manager
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold">Edit Resource</h1>
        <p className="text-sm text-muted">
          Update the article, tier, category, and publication timing.
        </p>
      </div>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <ResourceEditorForm
        mode="edit"
        action={updateResourceFromEditorAction}
        returnPath={`/admin/resources/${resource.id}`}
        initialValues={{
          resourceId: resource.id,
          title: resource.title,
          slug: resource.slug,
          excerpt: resource.excerpt,
          coverImage: resource.coverImage ?? "",
          tier: resource.tier,
          category: resource.category,
          type: resource.type,
          content: resource.content,
          status: resource.status,
          scheduledFor: toDateTimeLocalValue(resource.scheduledFor)
        }}
      />
    </div>
  );
}
