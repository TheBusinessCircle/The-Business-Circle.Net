import type { BcnBlogDraft } from "./types";
export const buying: BcnBlogDraft[] = [
  {
    slug: "audit-business-subscriptions-before-renewal",
    title: "Audit business subscriptions before the next renewal",
    category: "Buying better",
    description:
      "Find owners, usage, renewal dates and exit requirements before cancelling anything.",
    intro:
      "A forgotten subscription can cost money, but cancelling the wrong service can interrupt the business. Start with a reliable inventory. The aim is a deliberate decision, not the biggest cancellation count.",
    sections: [
      [
        "Record the practical facts",
        "List the service, account owner, purpose, price basis, billing period, renewal date and notice requirements. Check actual recent use with the people relying on it. Include annual and usage-based charges. Do not copy passwords or payment details into a general spreadsheet.",
      ],
      [
        "Check dependencies before changing",
        "Identify stored data, integrations, email routing and other services that depend on the account. Export and verify anything you need before following the agreed cancellation process. A price saving is not useful if it removes access to customer records or stops bookings. Record the confirmed cancellation or revised plan, not just an intention.",
      ],
    ],
    example:
      "An owner finds two scheduling tools, but one sends appointment reminders. They establish which system is active and test the replacement before ending the redundant service. The saving is counted only after the billing arrangement actually changes.",
    checklist: [
      "List services and responsible owners.",
      "Check real use and renewal terms.",
      "Identify data and dependencies.",
      "Confirm any change and retained access.",
    ],
    helpPrompt:
      "Could someone help me structure a subscription audit so I do not accidentally cancel a service that runs our bookings? No account credentials need to be shared.",
    nextStep: {
      label: "Compare ongoing costs",
      href: "/tools/business-cost-comparison",
    },
  },
  {
    slug: "compare-monthly-and-annual-software-prices",
    title: "Monthly or annual software billing: compare the whole commitment",
    category: "Buying better",
    description:
      "Consider total cost, flexibility, cash timing and exit terms rather than the headline monthly equivalent.",
    intro:
      "An annual plan may display a smaller monthly equivalent while requiring payment upfront. Compare what you are committing to, when cash leaves and how confident you are that the service will remain useful.",
    sections: [
      [
        "Use the same period",
        "Calculate the total over the period you actually expect to need the tool. Include setup, extra users, usage limits, VAT on a consistent basis and any required add-ons. Separate introductory pricing from renewal pricing. Check whether the contract permits cancellation, refunds or downgrades rather than assuming it does.",
      ],
      [
        "Value flexibility honestly",
        "A monthly option may cost more over a full year but reduce an uncertain commitment. An annual plan can be sensible for a proven need with appropriate terms. Avoid buying a larger package simply because its theoretical unit price is lower. Cash flow and unused capacity also matter.",
      ],
    ],
    example:
      "A £20 monthly plan costs £240 over twelve months. An illustrative £180 annual plan costs less if used for the whole year, but may be more expensive for a three-month experiment if it cannot be refunded. The contract decides the actual comparison.",
    checklist: [
      "Compare the same time period.",
      "Include extras and renewal rates.",
      "Read cancellation and refund terms.",
      "Check the upfront cash requirement.",
    ],
    helpPrompt:
      "Could someone check my monthly-versus-annual comparison for a tool I may only need during a short trial?",
    nextStep: {
      label: "Run the cost comparison",
      href: "/tools/business-cost-comparison",
    },
  },
  {
    slug: "choose-business-software-from-a-task-list",
    title: "Choose business software from the work you need done",
    category: "Buying better",
    description:
      "Start with tasks and constraints before comparing feature lists or free trials.",
    intro:
      "Software is useful when it improves a real process. Start by describing the task and what is currently difficult. Otherwise a long feature list can become a reason to reorganise the business around a tool you did not need.",
    sections: [
      [
        "Define essential tasks",
        "List the few actions the system must support, who uses it and what information it holds. Separate essential requirements from preferences. Include accessibility, security, export, integration and support needs. A service that cannot safely handle your actual data is not rescued by an attractive dashboard.",
      ],
      [
        "Test a realistic example",
        "Use synthetic records to walk through setup, routine work, an error and export. Check current pricing and terms yourself. Ask whether an existing tool or simpler process can do enough. Do not put real customer information into an experimental account without an appropriate basis and safeguards.",
      ],
    ],
    example:
      "A sole trader needs to track enquiries and reminders. They test three common tasks before committing to a large sales platform. If a secure existing system covers the workflow, they can postpone the purchase and review later.",
    checklist: [
      "Write the real workflow.",
      "Mark essential requirements.",
      "Test with synthetic information.",
      "Check ownership, export and full cost.",
    ],
    helpPrompt:
      "Could someone help me define essential requirements for a small enquiry tracker before I trial software? I am looking for a decision method rather than an affiliate pitch.",
    nextStep: {
      label: "Compare the costs of viable options",
      href: "/tools/business-cost-comparison",
    },
    sources: ["privacy"],
  },
  {
    slug: "compare-payment-provider-costs-realistically",
    title: "Compare payment providers using your actual sales pattern",
    category: "Buying better",
    description:
      "Include transaction mix, fixed charges, settlement timing and refunds in a provider comparison.",
    intro:
      "The lowest advertised transaction percentage is not automatically the cheapest option for your business. Your average sale, payment methods and volume can change the comparison. Use current provider terms, not an old comparison table.",
    sections: [
      [
        "Model a representative period",
        "Record expected transaction count, typical values and relevant payment methods. Include fixed per-transaction charges, monthly fees, equipment and any applicable extra charges. Check settlement timing, refund and dispute terms. Do not assume all transaction types use the headline rate.",
      ],
      [
        "Consider the operational fit",
        "Check how payments connect to your records, what customers see and who handles support. A small fee difference may be outweighed by unsuitable equipment or unreliable reconciliation. Treat projected fees as estimates until actual statements confirm them. Payment providers and their terms change, so verify at the point of choosing.",
      ],
    ],
    example:
      "Two illustrative providers charge 1% plus 20p and 1.5% with no fixed amount. On a £10 transaction that is 30p versus 15p; on £100 it is £1.20 versus £1.50. Real offers may include other conditions and costs.",
    checklist: [
      "Use a realistic transaction mix.",
      "Include fixed and ongoing fees.",
      "Review settlement and dispute terms.",
      "Check integration and reconciliation.",
    ],
    helpPrompt:
      "Could someone review the structure of a payment-cost comparison using synthetic sales totals? I do not want to share card or customer payment details.",
    nextStep: {
      label: "Compare operating costs",
      href: "/tools/business-cost-comparison",
    },
  },
  {
    slug: "buy-a-website-with-clear-ownership",
    title: "Who should own your domain, website accounts and content?",
    category: "Buying better",
    description:
      "Clarify control, rights and handover before commissioning website work.",
    intro:
      "A website can become difficult to maintain or move if nobody knows who controls the domain and accounts. Agree ownership and access before work begins. Paying for a service does not by itself explain every intellectual-property or platform right.",
    sections: [
      [
        "List the assets separately",
        "Identify the domain registration, hosting, platform account, source code, content, images, licences and analytics. Clarify what you will own, what is licensed and what remains a third-party service. Keep primary business access and recovery details under appropriate business control with secure delegated access for providers.",
      ],
      [
        "Plan a normal handover",
        "Ask what happens when the project ends or you change supplier. Specify files, documentation, exports, support and any transfer charges. Ensure usage rights cover what you intend to do. Do not demand another customer's information or a provider's unrelated proprietary systems as part of a handover.",
      ],
    ],
    example:
      "An owner registers the domain in a business-controlled account and gives the developer suitable delegated access. The agreement separately explains platform licensing, content rights and final files. Leaving the service later becomes a defined process rather than a dispute over passwords.",
    checklist: [
      "Inventory separate website assets.",
      "Clarify ownership and licences.",
      "Secure primary and recovery access.",
      "Agree exit and handover deliverables.",
    ],
    helpPrompt:
      "Could someone help me prepare ownership and handover questions for a website proposal before I sign?",
    nextStep: { label: "Find suitable website help", href: "/find-help" },
    sources: ["ip", "cyber"],
  },
  {
    slug: "compare-supplier-quotes-on-scope",
    title: "Compare supplier quotes on the same scope",
    category: "Buying better",
    description:
      "Expose differences in deliverables, assumptions and ongoing costs before choosing.",
    intro:
      "Two totals may represent very different work. Before deciding one supplier is expensive, place the quotes beside the same requirement. Missing items often explain more than the headline price.",
    sections: [
      [
        "Make a scope table",
        "List the required outputs, quantities, preparation, materials, delivery, support and timing. For each proposal, mark included, excluded or unclear. Clarify ambiguous items directly. Compare VAT consistently and include unavoidable extras. Do not turn a cheap quote into a complete offer by silently assuming it includes everything.",
      ],
      [
        "Include responsibility and risk",
        "Check relevant competence, references and suitable terms. Ask how changes and problems are handled. Consider the cost of your own required work and future maintenance. A low initial price may still be the right choice, but the decision should be based on the actual offer rather than a guessed one.",
      ],
    ],
    example:
      "One signage quote includes design, production and installation; another covers printing only. The owner asks for a comparable installation scope before comparing totals. They avoid choosing on an apparent saving that excludes essential work.",
    checklist: [
      "Write the same requirements for each quote.",
      "Mark omissions and uncertainties.",
      "Add ongoing and unavoidable costs.",
      "Check responsibility and change handling.",
    ],
    helpPrompt:
      "Could someone help me build a neutral comparison of two anonymised supplier quotes? Please focus on scope differences rather than assuming price proves quality.",
    nextStep: {
      label: "Compare the full costs",
      href: "/tools/business-cost-comparison",
    },
  },
  {
    slug: "switch-business-software-without-losing-records",
    title: "Plan a software switch before cancelling the old account",
    category: "Buying better",
    description:
      "Test export, import and recovery with controlled access before changing a live workflow.",
    intro:
      "A software switch is a small migration project. Subscription cancellation should come after you understand what needs to move and whether the new system actually works for the business.",
    sections: [
      [
        "Inventory records and dependencies",
        "List data, attachments, users, integrations and records you must retain. Check export formats, contractual access and privacy obligations. Use authorised access only. Do not assume a downloaded file contains every attachment or enough information to reconstruct the original record.",
      ],
      [
        "Test and keep a fallback",
        "Try an import with synthetic or appropriately controlled data, compare representative records and check access permissions. Agree a cutover time, responsibilities and a rollback approach. Keep any required old records securely and follow the cancellation terms only once the migration checks are satisfactory.",
      ],
    ],
    example:
      "A business exports appointments but discovers the file omits notes needed for delivery. Finding this before cancellation lets them investigate an appropriate supported export. A successful download alone would have given false confidence.",
    checklist: [
      "List data and integrations.",
      "Check supported export and retention.",
      "Test representative imports and access.",
      "Agree cutover and fallback before cancellation.",
    ],
    helpPrompt:
      "Could someone help me make a migration checklist for our scheduling tool? I need an authorised process using test records first, without exposing customer notes.",
    nextStep: { label: "Request technical support", href: "/find-help" },
    sources: ["privacy", "cyber"],
  },
  {
    slug: "decide-when-a-spreadsheet-is-enough",
    title: "When is a spreadsheet enough for your business process?",
    category: "Buying better",
    description:
      "Judge complexity, access and reliability before replacing a simple working system.",
    intro:
      "A spreadsheet can be a sensible early tool, but it can also become a fragile business dependency. The decision depends on the task, data, users and consequences of error, rather than whether software looks more professional.",
    sections: [
      [
        "Check the actual risks",
        "Consider who can edit, what personal information is stored, whether changes are traceable and how mistakes are detected. Important calculations need checking. Backups and access controls matter. A spreadsheet shared through the wrong link can be riskier than its simple appearance suggests.",
      ],
      [
        "Set a replacement trigger",
        "Look for repeated version conflicts, duplicated entry, missed handovers or access needs the sheet cannot reasonably support. Estimate the work saved by a replacement and the cost of migration. Do not switch merely to avoid improving unclear definitions; a new tool can reproduce the same confusion.",
      ],
    ],
    example:
      "A one-person quote register works well with protected access and consistent statuses. Once several people need simultaneous approvals and a reliable audit history, a more suitable system may earn its place. The trigger is the workflow, not business size alone.",
    checklist: [
      "Identify errors and their consequences.",
      "Check access and backups.",
      "Define a measurable replacement trigger.",
      "Compare migration work with actual benefit.",
    ],
    helpPrompt:
      "Could someone review a blank process layout and help me decide whether it needs software yet? I want to understand the risks before buying another subscription.",
    nextStep: {
      label: "Compare the practical costs",
      href: "/tools/business-cost-comparison",
    },
    sources: ["privacy", "cyber"],
  },
];
