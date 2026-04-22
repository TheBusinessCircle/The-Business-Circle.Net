import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createResourceFromEditorAction } from "@/actions/admin/resource-cms.actions";
import { ResourceEditorForm } from "@/components/admin/resources/resource-editor-form";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = createPageMetadata({
  title: "Create Resource",
  description: "Create a new resource with tier, schedule, and markdown content.",
  path: "/admin/resources/new"
});

const DEFAULT_CONTENT = `Most businesses do not have a lack of effort. They have a lack of clarity around what matters now.

## Reality

Say what is actually happening in plain language. Keep it direct.

## Breakdown

### What people usually miss

Explain the pattern underneath the obvious symptom.

### Why it keeps happening

Show the real cause, not the surface complaint.

### What it costs

Be practical about the impact.

## Shift

Show what needs to change in the way the business is being seen or run.

## Next step

1. Give one useful action.
2. Give a second action.
3. Give a final action that creates momentum.`;

export default async function AdminNewResourcePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/resources" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} />
          Back to Resource Manager
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold">Create Resource</h1>
        <p className="text-sm text-muted">
          Draft, schedule, or publish a new resource directly into the editorial system.
        </p>
      </div>

      <ResourceEditorForm
        mode="create"
        action={createResourceFromEditorAction}
        returnPath="/admin/resources/new"
        initialValues={{
          title: "",
          slug: "",
          excerpt: "",
          coverImage: "",
          tier: "FOUNDATION",
          category: "Getting Started",
          type: "CLARITY",
          content: DEFAULT_CONTENT,
          status: "DRAFT",
          scheduledFor: ""
        }}
      />
    </div>
  );
}
