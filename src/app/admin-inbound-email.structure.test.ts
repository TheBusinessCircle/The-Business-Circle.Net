import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin inbound email inbox wiring", () => {
  it("keeps the inbox admin-only and adds it to admin navigation", () => {
    const listPage = readSource("src/app/(admin)/admin/emails/page.tsx");
    const detailPage = readSource("src/app/(admin)/admin/emails/[emailId]/page.tsx");
    const siteConfig = readSource("src/config/site.ts");
    const nav = readSource("src/components/admin/admin-navigation.tsx");

    expect(listPage).toContain("await requireAdmin()");
    expect(detailPage).toContain("await requireAdmin()");
    expect(siteConfig).toContain('{ label: "Emails", href: "/admin/emails" }');
    expect(nav).toContain('href.startsWith("/admin/emails")');
  });

  it("uses the verified Resend inbound webhook route and stores emails privately", () => {
    const route = readSource("src/app/api/webhooks/resend/inbound/route.ts");
    const service = readSource("src/server/inbound-email/inbound-email.service.ts");

    expect(route).toContain("request.text()");
    expect(route).toContain("verifyResendWebhookEvent");
    expect(route).toContain("processResendInboundWebhookEvent");
    expect(service).toContain('event as ResendInboundWebhookEvent).type === "email.received"');
    expect(service).toContain("resend.emails.receiving.get(emailId)");
    expect(service).toContain("resend.emails.receiving.forward");
    expect(service).toContain("resendEmailId");
  });

  it("documents the public and inbound email environment variables", () => {
    const envExample = readSource(".env.example");

    expect(envExample).toContain('RESEND_WEBHOOK_SECRET="whsec_..."');
    expect(envExample).toContain('PUBLIC_CONTACT_EMAIL="contact@thebusinesscircle.net"');
    expect(envExample).toContain('INBOUND_EMAIL_FORWARD_TO="viberiseycdi@gmail.com"');
  });
});
