"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, Send } from "lucide-react";
import { sendFounderServiceCheckoutEmailAction } from "@/actions/admin/founder-service.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatFounderDiscountTagLabel, formatFounderServicePrice } from "@/lib/founder";
import type { FounderServiceDiscountCodeModel } from "@/types";

type FounderServiceCheckoutEmailComposerProps = {
  requestId: string;
  returnPath: string;
  toEmail: string;
  subject: string;
  body: string;
  serviceName: string;
  priceAmount: number;
  currency: string;
  selectedDiscountCodeId?: string | null;
  discountCodes: FounderServiceDiscountCodeModel[];
  hasSentCheckoutEmail: boolean;
};

function SendButton({ hasSentCheckoutEmail }: { hasSentCheckoutEmail: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="default"
      disabled={pending}
      onClick={(event) => {
        if (
          hasSentCheckoutEmail &&
          !window.confirm("A checkout email has already been sent to this client. Send another one?")
        ) {
          event.preventDefault();
        }
      }}
    >
      <Send size={15} className="mr-1" />
      {pending ? "Sending..." : "Send checkout email"}
    </Button>
  );
}

export function FounderServiceCheckoutEmailComposer({
  requestId,
  returnPath,
  toEmail,
  subject,
  body,
  serviceName,
  priceAmount,
  currency,
  selectedDiscountCodeId,
  discountCodes,
  hasSentCheckoutEmail
}: FounderServiceCheckoutEmailComposerProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState(subject);
  const [draftBody, setDraftBody] = useState(body);
  const [ctaLabel, setCtaLabel] = useState("Secure your place");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout email composer</CardTitle>
        <CardDescription>
          Create a Stripe checkout session and send a branded email only when you press send.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={sendFounderServiceCheckoutEmailAction} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="returnPath" value={returnPath} />

          <div className="space-y-2">
            <Label htmlFor="checkoutEmailTo">To</Label>
            <Input id="checkoutEmailTo" value={toEmail} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkoutEmailSubject">Subject</Label>
            <Input
              id="checkoutEmailSubject"
              name="subject"
              value={draftSubject}
              onChange={(event) => setDraftSubject(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkoutEmailService">Selected service</Label>
              <Input id="checkoutEmailService" value={serviceName} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkoutEmailPrice">Price</Label>
              <Input
                id="checkoutEmailPrice"
                value={formatFounderServicePrice(priceAmount, currency)}
                readOnly
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkoutEmailDiscount">Discount code</Label>
            <Select
              id="checkoutEmailDiscount"
              name="adminDiscountCodeId"
              defaultValue={selectedDiscountCodeId ?? ""}
            >
              <option value="">No discount code</option>
              {discountCodes
                .filter((code) => code.active)
                .map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code} - {formatFounderDiscountTagLabel(code.tag)}
                  </option>
                ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkoutEmailBody">Opening message</Label>
            <Textarea
              id="checkoutEmailBody"
              name="body"
              rows={12}
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkoutEmailCta">CTA button label</Label>
            <Input
              id="checkoutEmailCta"
              name="ctaLabel"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              required
            />
          </div>

          {previewOpen ? (
            <div className="rounded-2xl border border-gold/25 bg-gold/10 p-4 text-sm text-foreground">
              <p className="font-medium">{draftSubject}</p>
              <div className="mt-3 whitespace-pre-wrap text-muted">{draftBody}</div>
              <p className="mt-4 text-gold">{ctaLabel}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen((open) => !open)}>
              <Eye size={15} className="mr-1" />
              {previewOpen ? "Hide preview" : "Preview email"}
            </Button>
            <SendButton hasSentCheckoutEmail={hasSentCheckoutEmail} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
