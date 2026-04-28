import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinCompletionStatus } from "@/components/auth/join-completion-status";
import { getPendingRegistrationStatusByCheckoutSessionId } from "@/lib/auth/register";
import { createPageMetadata } from "@/lib/seo";

type JoinCompletePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Join Confirmation",
  description:
    "Confirm payment for The Business Circle and complete member access setup.",
  path: "/join/complete",
  noIndex: true
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JoinCompletePage({
  searchParams
}: JoinCompletePageProps) {
  const params = await searchParams;
  const sessionId = firstValue(params.session_id)?.trim() ?? "";

  if (!sessionId) {
    redirect("/join");
  }

  const initialStatus = await getPendingRegistrationStatusByCheckoutSessionId(sessionId);

  return (
    <div className="space-y-20 pb-28 lg:space-y-28 lg:pb-36">
      <JoinCompletionStatus sessionId={sessionId} initialStatus={initialStatus} />
    </div>
  );
}
