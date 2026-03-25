import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { formatDateTime } from "@/lib/utils";
import { listFoundingMembers } from "@/server/founding";

export const runtime = "nodejs";

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replaceAll("\"", "\"\"")}"`;
}

export async function GET() {
  const authResult = await requireApiUser({ adminOnly: true, allowUnentitled: true });
  if ("response" in authResult) {
    return authResult.response;
  }

  const { members } = await listFoundingMembers();
  const lines = [
    [
      "User ID",
      "Name",
      "Email",
      "Founding Tier",
      "Founding Price",
      "Claimed At",
      "Current Membership Tier",
      "Joined At",
      "Subscription Record ID"
    ].map(escapeCsvValue).join(",")
  ];

  for (const member of members) {
    lines.push(
      [
        member.user.id,
        member.user.name ?? "",
        member.user.email,
        member.tier,
        `£${member.foundingPrice}/month`,
        formatDateTime(member.claimedAt),
        member.user.membershipTier,
        formatDateTime(member.user.createdAt),
        member.subscriptionId ?? ""
      ].map(escapeCsvValue).join(",")
    );
  }

  const filename = `founding-members-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
