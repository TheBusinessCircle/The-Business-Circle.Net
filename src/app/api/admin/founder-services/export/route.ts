import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import {
  formatFounderClientStageLabel,
  formatFounderMembershipTierLabel,
  formatFounderPaymentStatusLabel,
  formatFounderRevenueRangeLabel,
  formatFounderServicePrice,
  formatFounderServiceStatusLabel
} from "@/lib/founder";
import { formatDateTime } from "@/lib/utils";
import { exportFounderServiceRequests } from "@/server/founder";

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

  const requests = await exportFounderServiceRequests();
  const lines = [
    [
      "Request ID",
      "Submitted At",
      "Updated At",
      "Customer Name",
      "Email",
      "Phone",
      "Business Name",
      "Business Stage",
      "Service Owner",
      "Source Page",
      "Source Section",
      "Website",
      "Industry",
      "Location",
      "Years In Business",
      "Employee Count",
      "Revenue Range",
      "Service Title",
      "Service Slug",
      "Base Price",
      "Final Price",
      "Membership Discount Percent",
      "Membership Tier",
      "Discount Label",
      "Payment Status",
      "Service Status",
      "Pipeline Stage",
      "Help Summary",
      "Audit Start",
      "Audit Deadline",
      "Call Date",
      "Checkout Link",
      "Audit Checklist Complete",
      "Call Completed",
      "Follow Up Sent",
      "Manual Discount Code",
      "Admin Notes",
      "Linked User ID",
      "Linked User Email"
    ].map(escapeCsvValue).join(",")
  ];

  for (const request of requests) {
    lines.push(
      [
        request.id,
        formatDateTime(request.createdAt),
        formatDateTime(request.updatedAt),
        request.fullName,
        request.email,
        request.phone,
        request.businessName,
        request.businessStage ?? "",
        request.serviceOwner,
        request.sourcePage ?? "",
        request.sourceSection ?? "",
        request.website,
        request.industry,
        request.location,
        request.yearsInBusiness,
        request.employeeCount,
        formatFounderRevenueRangeLabel(request.revenueRange),
        request.service.title,
        request.service.slug,
        formatFounderServicePrice(request.baseAmount, request.currency),
        formatFounderServicePrice(request.amount, request.currency),
        request.membershipDiscountPercent,
        formatFounderMembershipTierLabel(request.membershipTierApplied),
        request.discountLabel ?? "",
        formatFounderPaymentStatusLabel(request.paymentStatus),
        formatFounderServiceStatusLabel(request.serviceStatus),
        formatFounderClientStageLabel(request.pipelineStage),
        request.helpSummary,
        request.auditStartAt ? formatDateTime(request.auditStartAt) : "",
        request.auditDueAt ? formatDateTime(request.auditDueAt) : "",
        request.callScheduledAt ? formatDateTime(request.callScheduledAt) : "",
        request.checkoutUrl ?? "",
        request.taskAuditChecklistComplete ? "Yes" : "No",
        request.taskCallCompleted ? "Yes" : "No",
        request.taskFollowUpSent ? "Yes" : "No",
        request.adminDiscountCode?.code ?? "",
        request.adminNotes ?? "",
        request.user?.id ?? "",
        request.user?.email ?? ""
      ].map(escapeCsvValue).join(",")
    );
  }

  const filename = `founder-service-requests-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
