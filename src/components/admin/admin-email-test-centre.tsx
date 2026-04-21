"use client";

import { Mail, RefreshCw, Send } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { AdminEmailTestDefinition, AdminEmailTestTypeId } from "@/server/admin/admin-email-tests.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type AdminEmailTestCentreProps = {
  adminEmail: string;
  emailTypes: AdminEmailTestDefinition[];
};

type HistoryEntry = {
  id: string;
  emailType: string;
  recipientEmail: string;
  sentAt: string;
  status: "success" | "error";
  detail: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AdminEmailTestCentre({
  adminEmail,
  emailTypes
}: AdminEmailTestCentreProps) {
  const [selectedEmailType, setSelectedEmailType] = useState<AdminEmailTestTypeId>(
    emailTypes[0]?.id ?? "verification-email"
  );
  const [recipientEmail, setRecipientEmail] = useState(adminEmail);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  const selectedDefinition = useMemo(
    () => emailTypes.find((emailType) => emailType.id === selectedEmailType) ?? emailTypes[0],
    [emailTypes, selectedEmailType]
  );

  function addHistoryEntry(entry: HistoryEntry) {
    setHistory((current) => [entry, ...current].slice(0, 8));
  }

  function handleSend() {
    if (!selectedDefinition) {
      return;
    }

    setNotice(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/email-tests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            emailType: selectedDefinition.id,
            recipientEmail
          })
        });

        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          error?: string;
          sentAt?: string;
        };

        if (!response.ok || !payload.ok) {
          const message = payload.error || "Unable to send the test email.";
          setError(message);
          addHistoryEntry({
            id: `${selectedDefinition.id}-${Date.now()}-error`,
            emailType: selectedDefinition.label,
            recipientEmail,
            sentAt: new Date().toISOString(),
            status: "error",
            detail: message
          });
          return;
        }

        const sentAt = payload.sentAt ?? new Date().toISOString();
        setNotice(payload.message || `${selectedDefinition.label} sent successfully.`);
        setLastSentAt(sentAt);
        addHistoryEntry({
          id: `${selectedDefinition.id}-${sentAt}`,
          emailType: selectedDefinition.label,
          recipientEmail,
          sentAt,
          status: "success",
          detail: payload.message || `${selectedDefinition.label} sent successfully.`
        });
      } catch {
        const message = "Unable to send the test email.";
        setError(message);
        addHistoryEntry({
          id: `${selectedDefinition.id}-${Date.now()}-network`,
          emailType: selectedDefinition.label,
          recipientEmail,
          sentAt: new Date().toISOString(),
          status: "error",
          detail: message
        });
      }
    });
  }

  if (!selectedDefinition) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Mail size={17} />
              Available Test Emails
            </CardTitle>
            <CardDescription>
              Choose from the live BCN email templates below. Each card shows the structure label so
              you can quickly spot whether the right format is being tested.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {emailTypes.map((emailType) => {
              const selected = emailType.id === selectedDefinition.id;

              return (
                <button
                  key={emailType.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmailType(emailType.id);
                    setNotice(null);
                    setError(null);
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? "border-gold/45 bg-gold/12 shadow-panel-soft"
                      : "border-border/80 bg-background/20 hover:border-gold/30 hover:bg-background/30"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{emailType.label}</p>
                    {selected ? (
                      <Badge variant="premium" className="normal-case tracking-normal">
                        Selected
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted">{emailType.description}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.08em] text-gold">
                    {emailType.categoryLabel}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
            <CardHeader>
              <CardTitle>Test Send Panel</CardTitle>
              <CardDescription>
                Send a safe internal preview of the selected BCN email to any address you choose.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-test-type">Email type</Label>
                <Select
                  id="email-test-type"
                  value={selectedDefinition.id}
                  onChange={(event) => {
                    setSelectedEmailType(event.target.value as AdminEmailTestTypeId);
                    setNotice(null);
                    setError(null);
                  }}
                >
                  {emailTypes.map((emailType) => (
                    <option key={emailType.id} value={emailType.id}>
                      {emailType.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-test-recipient">Destination email address</Label>
                <Input
                  id="email-test-recipient"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="name@example.com"
                />
                {adminEmail ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRecipientEmail(adminEmail)}
                  >
                    Use my admin email
                  </Button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/20 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-gold">Scenario</p>
                <p className="mt-2 font-medium text-foreground">{selectedDefinition.scenarioName}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.08em] text-muted">Subject preview</p>
                <p className="mt-2 text-sm text-muted">{selectedDefinition.subjectPreview}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-background/20 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Includes CTA</p>
                  <p className="mt-2 font-medium text-foreground">
                    {selectedDefinition.includesCta ? "Yes" : "No"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/20 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">
                    Includes fallback link
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    {selectedDefinition.includesFallbackLink ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/20 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Purpose</p>
                <p className="mt-2 text-sm text-muted">{selectedDefinition.purpose}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isPending || !recipientEmail.trim()}
                >
                  {isPending ? (
                    <>
                      <RefreshCw size={14} className="mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} className="mr-2" />
                      Send test email
                    </>
                  )}
                </Button>
                {lastSentAt ? (
                  <p className="text-xs text-muted">Last send: {formatDateTime(lastSentAt)}</p>
                ) : null}
              </div>

              {notice ? <p className="text-sm text-gold">{notice}</p> : null}
              {error ? <p className="text-sm text-red-200">{error}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Send History</CardTitle>
              <CardDescription>
                This list lasts only for your current browser session on this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length ? (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-2xl border p-4 ${
                      entry.status === "success"
                        ? "border-gold/30 bg-gold/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{entry.emailType}</p>
                      <Badge
                        variant={entry.status === "success" ? "success" : "danger"}
                        className="normal-case tracking-normal"
                      >
                        {entry.status === "success" ? "Sent" : "Failed"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">{entry.recipientEmail}</p>
                    <p className="mt-2 text-xs text-muted">{formatDateTime(entry.sentAt)}</p>
                    <p className="mt-2 text-sm text-muted">{entry.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No test emails sent from this page yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
