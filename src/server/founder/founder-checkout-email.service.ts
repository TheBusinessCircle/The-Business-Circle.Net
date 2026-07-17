import { FounderServiceEmailLogStatus } from "@prisma/client";
import { createElement } from "react";
import { FounderServiceCheckoutEmail } from "@/emails/founder-service-checkout";
import { renderEmailHtml } from "@/emails/render";
import { db } from "@/lib/db";
import { sendTransactionalEmailOrThrow } from "@/lib/email/resend";
import { createFounderServiceCheckoutSession } from "@/server/founder/founder-payment.service";

type SendFounderServiceCheckoutEmailInput = {
  requestId: string;
  subject: string;
  body: string;
  ctaLabel: string;
  adminDiscountCodeId?: string | null;
};

export function defaultFounderServiceCheckoutSubject(serviceName: string) {
  if (/clarity audit/i.test(serviceName)) {
    return "Your BCN Clarity Audit checkout link";
  }

  if (/growth architect/i.test(serviceName)) {
    return "Your Growth Architect checkout link";
  }

  return "Your Founder Services checkout link";
}

export function defaultFounderServiceCheckoutBody(input: {
  firstName: string;
  serviceName: string;
}) {
  return [
    `Hi ${input.firstName || "there"},`,
    "",
    `Thanks for reaching out about ${input.serviceName}.`,
    "",
    "I have reviewed your request and this is the right next step based on what you selected.",
    "",
    "You can secure the service using the button below. Once payment is complete, I will pick this up from the admin side and move you into the next stage.",
    "",
    "If you have any questions before going ahead, just reply to this email.",
    "",
    "Thanks,",
    "Trevor Newton",
    "Founder, The Business Circle Network"
  ].join("\n");
}

export async function sendFounderServiceCheckoutEmail(
  input: SendFounderServiceCheckoutEmailInput
) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  const ctaLabel = input.ctaLabel.trim() || "Secure your place";

  if (!subject || !body) {
    throw new Error("checkout-email-content-missing");
  }

  const request = await db.founderServiceRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      fullName: true,
      email: true,
      amount: true,
      currency: true,
      service: {
        select: {
          title: true,
          stripePriceId: true
        }
      }
    }
  });

  if (!request) {
    throw new Error("request-not-found");
  }

  if (!request.email.trim()) {
    throw new Error("checkout-email-address-missing");
  }

  if (!request.service.stripePriceId?.trim()) {
    throw new Error("checkout-email-price-missing");
  }

  const discountCode = input.adminDiscountCodeId
    ? await db.founderServiceDiscountCode.findUnique({
        where: { id: input.adminDiscountCodeId },
        select: { id: true, code: true }
      })
    : null;

  const draftLog = await db.founderServiceEmailLog.create({
    data: {
      founderServiceRequestId: request.id,
      toEmail: request.email,
      subject,
      bodySnapshot: body,
      serviceName: request.service.title,
      priceAmount: request.amount,
      currency: request.currency,
      discountCode: discountCode?.code ?? null,
      status: FounderServiceEmailLogStatus.DRAFT
    }
  });

  try {
    const checkout = await createFounderServiceCheckoutSession(request.id, {
      adminDiscountCodeId: discountCode?.id ?? null,
      markCheckoutLinkSent: true
    });
    const html = await renderEmailHtml(
      createElement(FounderServiceCheckoutEmail, {
        recipientName: request.fullName,
        body,
        serviceName: request.service.title,
        priceAmount: request.amount,
        currency: request.currency,
        discountCode: discountCode?.code ?? null,
        checkoutUrl: checkout.url,
        ctaLabel
      })
    );

    await sendTransactionalEmailOrThrow({
      brand: "bcn",
      to: request.email,
      subject,
      html,
      text: `${body}\n\n${ctaLabel}: ${checkout.url}`,
      tags: [
        { name: "kind", value: "founder_service_checkout" },
        { name: "request", value: request.id }
      ]
    });

    return db.founderServiceEmailLog.update({
      where: { id: draftLog.id },
      data: {
        status: FounderServiceEmailLogStatus.SENT,
        stripeCheckoutSessionId: checkout.id,
        stripeCheckoutUrl: checkout.url,
        sentAt: new Date()
      }
    });
  } catch (error) {
    await db.founderServiceEmailLog.update({
      where: { id: draftLog.id },
      data: {
        status: FounderServiceEmailLogStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown checkout email error."
      }
    });

    throw error;
  }
}
