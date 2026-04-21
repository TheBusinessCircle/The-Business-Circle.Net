import type { Metadata } from "next";
import { FlaskConical, MailCheck } from "lucide-react";
import { AdminEmailTestCentre } from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { listAdminEmailTestDefinitions } from "@/server/admin/admin-email-tests.service";

export const metadata: Metadata = createPageMetadata({
  title: "Email Test Centre",
  description:
    "Send internal BCN email previews to validate branding, layout, CTA buttons, fallback links, and delivery.",
  path: "/admin/email-test-centre"
});

export const dynamic = "force-dynamic";

export default async function AdminEmailTestCentrePage() {
  const session = await requireAdmin();
  const emailTypes = listAdminEmailTestDefinitions();

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <MailCheck size={12} className="mr-1" />
                Internal Email QA
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Email Test Centre</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Send safe internal previews of the live BCN transactional emails so you can review
                branding, logo rendering, CTA structure, fallback links, and delivery before using
                them more widely.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted" className="normal-case tracking-normal">
                {emailTypes.length} email types available
              </Badge>
              <Badge variant="outline" className="normal-case tracking-normal text-muted">
                Admin only
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <FlaskConical size={15} className="text-gold" />
              Safe internal previews
            </p>
            <p className="mt-2 text-sm text-muted">
              Test sends use realistic mock data and non-destructive preview links on the live
              domain. They do not trigger real member actions or rely on a live user account.
            </p>
            <p className="mt-2 text-xs text-muted">
              Signed in as {session.user.email}
            </p>
          </div>
        </CardHeader>
      </Card>

      <AdminEmailTestCentre
        adminEmail={session.user.email ?? ""}
        emailTypes={emailTypes}
      />
    </div>
  );
}
