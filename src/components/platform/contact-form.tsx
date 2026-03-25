"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { contactSchema } from "@/lib/validators";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = contactSchema;
type Values = z.infer<typeof formSchema>;

type ContactApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  submissionId?: string;
  fieldErrors?: Partial<Record<keyof Values, string[]>>;
};

type SubmitState = "idle" | "success" | "error";
const CONTACT_FORM_FIELDS: Array<keyof Values> = ["name", "email", "company", "message"];

type ContactFormProps = {
  title?: string;
  description?: string;
  submitLabel?: string;
  successTitle?: string;
  successDescription?: string;
  successNotice?: string;
  defaultValues?: Partial<Values>;
};

export function ContactForm({
  title = "Contact The Team",
  description = "Tell us about your goals and we will get back to you.",
  submitLabel = "Send Message",
  successTitle = "Contact The Team",
  successDescription = "Your message is in our queue.",
  successNotice,
  defaultValues
}: ContactFormProps = {}) {
  const [status, setStatus] = useState<SubmitState>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resolvedDefaultValues: Values = {
    name: "",
    email: "",
    company: "",
    message: "",
    ...defaultValues
  };

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: resolvedDefaultValues
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);
    setSubmissionId(null);
    setStatus("idle");
    form.clearErrors();

    startTransition(async () => {
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...values,
            sourcePath: window.location.pathname
          })
        });

        const payload = (await response.json().catch(() => ({}))) as ContactApiResponse;

        if (!response.ok || !payload.ok) {
          if (payload.fieldErrors) {
            CONTACT_FORM_FIELDS.forEach((fieldName) => {
              const message = payload.fieldErrors?.[fieldName]?.[0];
              if (message) {
                form.setError(fieldName, {
                  type: "server",
                  message
                });
              }
            });
          }

          setStatus("error");
          setNotice(payload.error ?? "Unable to send your message right now.");
          return;
        }

        setStatus("success");
        setNotice(payload.message ?? "Message sent.");
        setSubmissionId(payload.submissionId ?? null);
        form.reset(resolvedDefaultValues);
      } catch {
        setStatus("error");
        setNotice("Unable to send your message right now.");
      }
    });
  });

  if (status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{successTitle}</CardTitle>
          <CardDescription>{successDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-gold/35 bg-gold/10 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-gold">
              <CheckCircle2 size={16} />
              Message sent successfully
            </p>
            <p className="mt-2 text-sm text-muted">
              {successNotice ?? notice ?? "Thanks. We received your message and will respond soon."}
            </p>
            {submissionId ? (
              <p className="mt-2 text-xs tracking-[0.06em] text-muted uppercase">
                Reference: {submissionId}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStatus("idle");
              setNotice(null);
              setSubmissionId(null);
            }}
          >
            Send another message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" disabled={isPending} {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" disabled={isPending} {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-company">Company (Optional)</Label>
            <Input id="contact-company" disabled={isPending} {...form.register("company")} />
            {form.formState.errors.company ? (
              <p className="text-xs text-destructive">{form.formState.errors.company.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea id="contact-message" rows={6} disabled={isPending} {...form.register("message")} />
            {form.formState.errors.message ? (
              <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>
            ) : null}
          </div>

          {status === "error" && notice ? (
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
              {notice}
            </p>
          ) : null}

          <Button disabled={isPending} type="submit" className="min-w-[140px]">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                Sending...
              </span>
            ) : (
              submitLabel
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
