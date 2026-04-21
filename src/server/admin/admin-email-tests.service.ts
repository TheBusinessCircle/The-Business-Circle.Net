import { MembershipTier } from "@prisma/client";
import { createElement } from "react";
import { z } from "zod";
import {
  BillingReceiptEmail,
  ContactNotificationEmail,
  ContactReceiptEmail,
  InnerCircleUpgradeEmail,
  PasswordChangedEmail,
  PasswordResetEmail,
  VerifyEmailAddressEmail,
  WelcomeMemberEmail
} from "@/emails";
import { renderEmailHtml } from "@/emails/render";
import { buildBrandedEmailText } from "@/emails/text";
import { sendTransactionalEmailOrThrow } from "@/lib/email/resend";
import { absoluteUrl, getBaseUrl } from "@/lib/utils";

export const ADMIN_EMAIL_TEST_TYPE_IDS = [
  "verification-email",
  "welcome-member-email",
  "billing-receipt-email",
  "password-reset-email",
  "password-changed-email",
  "contact-auto-reply-email",
  "contact-admin-notification-email",
  "inner-circle-upgrade-email"
] as const;

export const adminEmailTestRequestSchema = z.object({
  emailType: z.enum(ADMIN_EMAIL_TEST_TYPE_IDS),
  recipientEmail: z.string().trim().email().max(320)
});

export type AdminEmailTestTypeId = (typeof ADMIN_EMAIL_TEST_TYPE_IDS)[number];

export type AdminEmailTestDefinition = {
  id: AdminEmailTestTypeId;
  label: string;
  categoryLabel: "CTA email" | "Information email" | "Receipt email";
  description: string;
  purpose: string;
  scenarioName: string;
  subjectPreview: string;
  includesCta: boolean;
  includesFallbackLink: boolean;
};

type BuiltAdminEmailTestPayload = {
  definition: AdminEmailTestDefinition;
  subject: string;
  text: string;
  html: string;
  react: ReturnType<typeof createElement>;
};

type SendAdminEmailTestInput = {
  adminUserId: string;
  emailType: AdminEmailTestTypeId;
  recipientEmail: string;
};

function buildVerificationPreviewUrl() {
  const url = new URL("/api/auth/verify-email", getBaseUrl());
  url.searchParams.set("uid", "test_member_preview");
  url.searchParams.set("token", "bcn_test_preview_token_do_not_use");
  url.searchParams.set("preview", "1");
  return url.toString();
}

function buildPasswordResetPreviewUrl() {
  const url = new URL("/reset-password", getBaseUrl());
  url.searchParams.set("email", "preview@businesscircle.network");
  url.searchParams.set("token", "bcn_test_preview_token_do_not_use");
  url.searchParams.set("preview", "1");
  return url.toString();
}

function buildDefinitionMap(): Record<AdminEmailTestTypeId, AdminEmailTestDefinition> {
  return {
    "verification-email": {
      id: "verification-email",
      label: "Verification email",
      categoryLabel: "CTA email",
      description: "Tests the branded confirmation email sent to new members and resends.",
      purpose: "Checks the premium verification flow, CTA button, fallback link, and expiry notes.",
      scenarioName: "New member verification preview",
      subjectPreview: "BCN Test | Verify your Business Circle email",
      includesCta: true,
      includesFallbackLink: true
    },
    "welcome-member-email": {
      id: "welcome-member-email",
      label: "Welcome member email",
      categoryLabel: "CTA email",
      description: "Tests the welcome message sent once a member is provisioned successfully.",
      purpose: "Checks the post-join welcome tone, dashboard CTA, and overall first-impression layout.",
      scenarioName: "New Inner Circle member welcome preview",
      subjectPreview: "BCN Test | Welcome to The Business Circle",
      includesCta: true,
      includesFallbackLink: true
    },
    "billing-receipt-email": {
      id: "billing-receipt-email",
      label: "Billing receipt email",
      categoryLabel: "Receipt email",
      description: "Tests the Stripe-backed receipt styling for successful membership payments.",
      purpose: "Checks amount clarity, receipt tone, and dashboard CTA after payment.",
      scenarioName: "Inner Circle annual payment receipt preview",
      subjectPreview: "BCN Test | Your Business Circle billing receipt",
      includesCta: true,
      includesFallbackLink: true
    },
    "password-reset-email": {
      id: "password-reset-email",
      label: "Password reset email",
      categoryLabel: "CTA email",
      description: "Tests the secure password reset email with expiry guidance.",
      purpose: "Checks the reset CTA, fallback link, and security messaging.",
      scenarioName: "Password reset request preview",
      subjectPreview: "BCN Test | Reset your Business Circle password",
      includesCta: true,
      includesFallbackLink: true
    },
    "password-changed-email": {
      id: "password-changed-email",
      label: "Password changed email",
      categoryLabel: "CTA email",
      description: "Tests the follow-up security email sent after a password change succeeds.",
      purpose: "Checks the sign-in CTA and security reassurance copy.",
      scenarioName: "Password changed confirmation preview",
      subjectPreview: "BCN Test | Your password was changed",
      includesCta: true,
      includesFallbackLink: true
    },
    "contact-auto-reply-email": {
      id: "contact-auto-reply-email",
      label: "Contact auto-reply email",
      categoryLabel: "Information email",
      description: "Tests the member-facing acknowledgement email sent after a contact form submission.",
      purpose: "Checks calm acknowledgement copy and no-CTA information layout.",
      scenarioName: "Founder enquiry acknowledgement preview",
      subjectPreview: "BCN Test | We received your message",
      includesCta: false,
      includesFallbackLink: false
    },
    "contact-admin-notification-email": {
      id: "contact-admin-notification-email",
      label: "Contact admin notification email",
      categoryLabel: "Information email",
      description: "Tests the internal admin notification for a new website contact enquiry.",
      purpose: "Checks structured enquiry details and message readability for admin triage.",
      scenarioName: "Founder enquiry admin notification preview",
      subjectPreview: "BCN Test | New contact enquiry: Founder strategy session enquiry",
      includesCta: false,
      includesFallbackLink: false
    },
    "inner-circle-upgrade-email": {
      id: "inner-circle-upgrade-email",
      label: "Inner Circle upgrade email",
      categoryLabel: "CTA email",
      description: "Tests the premium upgrade confirmation for Inner Circle access.",
      purpose: "Checks the upgrade messaging and direct CTA into the Inner Circle experience.",
      scenarioName: "Inner Circle upgrade confirmation preview",
      subjectPreview: "BCN Test | Your Inner Circle access is now active",
      includesCta: true,
      includesFallbackLink: true
    }
  };
}

const ADMIN_EMAIL_TEST_DEFINITIONS = buildDefinitionMap();

function commonPreviewNoteLines() {
  return [
    "This is a safe internal BCN preview email for layout and delivery testing only.",
    "Any links in this test email use non-destructive preview data and do not affect a live member account."
  ];
}

async function buildAdminEmailTestPayload(
  emailType: AdminEmailTestTypeId
): Promise<BuiltAdminEmailTestPayload> {
  const definition = ADMIN_EMAIL_TEST_DEFINITIONS[emailType];
  const verificationUrl = buildVerificationPreviewUrl();
  const resetUrl = buildPasswordResetPreviewUrl();
  const dashboardUrl = absoluteUrl("/dashboard?email-test=1");
  const innerCircleUrl = absoluteUrl("/inner-circle?email-test=1");
  const loginUrl = absoluteUrl("/login?email-test=1");

  switch (emailType) {
    case "verification-email": {
      const react = createElement(VerifyEmailAddressEmail, {
        firstName: "Trevor",
        verificationUrl,
        ttlHours: 48
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          greeting: "Hi Trevor,",
          eyebrow: "Email verification",
          heading: "Confirm your email address",
          bodyLines: [
            "You are one step away from full access to The Business Circle Network.",
            "Confirm your email address to unlock your member access and continue inside the platform."
          ],
          ctaLabel: "Verify your email",
          ctaUrl: verificationUrl,
          fallbackNotice: "If the button does not work, copy and paste the link above into your browser.",
          noteLines: [
            "This verification link expires in 48 hours.",
            "For security, only the most recent verification email remains valid. Older links expire automatically.",
            ...commonPreviewNoteLines()
          ]
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
    case "welcome-member-email": {
      const react = createElement(WelcomeMemberEmail, {
        firstName: "Trevor",
        tier: MembershipTier.INNER_CIRCLE,
        dashboardUrl
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          greeting: "Hi Trevor,",
          eyebrow: "Welcome to BCN",
          heading: "Your membership is now live",
          bodyLines: [
            "Welcome to The Business Circle Network. Your membership tier is Inner Circle.",
            "You can now log in to access your dashboard, resources, and community discussions.",
            "Start with one clear move inside the platform and let the rest build from there.",
            ...commonPreviewNoteLines()
          ],
          ctaLabel: "Open your dashboard",
          ctaUrl: dashboardUrl,
          fallbackNotice: "If the button does not work, copy and paste the link above into your browser."
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
    case "billing-receipt-email": {
      const react = createElement(BillingReceiptEmail, {
        firstName: "Trevor",
        amount: "£249.00",
        planName: "Inner Circle Annual Membership",
        dashboardUrl
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          greeting: "Hi Trevor,",
          eyebrow: "Billing receipt",
          heading: "Your payment has been received",
          bodyLines: [
            "We have received your payment of £249.00 for Inner Circle Annual Membership.",
            "Thank you for being part of The Business Circle Network.",
            ...commonPreviewNoteLines()
          ],
          ctaLabel: "Open your dashboard",
          ctaUrl: dashboardUrl,
          fallbackNotice: "If the button does not work, copy and paste the link above into your browser."
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
    case "password-reset-email": {
      const react = createElement(PasswordResetEmail, {
        firstName: "Trevor",
        resetUrl,
        ttlMinutes: 60
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          greeting: "Hi Trevor,",
          eyebrow: "Password reset",
          heading: "Reset your password",
          bodyLines: [
            "We received a request to reset your password.",
            "Use the secure link below to set a new password and return to the platform."
          ],
          ctaLabel: "Reset your password",
          ctaUrl: resetUrl,
          fallbackNotice: "If the button does not work, copy and paste the link above into your browser.",
          noteLines: [
            "This reset link expires in 60 minutes.",
            "If you did not request this, you can safely ignore this email.",
            ...commonPreviewNoteLines()
          ]
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
    case "password-changed-email": {
      const react = createElement(PasswordChangedEmail, {
        firstName: "Trevor",
        loginUrl
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          greeting: "Hi Trevor,",
          eyebrow: "Security update",
          heading: "Your password was changed",
          bodyLines: [
            "Your password was changed successfully.",
            "You can now sign back in to The Business Circle Network.",
            ...commonPreviewNoteLines()
          ],
          ctaLabel: "Sign in",
          ctaUrl: loginUrl,
          fallbackNotice: "If the button does not work, copy and paste the link above into your browser.",
          noteLines: ["If this was not you, contact support immediately."]
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
    case "contact-auto-reply-email": {
      const react = createElement(ContactReceiptEmail, {
        firstName: "Trevor",
        subject: "Founder strategy session enquiry",
        sourcePath: "/contact"
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          greeting: "Hi Trevor,",
          eyebrow: "Message received",
          heading: "We have received your message",
          bodyLines: [
            "Thank you for contacting The Business Circle Network.",
            "We have received your message and a member of our team will come back to you shortly.",
            ...commonPreviewNoteLines()
          ],
          noteLines: ["Subject: Founder strategy session enquiry", "Source: /contact"]
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
    case "contact-admin-notification-email": {
      const react = createElement(ContactNotificationEmail, {
        name: "Trevor Newton",
        email: "trevor.newton@example.com",
        company: "Newton Advisory",
        subject: "Founder strategy session enquiry",
        sourcePath: "/contact",
        message:
          "Hi BCN team,\n\nI would like to explore a founder strategy session to tighten our delivery rhythm and sharpen how the business operates week to week.\n\nBest regards,\nTrevor"
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          eyebrow: "Contact enquiry",
          heading: "A new enquiry has been received",
          bodyLines: [
            "A new website contact submission has come into The Business Circle Network.",
            "Name: Trevor Newton",
            "Email: trevor.newton@example.com",
            "Company: Newton Advisory",
            "Subject: Founder strategy session enquiry",
            "Source: /contact",
            "",
            "Message:",
            "Hi BCN team,",
            "",
            "I would like to explore a founder strategy session to tighten our delivery rhythm and sharpen how the business operates week to week.",
            "",
            "Best regards,",
            "Trevor",
            "",
            ...commonPreviewNoteLines()
          ]
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
    case "inner-circle-upgrade-email": {
      const react = createElement(InnerCircleUpgradeEmail, {
        firstName: "Trevor",
        innerCircleUrl
      });

      return {
        definition,
        subject: definition.subjectPreview,
        text: buildBrandedEmailText({
          greeting: "Hi Trevor,",
          eyebrow: "Inner Circle",
          heading: "Your Inner Circle access is now active",
          bodyLines: [
            "Your upgrade is complete. You can now access private channels, premium resources, and the deeper BCN Inner Circle experience.",
            ...commonPreviewNoteLines()
          ],
          ctaLabel: "Enter Inner Circle",
          ctaUrl: innerCircleUrl,
          fallbackNotice: "If the button does not work, copy and paste the link above into your browser.",
          noteLines: ["Use the link above to step straight into the member environment."]
        }),
        html: await renderEmailHtml(react),
        react
      };
    }
  }
}

export function listAdminEmailTestDefinitions(): AdminEmailTestDefinition[] {
  return ADMIN_EMAIL_TEST_TYPE_IDS.map((id) => ADMIN_EMAIL_TEST_DEFINITIONS[id]);
}

export async function sendAdminEmailTest(input: SendAdminEmailTestInput) {
  console.info("[admin-email-test] requested", {
    adminUserId: input.adminUserId,
    emailType: input.emailType,
    recipientEmail: input.recipientEmail
  });

  const payload = await buildAdminEmailTestPayload(input.emailType);

  console.info("[admin-email-test] sending", {
    adminUserId: input.adminUserId,
    emailType: input.emailType,
    recipientEmail: input.recipientEmail,
    subject: payload.subject
  });

  try {
    const result = await sendTransactionalEmailOrThrow({
      to: input.recipientEmail,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      react: payload.react,
      tags: [
        { name: "type", value: "admin-email-test" },
        { name: "email_type", value: input.emailType },
        { name: "source", value: "admin" }
      ]
    });

    const sentAt = new Date().toISOString();
    console.info("[admin-email-test] success", {
      adminUserId: input.adminUserId,
      emailType: input.emailType,
      recipientEmail: input.recipientEmail,
      messageId: result.id ?? null,
      sentAt
    });

    return {
      messageId: result.id ?? null,
      sentAt,
      subject: payload.subject,
      definition: payload.definition
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown admin email test error.";
    console.error("[admin-email-test] failed", {
      adminUserId: input.adminUserId,
      emailType: input.emailType,
      recipientEmail: input.recipientEmail,
      error: errorMessage
    });
    throw error;
  }
}
