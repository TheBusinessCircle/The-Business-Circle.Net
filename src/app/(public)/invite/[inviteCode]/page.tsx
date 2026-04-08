import { redirect } from "next/navigation";
import { buildJoinConfirmationRedirect } from "@/lib/join/routing";

type PageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { inviteCode } = await params;
  const normalizedInviteCode = inviteCode.trim().toUpperCase();

  if (!normalizedInviteCode) {
    redirect("/join?auth=register");
  }

  redirect(
    buildJoinConfirmationRedirect({
      invite: normalizedInviteCode,
      auth: "register"
    })
  );
}
