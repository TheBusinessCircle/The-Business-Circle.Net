export const tools = [
  {
    slug: "job-pricing-calculator",
    title: "Job Pricing Calculator",
    short: "Price a job",
    description:
      "Cover your time, materials and overheads. See the price that gives you your target margin.",
    tag: "PRICING",
    icon: "calculator",
  },
  {
    slug: "profit-break-even-calculator",
    title: "Profit & Break-Even Calculator",
    short: "Find your break-even point",
    description:
      "See how many jobs or sales cover your costs, and what is left after them.",
    tag: "MONEY",
    icon: "chart",
  },
  {
    slug: "business-cost-comparison",
    title: "Business Cost Comparison",
    short: "Compare business costs",
    description:
      "Compare two options over the same period, including setup and exit costs.",
    tag: "DECISIONS",
    icon: "compare",
  },
  {
    slug: "website-health-checklist",
    title: "Website Health Checklist",
    short: "Improve your website",
    description:
      "Walk through the things that help customers understand, trust and contact your business.",
    tag: "CUSTOMERS",
    icon: "website",
  },
  {
    slug: "quote-builder",
    title: "Quote Builder",
    short: "Build a clear quote",
    description:
      "Turn the details into an editable, professional quote. Print it or save it as a PDF.",
    tag: "GET IT DONE",
    icon: "document",
  },
] as const;
export type ToolSlug = (typeof tools)[number]["slug"];
export const vatSources = [
  { title: "HMRC: VAT rates", url: "https://www.gov.uk/vat-rates" },
  {
    title: "HMRC: when to register for VAT",
    url: "https://www.gov.uk/register-for-vat",
  },
];
