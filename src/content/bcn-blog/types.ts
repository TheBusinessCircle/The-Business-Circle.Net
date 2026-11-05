export type BlogCategory =
  | "Starting out"
  | "Finding customers"
  | "Pricing and profit"
  | "Quotes and cash"
  | "Websites"
  | "Trust and marketing"
  | "Helping each other"
  | "Buying better"
  | "Getting work done"
  | "Growing carefully"
  | "Staying resilient"
  | "Business your way"
  | "Review and improve";

export type BcnBlogDraft = {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  intro: string;
  sections: [string, string][];
  example: string;
  checklist: string[];
  helpPrompt: string;
  nextStep: { label: string; href: string };
  sources?: string[];
};

export const BLOG_PREPARED_AT = "2026-10-21";

/** Primary reading, checked on the preparation date. Not endorsements or partners. */
export const BLOG_SOURCES: Record<string, { label: string; href: string }> = {
  setup: {
    label: "GOV.UK: setting up a business",
    href: "https://www.gov.uk/set-up-business",
  },
  plan: {
    label: "GOV.UK: writing a business plan",
    href: "https://www.gov.uk/write-business-plan",
  },
  trading: {
    label: "GOV.UK: working for yourself",
    href: "https://www.gov.uk/working-for-yourself",
  },
  support: {
    label: "Business.gov.uk: business support",
    href: "https://www.business.gov.uk/",
  },
  vat: { label: "HMRC: VAT rates", href: "https://www.gov.uk/vat-rates" },
  invoices: {
    label: "GOV.UK: invoicing and taking payment",
    href: "https://www.gov.uk/invoicing-and-taking-payment-from-customers",
  },
  late: {
    label: "GOV.UK: late commercial payments",
    href: "https://www.gov.uk/late-commercial-payments-interest-debt-recovery",
  },
  ads: {
    label: "GOV.UK: marketing and advertising rules",
    href: "https://www.gov.uk/marketing-advertising-law",
  },
  privacy: {
    label: "ICO: advice for small organisations",
    href: "https://ico.org.uk/for-organisations/advice-for-small-organisations/",
  },
  disclosure: {
    label: "ASA: recognising advertising",
    href: "https://www.asa.org.uk/advice-online/recognising-ads-social-media.html",
  },
  cyber: {
    label: "NCSC: small organisations cyber security guide",
    href: "https://www.ncsc.gov.uk/collection/small-organisations-guide-to-cyber-security",
  },
  accessibility: {
    label: "W3C WAI: accessibility tips",
    href: "https://www.w3.org/WAI/tips/",
  },
  google: {
    label: "Google: helpful, reliable content",
    href: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
  },
  local: {
    label: "Google: Business Profile guidelines",
    href: "https://support.google.com/business/answer/3038177",
  },
  hiring: {
    label: "Acas: hiring someone",
    href: "https://www.acas.org.uk/hiring-someone",
  },
  ip: {
    label: "GOV.UK: intellectual property",
    href: "https://www.gov.uk/intellectual-property-an-overview",
  },
};
