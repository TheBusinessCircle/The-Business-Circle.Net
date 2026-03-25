import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { inviteCode } = await params;
  const normalizedInviteCode = inviteCode.trim().toUpperCase();

  if (!normalizedInviteCode) {
    redirect("/join");
  }

  redirect(`/join?invite=${encodeURIComponent(normalizedInviteCode)}`);
}
