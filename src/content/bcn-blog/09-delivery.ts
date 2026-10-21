import type { BcnBlogDraft } from "./types";
export const delivery: BcnBlogDraft[] = [
  {
    slug: "plan-a-week-with-room-for-real-work",
    title: "Plan a business week that leaves room to deliver",
    category: "Getting work done",
    description:
      "Fit delivery, admin and uncertainty into the diary before promising more work.",
    intro:
      "A diary full of appointments is not a complete work plan. Preparation, messages, travel and checking still need somewhere to go. Plan the week from the capacity available rather than the workload you wish would fit.",
    sections: [
      [
        "Reserve the fixed commitments",
        "Mark agreed delivery dates and essential personal commitments first. Add realistic preparation and travel. Group routine admin where it helps, while leaving urgent customer matters a suitable route. Avoid booking every remaining minute; ordinary problems need a buffer.",
      ],
      [
        "Choose a short finish list",
        "Define a few outcomes you can reasonably complete, not twenty vague priorities. Separate work that must happen from work that would be useful. At the end of the week, compare planned and actual time. Use repeated overruns to improve the next plan rather than treating every delay as a personal failure.",
      ],
    ],
    example:
      "A repairer can attend six visits, but only if parts are ready and the route is practical. Reserving a preparation slot and travel buffer produces fewer impossible promises than filling every gap with another booking.",
    checklist: [
      "Mark fixed commitments.",
      "Include preparation and travel.",
      "Leave a practical buffer.",
      "Choose a small list of finished outcomes.",
    ],
    helpPrompt:
      "Could another service owner help me spot missing time in a sample weekly plan? I want to reduce overbooking rather than add more productivity software.",
    nextStep: { label: "Ask for practical experience", href: "/ideas" },
  },
  {
    slug: "make-a-repeatable-job-checklist",
    title: "Make a job checklist that prevents real omissions",
    category: "Getting work done",
    description:
      "Capture the few checks that matter before, during and after a repeatable task.",
    intro:
      "A checklist is useful when it prevents a missed step or makes a handover clearer. It does not need to document every movement. Start with the omissions that have actually caused delays, rework or customer confusion.",
    sections: [
      [
        "Use the job's natural stages",
        "Separate preparation, delivery and completion. Write specific checks with observable results. 'Check everything' is too vague; 'confirm the customer can open the delivered file' is testable. Safety-critical work requires appropriate professional procedures, not a casual checklist copied from another business.",
      ],
      [
        "Test on a real authorised job",
        "Try the list, record where it is unclear and remove irrelevant steps. Give the document an owner and revision date. A completed tick is not evidence if nobody actually performed the check. Review the list when the process or tools change.",
      ],
    ],
    example:
      "A print shop adds checks for approved artwork version, dimensions and delivery address. Those three points address recurring mistakes. The list is brief enough to use and links to specialist production procedures where needed.",
    checklist: [
      "Start with recurring omissions.",
      "Write observable checks.",
      "Try the list and revise it.",
      "Assign an owner and review date.",
    ],
    helpPrompt:
      "Could someone review a short job checklist and identify vague checks? I want practical completion criteria, not a long policy document.",
    nextStep: { label: "Get feedback on a small process", href: "/ideas" },
  },
  {
    slug: "handover-work-without-a-long-meeting",
    title: "Hand over a task without leaving the next person to investigate",
    category: "Getting work done",
    description:
      "Share the current state, next action, owner and necessary files in a secure place.",
    intro:
      "A handover fails when the next person has to reconstruct what happened from scattered messages. A short structured note can remove that guesswork. Share what they need, with appropriate access, rather than forwarding an entire private conversation.",
    sections: [
      [
        "Describe the current state",
        "State the task, agreed outcome, completed work, remaining work and any blocker. Name the next responsible person and date. Link to the right version of relevant documents. Separate facts from assumptions and identify decisions still awaiting approval.",
      ],
      [
        "Check that the handover works",
        "Ask the recipient to confirm they can access the necessary material and understand the next action. Use delegated access rather than sharing passwords. Remove unnecessary access when the task ends. A handover note supplements appropriate records; it should not become an uncontrolled copy of personal data.",
      ],
    ],
    example:
      "A colleague covering a customer enquiry receives the accepted quote, current schedule and one outstanding question. They do not receive unrelated customer emails or a password in a chat. They can continue from the agreed point.",
    checklist: [
      "Summarise current status.",
      "Name the next action and owner.",
      "Link the correct document version.",
      "Confirm access and remove excess permissions.",
    ],
    helpPrompt:
      "Could someone review my blank task-handover template and tell me whether another person could act from it without a meeting?",
    nextStep: { label: "Ask a focused process question", href: "/ideas" },
    sources: ["privacy", "cyber"],
  },
  {
    slug: "stop-small-projects-growing-without-agreement",
    title: "Stop a small project growing beyond the agreement",
    category: "Getting work done",
    description:
      "Recognise extra requests early and discuss choices before the deadline slips.",
    intro:
      "A project often grows one reasonable request at a time. The trouble begins when nobody discusses the combined effect. Keeping scope visible protects the original outcome and the relationship.",
    sections: [
      [
        "Maintain a simple change list",
        "Record additional requests separately from agreed work. For each, note the delivery effect, cost and decision required. Do not assume every request is an instruction to proceed. Equally, do not call something extra merely because you underestimated the work originally promised.",
      ],
      [
        "Offer clear choices",
        "Explain whether the customer can replace an existing item, extend the project through an agreed variation or save the addition for later. Keep decisions in writing. If a new request changes the purpose substantially, pause and re-brief rather than hiding it inside the original estimate.",
      ],
    ],
    example:
      "A simple event leaflet grows into social graphics and a booking page. The designer explains the separate deliverables and timing before starting them. The owner chooses the leaflet first and schedules the other items later.",
    checklist: [
      "Keep agreed scope accessible.",
      "Record new requests separately.",
      "Explain time and price effects.",
      "Obtain a decision before adding work.",
    ],
    helpPrompt:
      "Could someone help me present scope-change options clearly to a customer? I want to protect the original deadline without dismissing their new ideas.",
    nextStep: {
      label: "Prepare a clear scope quote",
      href: "/tools/quote-builder",
    },
  },
  {
    slug: "set-business-response-times-you-can-keep",
    title: "Set response times you can actually keep",
    category: "Getting work done",
    description:
      "Clarify when customers can expect a reply and how urgent issues should be handled.",
    intro:
      "Promising immediate replies can interrupt delivery and create disappointment. A useful response policy tells a customer when to expect contact and how to reach the right route for a genuine urgent issue.",
    sections: [
      [
        "Match the promise to capacity",
        "Use business hours and realistic coverage. Distinguish acknowledgement from a full answer and an answer from resolution. If your service cannot support emergencies, make that clear. Do not advertise round-the-clock support simply because a contact form is always available.",
      ],
      [
        "Keep the queue visible",
        "Use a reliable list of unanswered requests with an owner and next action. An automatic reply can explain expectations, but it does not mean the enquiry has been solved. Review repeated delays and reduce the promise or improve the process rather than quietly ignoring the target.",
      ],
    ],
    example:
      "A part-time consultant promises a response within two working days and states the days they work. A customer can make an informed choice. The promise is clearer than 'we respond as soon as possible' or an unrealistic one-hour guarantee.",
    checklist: [
      "Define business hours.",
      "Separate acknowledgement and resolution.",
      "Give urgent issues an appropriate route.",
      "Track unanswered requests and repeated delays.",
    ],
    helpPrompt:
      "Could someone read my enquiry response wording and tell me what timing they would reasonably expect from it?",
    nextStep: {
      label: "Review your enquiry journey",
      href: "/tools/website-health-checklist",
    },
  },
  {
    slug: "batch-business-admin-without-missing-deadlines",
    title: "Batch routine admin without hiding urgent work",
    category: "Getting work done",
    description:
      "Group repeatable tasks while keeping deadlines and customer problems visible.",
    intro:
      "Batching can reduce repeated setup time, but not every task can wait for Friday. Separate routine work from items with time-sensitive obligations. A tidy calendar is only useful if the important work still happens.",
    sections: [
      [
        "Sort by deadline and consequence",
        "List recurring tasks, their frequency and what happens if they are late. Establish suitable reminders for contractual, tax, payroll and other obligations with professional advice where needed. Group lower-risk tasks that use the same information or tools. Do not postpone customer safety or security issues to fit a batch.",
      ],
      [
        "Give each batch a finish rule",
        "For example, reconcile the relevant records, resolve discrepancies and record the next action for anything outstanding. Avoid a session labelled simply 'admin' with no clear end. Keep the underlying records current enough that another person can understand the business between batch sessions.",
      ],
    ],
    example:
      "A trader groups routine receipt filing into two short sessions, while overdue invoice queries and dated obligations remain on a separate action list. This saves context switching without turning the week into an administrative blind spot.",
    checklist: [
      "List recurring tasks and deadlines.",
      "Separate urgent and routine work.",
      "Group tasks using similar inputs.",
      "Define completion and exceptions.",
    ],
    helpPrompt:
      "Could someone help me sort a blank admin task list into routine batches and deadline-sensitive actions? I am not sharing tax or customer records publicly.",
    nextStep: { label: "Find admin or bookkeeping help", href: "/find-help" },
  },
  {
    slug: "review-a-job-that-took-too-long",
    title: "Learn from a job that took longer than expected",
    category: "Getting work done",
    description:
      "Separate estimation mistakes, changes and avoidable delays before changing every price.",
    intro:
      "An overrun is useful evidence if you break it down. 'The job took too long' does not tell you whether to improve estimating, clarify scope, change a process or charge differently next time.",
    sections: [
      [
        "Reconstruct the stages",
        "Compare estimated and actual time for preparation, travel, delivery and follow-up. Identify agreed extra work, waiting for information, rework and genuine surprises. Avoid collecting unnecessary employee or customer information. The purpose is to understand the process, not publicly assign blame.",
      ],
      [
        "Choose a specific correction",
        "A repeated estimation gap may need a new allowance. A missing input may need a pre-start check. A change request may need earlier approval. Re-cost a representative future job after making the correction. Do not use one unusual incident to justify claims about all customers or all work.",
      ],
    ],
    example:
      "A fitting job loses two hours because access was not ready. The owner adds an access confirmation to pre-start communication and reviews the actual terms. That targeted change is more informative than assuming every future installation needs two extra hours.",
    checklist: [
      "Compare estimated and actual stages.",
      "Identify the source of each difference.",
      "Choose one process correction.",
      "Check the effect on the next similar job.",
    ],
    helpPrompt:
      "Could someone help analyse an anonymised job overrun and identify whether the main issue was estimating, scope or preparation?",
    nextStep: {
      label: "Re-cost the next job",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "tell-a-customer-about-a-delay-early",
    title: "Tell a customer about a delay before they have to chase",
    category: "Getting work done",
    description:
      "Explain the impact, realistic options and next update without making another unsupported promise.",
    intro:
      "A delay becomes harder to manage when the customer has to discover it themselves. Give accurate information as soon as you understand the effect. A credible update is more useful than a reassuring date you cannot support.",
    sections: [
      [
        "Explain the customer impact",
        "State what has changed, which part of the work is affected and what remains on track. Avoid sharing someone else's private circumstances as an excuse. Check contractual obligations and customer rights when deciding the available options. Do not claim the delay has no effect if you have not assessed it.",
      ],
      [
        "Agree the next update",
        "Offer realistic choices and explain what you can confirm now. Where timing remains uncertain, say when you will have better information. Record the agreed action and follow through. An update should not quietly become an instruction for the customer to waive rights or accept a changed scope.",
      ],
    ],
    example:
      "A supplier cannot confirm a material delivery date. The contractor explains the affected stage, discusses appropriate alternatives and gives a specific update point. They do not invent a replacement completion date to end the conversation.",
    checklist: [
      "Check the actual impact.",
      "Explain promptly and factually.",
      "Offer suitable options.",
      "Record and keep the next update commitment.",
    ],
    helpPrompt:
      "Could someone review a delay update for clarity? I need it to explain uncertainty and options honestly without making promises I cannot yet keep.",
    nextStep: { label: "Ask for a short communication review", href: "/ideas" },
  },
];
