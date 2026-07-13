export const CIRCLE_CARD_BILLING_ENV_NAMES = {
  enabled: "CIRCLE_CARD_BILLING_ENABLED",
  accessMode: "CIRCLE_CARD_BILLING_ACCESS_MODE",
  operatorUserIds: "CIRCLE_CARD_BILLING_OPERATOR_USER_IDS",
  stripeSecretKey: "STRIPE_SECRET_KEY",
  stripeWebhookSecret: "STRIPE_WEBHOOK_SECRET",
  productId: "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID",
  monthlyPriceId: "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID",
  portalConfigurationId: "CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID"
} as const;

export type CircleCardBillingEnvironmentIssue = {
  variable: (typeof CIRCLE_CARD_BILLING_ENV_NAMES)[keyof typeof CIRCLE_CARD_BILLING_ENV_NAMES];
  message: string;
};

type Environment = Record<string, string | undefined>;

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function value(environment: Environment, name: string) {
  return environment[name]?.trim() ?? "";
}

export function parseCircleCardBillingEnabled(environment: Environment = process.env) {
  return TRUE_VALUES.has(value(environment, CIRCLE_CARD_BILLING_ENV_NAMES.enabled).toLowerCase());
}

export function validateCircleCardBillingEnvironment(
  environment: Environment = process.env
): CircleCardBillingEnvironmentIssue[] {
  const issues: CircleCardBillingEnvironmentIssue[] = [];
  const rawEnabled = value(environment, CIRCLE_CARD_BILLING_ENV_NAMES.enabled).toLowerCase();

  if (!rawEnabled) {
    issues.push({
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.enabled,
      message:
        "CIRCLE_CARD_BILLING_ENABLED must be explicitly set to false until a controlled launch."
    });
    return issues;
  }

  if (!TRUE_VALUES.has(rawEnabled) && !FALSE_VALUES.has(rawEnabled)) {
    issues.push({
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.enabled,
      message:
        "CIRCLE_CARD_BILLING_ENABLED must be an explicit boolean value such as true or false."
    });
    return issues;
  }

  if (!TRUE_VALUES.has(rawEnabled)) {
    return issues;
  }

  const accessMode = value(environment, CIRCLE_CARD_BILLING_ENV_NAMES.accessMode).toLowerCase();
  if (accessMode !== "operator" && accessMode !== "public") {
    issues.push({
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.accessMode,
      message:
        "CIRCLE_CARD_BILLING_ACCESS_MODE must be explicitly set to operator or public when billing is enabled."
    });
  } else if (
    accessMode === "operator" &&
    !value(environment, CIRCLE_CARD_BILLING_ENV_NAMES.operatorUserIds)
  ) {
    issues.push({
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.operatorUserIds,
      message:
        "CIRCLE_CARD_BILLING_OPERATOR_USER_IDS is required during controlled operator billing."
    });
  }

  const requiredValues = [
    {
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.stripeSecretKey,
      prefix: "sk_",
      message: "STRIPE_SECRET_KEY is required when Circle Card billing is enabled."
    },
    {
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.stripeWebhookSecret,
      prefix: "whsec_",
      message: "STRIPE_WEBHOOK_SECRET is required when Circle Card billing is enabled."
    },
    {
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.productId,
      prefix: "prod_",
      message:
        "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID is required when Circle Card billing is enabled."
    },
    {
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.monthlyPriceId,
      prefix: "price_",
      message:
        "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID is required when Circle Card billing is enabled."
    },
    {
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.portalConfigurationId,
      prefix: "bpc_",
      message:
        "CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID is required when Circle Card billing is enabled."
    }
  ] as const;

  for (const requirement of requiredValues) {
    const configuredValue = value(environment, requirement.variable);

    if (!configuredValue) {
      issues.push({ variable: requirement.variable, message: requirement.message });
      continue;
    }

    if (!configuredValue.startsWith(requirement.prefix)) {
      issues.push({
        variable: requirement.variable,
        message: `${requirement.variable} does not look like the expected Stripe identifier.`
      });
    }
  }

  return issues;
}
