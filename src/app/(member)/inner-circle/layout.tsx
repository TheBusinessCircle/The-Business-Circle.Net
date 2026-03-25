import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";

export default async function InnerCircleLayout({
  children
}: {
  children: ReactNode;
}) {
  await requireUser();

  return <div className="space-y-6">{children}</div>;
}
