import type { BcnBlogDraft } from "./types";
export const growth: BcnBlogDraft[] = [
  {
    slug: "check-demand-before-hiring-help",
    title: "Is the business ready for help, or just having a busy fortnight?",
    category: "Growing carefully",
    description:
      "Look at repeated demand, capacity and the actual work before making a hiring decision.",
    intro:
      "A busy spell can reveal a capacity problem, but it can also be temporary. Before making an ongoing commitment, establish which work repeats and what support would actually change.",
    sections: [
      [
        "Identify the bottleneck",
        "Track where work waits, what only you can do and what could be documented or delegated. Separate avoidable rework from genuine demand. Consider seasonal patterns and already committed work. A full diary with weak contribution needs a pricing and scope review too, not automatically another person.",
      ],
      [
        "Cost the whole arrangement",
        "Employment, contracting and outsourcing have different responsibilities. Do not choose a label to avoid obligations. Use current Acas and professional guidance for the actual arrangement. Include supervision, training, equipment, cover and administration in the decision, and check that cash timing supports the commitment.",
      ],
    ],
    example:
      "An owner spends six repeatable hours a week organising appointments. They first clarify the process and service standard, then assess suitable support. This is a more defined need than 'someone to help with everything'.",
    checklist: [
      "Track recurring work and delays.",
      "Separate a temporary peak from a pattern.",
      "Define the actual role or service.",
      "Check full costs and responsibilities.",
    ],
    helpPrompt:
      "Could someone help me distinguish a recurring admin role from a short-term busy spell? I want to define the work before choosing an arrangement.",
    nextStep: {
      label: "Find relevant professional support",
      href: "/find-help",
    },
    sources: ["hiring"],
  },
  {
    slug: "write-a-brief-for-a-freelancer",
    title: "Write a freelancer brief that makes the outcome clear",
    category: "Growing carefully",
    description:
      "Set out deliverables, inputs, review points and rights before commissioning work.",
    intro:
      "A freelancer cannot reliably deliver an outcome that only exists in your head. A short clear brief reduces wasted work and makes it easier to agree a fair price. Keep it focused on the actual task.",
    sections: [
      [
        "Describe the result and constraints",
        "State the audience, required output, format, deadline, budget context and examples that explain your preferences. Mark what is fixed and what is open to suggestions. Identify who supplies content, assets and approvals. Avoid sharing confidential files until a suitable arrangement and access method exist.",
      ],
      [
        "Agree review and handover",
        "Clarify revision rounds, approval responsibilities, payment terms and what happens if scope changes. Set out the relevant ownership and licensing position. Do not assume a sample, draft or editable source file is automatically included. Establish the rights you actually need before work begins.",
      ],
    ],
    example:
      "A business commissions a two-page product leaflet and supplies final text and authorised photographs. The brief names print dimensions, output files and one review stage. A new logo is explicitly outside the task.",
    checklist: [
      "Name the final deliverable.",
      "List inputs and approval owners.",
      "Agree reviews and scope changes.",
      "Clarify rights and final files.",
    ],
    helpPrompt:
      "Could someone review a one-page design brief and point out decisions the freelancer would otherwise have to guess?",
    nextStep: { label: "Ask for a focused review", href: "/ideas" },
    sources: ["ip"],
  },
  {
    slug: "delegate-a-task-without-sharing-all-your-accounts",
    title: "Delegate a task without handing over the whole business",
    category: "Growing carefully",
    description:
      "Use bounded permissions, clear instructions and a planned access review.",
    intro:
      "Giving someone a job does not mean they need every account and every customer record. Define the task first, then give the minimum appropriate access. Clear limits protect the helper as well as the business.",
    sections: [
      [
        "Match access to the task",
        "Use individual or delegated accounts where supported. Avoid sharing primary passwords or recovery codes. Explain what the person may read, change, publish or spend, and which actions require your approval. Check privacy responsibilities for any personal information involved.",
      ],
      [
        "Make completion and removal routine",
        "Set a review point, check the delivered work and remove access that is no longer needed. Keep business recovery under appropriate control. If a tool cannot support suitable access, consider a safer workflow rather than sending credentials in ordinary messages. Record the handover without copying secrets into the task log.",
      ],
    ],
    example:
      "A helper updating opening hours receives an appropriate editor role. They do not receive payment settings or a customer export. The owner checks the public change and removes temporary access after completion.",
    checklist: [
      "Define permitted actions.",
      "Use suitable individual access.",
      "Keep recovery details protected.",
      "Review the work and end temporary permissions.",
    ],
    helpPrompt:
      "Could someone help me plan safe access for a short website task? I need the right permission level, not instructions to share my main password.",
    nextStep: { label: "Request suitable technical help", href: "/find-help" },
    sources: ["cyber", "privacy"],
  },
  {
    slug: "write-a-useful-first-day-handover",
    title: "Help a new colleague understand the job on day one",
    category: "Growing carefully",
    description:
      "Prepare essential information, safe access and a clear first task.",
    intro:
      "A new colleague needs context and support, not a pile of undocumented tasks. Preparing an induction helps them understand how work is done and where to ask questions. It also reveals gaps in your own process.",
    sections: [
      [
        "Prepare the essentials",
        "Explain the role, working arrangements, relevant policies, safety responsibilities and support contacts. Arrange suitable equipment and access. Follow current employment and safety requirements for your circumstances. Do not treat this short planning exercise as a complete legal or safety induction.",
      ],
      [
        "Give a supported first task",
        "Choose a manageable piece of work with clear instructions and a named person to ask. Check understanding without making the person guess. Schedule a review and explain how errors should be raised. Appropriate training and supervision matter more than assuming experience means no support is needed.",
      ],
    ],
    example:
      "A new administrator first learns the enquiry statuses and observes a handover before taking responsibility for one supervised case. They know how to flag a complaint and which changes they are not authorised to make.",
    checklist: [
      "Prepare role and essential information.",
      "Arrange safe equipment and access.",
      "Name a support contact.",
      "Choose a supported first task and review.",
    ],
    helpPrompt:
      "Could someone help me structure a first-day checklist and identify which parts need proper HR or safety advice?",
    nextStep: { label: "Find professional business help", href: "/find-help" },
    sources: ["hiring"],
  },
  {
    slug: "say-no-to-work-that-does-not-fit",
    title: "Say no to work that your business cannot deliver well",
    category: "Growing carefully",
    description:
      "Protect capacity and customer trust by recognising unsuitable scope and timing.",
    intro:
      "Taking every enquiry can leave less room for the work your business does best. A clear decline is better than an unsupported promise. Establish what makes a job unsuitable before you are under pressure to accept it.",
    sections: [
      [
        "Define your boundaries",
        "List services, locations, specialist requirements and deadlines you can realistically support. Consider competence, insurance, equipment and obligations relevant to the work. A job can be attractive financially and still sit outside your safe capability. Do not learn safety-critical work on an unsuspecting customer's project.",
      ],
      [
        "Decline with a useful explanation",
        "Explain briefly which requirement you cannot meet. If you offer another provider, be clear about your knowledge and any commercial relationship, and obtain permission before sharing details. Avoid promising that someone else can deliver without checking. Keep the customer free to choose.",
      ],
    ],
    example:
      "A general repair business declines specialist electrical work beyond its competence. It explains the limit and suggests the customer seek an appropriately qualified provider. The business protects trust by recognising the boundary.",
    checklist: [
      "Define capability and capacity limits.",
      "Check the actual request against them.",
      "Decline promptly and respectfully.",
      "Make any referral transparent and permission-based.",
    ],
    helpPrompt:
      "Could someone review a polite decline for a job outside my service scope? I want to be clear without criticising the customer or inventing another provider's availability.",
    nextStep: {
      label: "Find appropriate business support",
      href: "/find-help",
    },
  },
  {
    slug: "test-a-new-service-before-a-full-launch",
    title: "Test a new service without rebuilding the whole business",
    category: "Growing carefully",
    description:
      "Bound the audience, scope, capacity and review before adding a permanent service line.",
    intro:
      "An existing customer's request can reveal a useful new service. It can also pull the business into work that does not fit. Treat it as a defined test before adding it to every page and package.",
    sections: [
      [
        "Separate demand from one exception",
        "Record who needs the service, why existing alternatives are insufficient and what delivery requires. Check relevant competence and obligations before offering it. Define a limited scope and capacity. Explain honestly that the service is a pilot where that is material to the customer's decision.",
      ],
      [
        "Measure the delivery as well as sales",
        "Track preparation, delivery, questions, rework and contribution. Ask whether the test displaced more suitable work. Agree a review date and a decision to continue, alter or stop. Do not confuse a busy first week with evidence that ongoing demand and capacity will match.",
      ],
    ],
    example:
      "A designer pilots a fixed homepage-review service for three customers. They track review and explanation time separately. The result informs the scope and price before the offer becomes an ongoing commitment.",
    checklist: [
      "Define the customer and need.",
      "Check capability and obligations.",
      "Limit scope and pilot capacity.",
      "Review real delivery effort and contribution.",
    ],
    helpPrompt:
      "Could someone challenge the scope of a small new-service pilot before I offer it? I want to test demand without promising indefinite support.",
    nextStep: {
      label: "Cost the pilot service",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "decide-what-to-automate-in-a-small-business",
    title: "Automate a stable task, not a confusing process",
    category: "Growing carefully",
    description:
      "Choose repeatable low-risk work and preserve human review for consequential decisions.",
    intro:
      "Automation repeats instructions efficiently, including bad ones. Start with a task you understand and can check. The best first automation is often small, reversible and easy to notice when it fails.",
    sections: [
      [
        "Describe the current steps",
        "Identify the trigger, inputs, actions, owner and exception route. Remove unnecessary steps before automating them. Consider privacy, permissions and cost. Avoid giving an unattended process broad authority to spend, delete records or make sensitive decisions simply because the tool permits it.",
      ],
      [
        "Test failure as well as success",
        "Use synthetic inputs and check duplicate triggers, missing information and service outages. Keep an audit trail without logging secrets or private content unnecessarily. Set a human review point and a way to pause. Recheck the process when the underlying service or business rule changes.",
      ],
    ],
    example:
      "A business drafts an internal reminder when a quote reaches an agreed review date. It does not automatically send repeated sales messages or cancel the quote. The owner retains the decision about appropriate contact.",
    checklist: [
      "Map a stable repeatable task.",
      "Limit permissions and costs.",
      "Test duplicates and failures.",
      "Assign an owner and pause mechanism.",
    ],
    helpPrompt:
      "Could someone help me assess one low-risk admin automation and identify the failure cases before I turn it on?",
    nextStep: {
      label: "Ask for a bounded technical contribution",
      href: "/ideas",
    },
    sources: ["privacy", "cyber"],
  },
  {
    slug: "grow-sales-without-breaking-customer-service",
    title: "More sales need a delivery plan too",
    category: "Growing carefully",
    description:
      "Check capacity, cash timing and support before encouraging a larger wave of orders.",
    intro:
      "Growth can expose a process that worked only because volume was low. Before pushing demand, check what happens if the campaign succeeds. A realistic plan protects customers from promises the business cannot fulfil.",
    sections: [
      [
        "Test the workload scenario",
        "Estimate enquiry handling, preparation, delivery, supplier needs and aftercare for a plausible increase. Use a range rather than a confident forecast. Identify the first bottleneck and the cash required before receipts arrive. Keep assumptions separate from committed orders.",
      ],
      [
        "Control the promise",
        "Use honest lead times and limited availability where capacity is genuinely limited. Agree how you will stop taking work or extend dates before service falls below the promised level. Review quality, complaints and delivery alongside sales. A larger order count is not a complete measure of a healthier business.",
      ],
    ],
    example:
      "A workshop promotion could fill twice the usual places, but materials and facilitator capacity are fixed. The organiser sets a real cap and a clear waiting process instead of accepting unlimited bookings and planning to solve delivery later.",
    checklist: [
      "Model a realistic demand increase.",
      "Identify the first delivery bottleneck.",
      "Check cash and supplier timing.",
      "Set honest capacity and lead times.",
    ],
    helpPrompt:
      "Could someone help me test whether our process could handle a small increase in orders before we spend on promotion?",
    nextStep: {
      label: "Check the sales and cost model",
      href: "/tools/profit-break-even-calculator",
    },
  },
];
