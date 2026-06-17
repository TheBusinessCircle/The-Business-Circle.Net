import { redirect } from "next/navigation";

export default async function InvitePage() {
  redirect("/join?auth=register");
}
