import { redirect } from "next/navigation";
import { buildMembershipSelectionRedirect } from "@/lib/join/routing";

type PageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { inviteCode } = await params;
  const normalizedInviteCode = inviteCode.trim().toUpperCase();

  if (!normalizedInviteCode) {
    redirect("/membership?auth=register");
  }

  redirect(
    buildMembershipSelectionRedirect({
      invite: normalizedInviteCode,
      auth: "register"
    })
  );
}
