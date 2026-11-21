import { z } from "zod";

const externalId = z.string().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
const utcTimestamp = z.string().datetime({ offset: true });
const httpsUrl = z.string().url().max(2048).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use a public HTTPS URL with no embedded credentials");

const envelope = z.object({
  event_id: z.string().uuid(),
  version: z.literal(1),
  occurred_at: utcTimestamp,
  partner_id: externalId,
}).strict();

const publicProject = z.object({
  client_id: externalId,
  business_name: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(1000).optional(),
  logo_url: httpsUrl.nullable().optional(),
  website_url: httpsUrl.nullable().optional(),
  case_study_url: httpsUrl.nullable().optional(),
  client_consent_at: utcTimestamp,
  founder_approved_at: utcTimestamp,
  project_delivered_at: utcTimestamp,
}).strict();

export const scaleSmithsEventSchema = z.discriminatedUnion("event_type", [
  envelope.extend({
    event_type: z.literal("partner.approved"),
    data: z.object({ display_name: z.string().trim().min(1).max(180) }).strict()
  }),
  envelope.extend({
    event_type: z.literal("partner.updated"),
    data: z.object({ display_name: z.string().trim().min(1).max(180).optional() }).strict()
  }),
  envelope.extend({
    event_type: z.literal("partner.suspended"),
    data: z.object({ reason: z.string().max(240).optional() }).strict()
  }),
  envelope.extend({
    event_type: z.literal("partner.ended"),
    data: z.object({ reason: z.string().max(240).optional() }).strict()
  }),
  envelope.extend({
    event_type: z.literal("client.acquired"),
    data: z.object({
      client_id: externalId,
      business_name: z.string().trim().min(1).max(180),
      acquired_at: utcTimestamp
    }).strict()
  }),
  envelope.extend({
    event_type: z.literal("client.updated"),
    data: z.object({
      client_id: externalId,
      business_name: z.string().trim().min(1).max(180).optional()
    }).strict()
  }),
  envelope.extend({
    event_type: z.literal("portfolio.approved"),
    data: publicProject
  }),
  envelope.extend({
    event_type: z.literal("portfolio.withdrawn"),
    data: z.object({
      client_id: externalId,
      reason: z.string().max(240).optional()
    }).strict()
  }),
  envelope.extend({
    event_type: z.literal("project.published"),
    data: publicProject
  })
]);

export type ScaleSmithsEvent = z.infer<typeof scaleSmithsEventSchema>;
export type ScaleSmithsEventType = ScaleSmithsEvent["event_type"];
export type ScaleSmithsPublicProject = z.infer<typeof publicProject>;

export function parseScaleSmithsEvent(payload: unknown): ScaleSmithsEvent {
  return scaleSmithsEventSchema.parse(payload);
}

// Never treat a client.acquired event as permission to display a portfolio item.
// A separate approved/published event and active partner membership are required.
export function eventMayPublishPortfolio(
  event: ScaleSmithsEvent
): event is Extract<ScaleSmithsEvent, { event_type: "portfolio.approved" | "project.published" }> {
  return event.event_type === "portfolio.approved" || event.event_type === "project.published";
}
