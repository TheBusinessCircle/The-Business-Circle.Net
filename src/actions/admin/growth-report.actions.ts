"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { generateGrowthReportNow } from "@/server/admin/growth-report.service";

export async function refreshGrowthReportNowAction() {
  await requireAdmin();
  await generateGrowthReportNow();
  revalidatePath("/admin/growth-intelligence");
}
