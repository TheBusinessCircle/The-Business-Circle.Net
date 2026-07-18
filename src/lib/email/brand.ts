import {
  RUNTIME_BRANDS,
  type RuntimeBrandKey
} from "@/config/runtime-brand";

export type EmailBrandKey = RuntimeBrandKey;

export function getRequiredEmailBrandsForRuntime(
  runtimeBrand: RuntimeBrandKey
): readonly EmailBrandKey[] {
  return runtimeBrand === "circle-card"
    ? ["circle-card"]
    : ["bcn", "circle-card"];
}

export type EmailBrandEnvironment = {
  APP_BRAND?: string;
  NODE_ENV?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO_EMAIL?: string;
  PUBLIC_CONTACT_EMAIL?: string;
  CIRCLE_CARD_RESEND_API_KEY?: string;
  CIRCLE_CARD_RESEND_FROM_EMAIL?: string;
  CIRCLE_CARD_RESEND_REPLY_TO_EMAIL?: string;
  CIRCLE_CARD_PUBLIC_CONTACT_EMAIL?: string;
};

export type EmailBrandIdentity = {
  key: EmailBrandKey;
  productName: string;
  legalOperatorName: string;
  canonicalOrigin: string;
  logoUrl: string;
  sender: string;
  replyTo: string | undefined;
  supportEmail: string;
};

export class EmailBrandConfigurationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EmailBrandConfigurationError";
    this.code = code;
  }
}

const MAILBOX_PATTERN =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

function containsHeaderInjection(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value);
}

export function parseEmailMailbox(value: string, variableName: string) {
  const mailbox = value.trim();

  if (
    !mailbox ||
    mailbox.length > 254 ||
    containsHeaderInjection(mailbox) ||
    !MAILBOX_PATTERN.test(mailbox)
  ) {
    throw new EmailBrandConfigurationError(
      "EMAIL_MAILBOX_INVALID",
      `${variableName} must contain one valid email mailbox without control characters.`
    );
  }

  return mailbox;
}

export function parseEmailSender(value: string, variableName: string) {
  const sender = value.trim();

  if (!sender || sender.length > 320 || containsHeaderInjection(sender)) {
    throw new EmailBrandConfigurationError(
      "EMAIL_SENDER_INVALID",
      `${variableName} must contain a valid sender without control characters.`
    );
  }

  if (MAILBOX_PATTERN.test(sender)) {
    return { value: sender, mailbox: sender };
  }

  const formatted = /^(?:"([^"<>]+)"|([A-Z0-9][A-Z0-9 .&'()_-]*))\s*<([^<>]+)>$/i.exec(
    sender
  );
  const displayName = (formatted?.[1] ?? formatted?.[2] ?? "").trim();
  const mailbox = formatted?.[3]?.trim() ?? "";

  if (!displayName || displayName.length > 100 || !MAILBOX_PATTERN.test(mailbox)) {
    throw new EmailBrandConfigurationError(
      "EMAIL_SENDER_INVALID",
      `${variableName} must be a mailbox or a display name followed by one mailbox.`
    );
  }

  return { value: sender, mailbox };
}

function mailboxDomain(mailbox: string) {
  return mailbox.slice(mailbox.lastIndexOf("@") + 1).toLowerCase();
}

function optionalMailbox(value: string | undefined, variableName: string) {
  return value?.trim() ? parseEmailMailbox(value, variableName) : undefined;
}

function requireProductionValue(
  value: string | undefined,
  variableName: string,
  production: boolean
) {
  const normalized = value?.trim();

  if (!normalized && production) {
    throw new EmailBrandConfigurationError(
      "EMAIL_BRAND_CONFIGURATION_MISSING",
      `${variableName} must be configured in production.`
    );
  }

  return normalized;
}

const CIRCLE_CARD_EMAIL_ENVIRONMENT_KEYS = [
  "CIRCLE_CARD_RESEND_API_KEY",
  "CIRCLE_CARD_RESEND_FROM_EMAIL",
  "CIRCLE_CARD_RESEND_REPLY_TO_EMAIL",
  "CIRCLE_CARD_PUBLIC_CONTACT_EMAIL"
] as const;

export function requiresCircleCardEmailConfiguration(
  environment: EmailBrandEnvironment = process.env
) {
  if (environment.APP_BRAND?.trim().toLowerCase() === "circle-card") {
    return true;
  }

  return CIRCLE_CARD_EMAIL_ENVIRONMENT_KEYS.some((key) =>
    Boolean(environment[key]?.trim())
  );
}

export function resolveEmailBrandIdentity(
  brand: EmailBrandKey,
  environment: EmailBrandEnvironment = process.env
): EmailBrandIdentity {
  if (!Object.prototype.hasOwnProperty.call(RUNTIME_BRANDS, brand)) {
    throw new EmailBrandConfigurationError(
      "EMAIL_BRAND_INVALID",
      "Email brand must be one of the server allowlisted brands."
    );
  }

  const registryBrand = RUNTIME_BRANDS[brand];

  const canonicalUrl = new URL(registryBrand.canonicalOrigin);
  if (canonicalUrl.protocol !== "https:" || canonicalUrl.origin !== registryBrand.canonicalOrigin) {
    throw new EmailBrandConfigurationError(
      "EMAIL_BRAND_ORIGIN_INVALID",
      `${brand} email canonical origin must be an HTTPS origin.`
    );
  }

  const production = environment.NODE_ENV === "production";
  const circleCard = brand === "circle-card";
  const senderVariable = circleCard
    ? "CIRCLE_CARD_RESEND_FROM_EMAIL"
    : "RESEND_FROM_EMAIL";
  const replyToVariable = circleCard
    ? "CIRCLE_CARD_RESEND_REPLY_TO_EMAIL"
    : "RESEND_REPLY_TO_EMAIL";
  const contactVariable = circleCard
    ? "CIRCLE_CARD_PUBLIC_CONTACT_EMAIL"
    : "PUBLIC_CONTACT_EMAIL";
  const configuredSender = requireProductionValue(
    circleCard
      ? environment.CIRCLE_CARD_RESEND_FROM_EMAIL
      : environment.RESEND_FROM_EMAIL,
    senderVariable,
    production
  );
  const sender = parseEmailSender(
    configuredSender ??
      (circleCard
        ? "Circle Card <onboarding@resend.dev>"
        : "The Business Circle Network <onboarding@resend.dev>"),
    senderVariable
  );

  if (production && /@resend\.dev$/i.test(sender.mailbox)) {
    throw new EmailBrandConfigurationError(
      "EMAIL_SENDER_DOMAIN_INVALID",
      `${senderVariable} must use a verified production domain.`
    );
  }

  if (production && circleCard && mailboxDomain(sender.mailbox) !== "circlecard.co.uk") {
    throw new EmailBrandConfigurationError(
      "EMAIL_SENDER_DOMAIN_INVALID",
      "CIRCLE_CARD_RESEND_FROM_EMAIL must use the circlecard.co.uk domain in production."
    );
  }

  if (production && !circleCard && mailboxDomain(sender.mailbox) !== "thebusinesscircle.net") {
    throw new EmailBrandConfigurationError(
      "EMAIL_SENDER_DOMAIN_INVALID",
      "RESEND_FROM_EMAIL must use the thebusinesscircle.net domain in production."
    );
  }

  const configuredReplyTo = requireProductionValue(
    circleCard
      ? environment.CIRCLE_CARD_RESEND_REPLY_TO_EMAIL
      : environment.RESEND_REPLY_TO_EMAIL,
    replyToVariable,
    production && circleCard
  );
  const configuredContact = requireProductionValue(
    circleCard
      ? environment.CIRCLE_CARD_PUBLIC_CONTACT_EMAIL
      : environment.PUBLIC_CONTACT_EMAIL,
    contactVariable,
    production && circleCard
  );
  const replyTo = optionalMailbox(configuredReplyTo, replyToVariable);
  const supportEmail = parseEmailMailbox(
    configuredContact ?? registryBrand.publicContactEmail,
    contactVariable
  );

  return {
    key: brand,
    productName: registryBrand.displayName,
    legalOperatorName: registryBrand.legalOperatorName,
    canonicalOrigin: registryBrand.canonicalOrigin,
    logoUrl: new URL(registryBrand.assets.logoPath, registryBrand.canonicalOrigin).toString(),
    sender: sender.value,
    replyTo,
    supportEmail
  };
}
