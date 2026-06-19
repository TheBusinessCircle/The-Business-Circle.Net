import { redirect } from "next/navigation";
import { buildJoinConfirmationRedirect } from "@/lib/join/routing";

type InvitePageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { inviteCode } = await params;

  redirect(
    buildJoinConfirmationRedirect({
      auth: "register",
      invite: inviteCode
    })
  );
}
