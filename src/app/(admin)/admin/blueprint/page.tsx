import type { Metadata } from "next";
import { BlueprintManager } from "@/components/admin/blueprint-manager";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getBlueprintManagerData } from "@/server/blueprint";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Blueprint Manager",
  description: "Manage The Circle Blueprint roadmap.",
  path: "/admin/blueprint"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "blueprint-saved": "Blueprint saved. The front-facing page now reflects the latest order and content.",
    "blueprint-votes-reset": "Votes reset for that Blueprint card."
  };
  const errorMap: Record<string, string> = {
    "blueprint-save-invalid": "The Blueprint could not be saved because some content is missing or too long.",
    "blueprint-save-invalid-json": "The Blueprint payload could not be read.",
    "blueprint-reset-invalid": "Votes could not be reset for that card."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function AdminBlueprintPage({ searchParams }: PageProps) {
  const session = await requireAdmin();
  const params = await searchParams;
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const data = await getBlueprintManagerData({
    viewerUserId: session.user.id,
    viewerRole: session.user.role,
    viewerTier: session.user.membershipTier
  });

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            feedback.type === "notice"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
          )}
        >
          {feedback.message}
        </div>
      ) : null}
      <BlueprintManager initialData={data} />
    </div>
  );
}
