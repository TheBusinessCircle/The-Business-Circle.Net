import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCircleCardOwner } from "@/server/circle-card/owner.service";
import type { CustomBuildOrder } from "@/lib/circle-card/custom-build";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom design orders", robots: { index: false, follow: false } };
async function updateProgress(form: FormData) {
  "use server";
  const actorUserId = await requireCircleCardOwner("canManageComplimentaryPro");
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(id) || !["QUEUED","IN_PROGRESS","COMPLETE"].includes(status)) throw new Error("Invalid design progress.");
  await prisma.$transaction(async tx => {
    const [row] = await tx.$queryRaw<CustomBuildOrder[]>`SELECT * FROM "CircleCardCustomBuildOrder" WHERE "id"=${id} FOR UPDATE`;
    if (!row || row.paymentStatus !== "PAID") throw new Error("A paid order is required.");
    // Recheck operator authority at the point of mutation.
    await requireCircleCardOwner("canManageComplimentaryPro");
    await tx.$executeRaw`UPDATE "CircleCardCustomBuildOrder" SET "buildStatus"=${status}, "updatedAt"=now() WHERE "id"=${id}`;
    await tx.circleCardOwnerAudit.create({ data: {
      actorUserId, targetUserId: row.userId, action: "CUSTOM_BUILD_PROGRESS_CHANGED",
      reason: "Custom design fulfilment progress updated.",
      previousState: { orderId: id, buildStatus: row.buildStatus } as Prisma.InputJsonValue,
      nextState: { orderId: id, buildStatus: status } as Prisma.InputJsonValue
    } });
  });
  revalidatePath("/app/owner/custom-builds");
  revalidatePath("/app/upgrades/custom-build");
}
export default async function CustomBuildQueuePage() {
  await requireCircleCardOwner("canViewMembers");
  await requireCircleCardOwner("canViewPayments");
  const rows = await prisma.$queryRaw<Array<CustomBuildOrder & { email: string; cardName: string; slug: string }>>`
    SELECT o.*, u."email", c."fullName" AS "cardName", c."slug"
    FROM "CircleCardCustomBuildOrder" o
    JOIN "User" u ON u."id"=o."userId" JOIN "CircleCard" c ON c."id"=o."cardId"
    ORDER BY CASE WHEN o."paymentStatus"='PAID' AND o."buildStatus"<>'COMPLETE' THEN 0 ELSE 1 END,
      o."createdAt" DESC LIMIT 100`;
  await requireCircleCardOwner("canViewPayments");
  return <div className="space-y-5"><header><Link className="text-sm text-cyan-200" href="/app/owner">Owner dashboard</Link><h1 className="mt-2 text-3xl font-semibold">Custom design orders</h1><p className="mt-3 text-sm text-slate-300">£49.99 per card. Prepare the approved custom design for the specified card, then mark it complete. Progress controls do not publish or alter a card.</p></header>
    {!rows.length ? <p>No custom design orders yet.</p> : rows.map(row => <section key={row.id} className="space-y-3 rounded-2xl border border-white/15 p-5">
      <h2 className="text-lg font-semibold">{row.cardName}</h2><p className="break-all text-sm text-slate-300">{row.email}</p><p className="text-sm text-gold">{row.paymentStatus} · {row.buildStatus}</p>
      <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{row.brief}</p>
      <Link className="inline-flex min-h-11 items-center text-sm text-cyan-200 underline" href={`/app/owner/members/${encodeURIComponent(row.userId)}`}>View member and cards</Link>
      {row.paymentStatus === "PAID" ? <form action={updateProgress} className="flex flex-wrap gap-3"><input type="hidden" name="id" value={row.id}/><select name="status" defaultValue={row.buildStatus === "AWAITING_PAYMENT" ? "QUEUED" : row.buildStatus} className="min-h-11 rounded-lg bg-[#10203b] px-3"><option value="QUEUED">Queued</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETE">Complete</option></select><button className="min-h-11 rounded-lg border border-white/20 px-4 text-sm">Save progress</button></form> : null}
    </section>)}
  </div>;
}
