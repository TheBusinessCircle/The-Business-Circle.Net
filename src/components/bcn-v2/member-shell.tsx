import type { ReactNode } from "react";
import Link from "next/link";
import { BcnShell } from "./shell";
import { requireUser } from "@/lib/session";
import { getDirectMessageNavCounts } from "@/server/messages";
import { signOutAction } from "@/lib/actions/auth-actions";
export async function BcnMemberShell({ children }: { children: ReactNode }) {
  const session = await requireUser({ allowUnentitled: true });
  const messageCounts = await getDirectMessageNavCounts(session.user.id);
  const inboxCount =
    messageCounts.unreadCount + messageCounts.pendingRequestCount;
  return (
    <BcnShell>
      <section className="v2-section">
        <div className="v2-wrap">
          <nav className="v2-dashboard-nav" aria-label="Account navigation">
            <Link href="/dashboard">Your dashboard</Link>
            <Link href="/messages">
              Private chats{inboxCount > 0 ? ` (${inboxCount} new)` : ""}
            </Link>
            <Link href="/ideas/mine">My requests & offers</Link>
            <Link href="/profile">Your free profile</Link>
            <Link href="/business-directory">Business directory</Link>
            <Link href="/find-help">Request help</Link>
            {session.user.hasActiveSubscription && (
              <Link href="/dashboard?view=legacy">
                Existing member services
              </Link>
            )}
            {session.user.role === "ADMIN" && (
              <>
                <Link href="/admin/bcn-help">Manage BCN help</Link>
                <Link href="/admin/bcn-ideas">Moderate practical help</Link>
              </>
            )}
            <form action={signOutAction}>
              <button type="submit">Sign out</button>
            </form>
          </nav>
          {children}
        </div>
      </section>
    </BcnShell>
  );
}
