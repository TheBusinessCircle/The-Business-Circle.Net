import type { BcnBlogDraft } from "./types";
export const review: BcnBlogDraft[] = [
  {
    slug: "run-a-short-monthly-business-review",
    title: "A monthly business review that ends with a decision",
    category: "Review and improve",
    description:
      "Look at demand, delivery, money and one next action without creating a reporting project.",
    intro:
      "A business review should help you decide what to change, protect or investigate. Keep it short enough to repeat. A few reliable facts are more useful than a large dashboard filled with uncertain numbers.",
    sections: [
      [
        "Use four practical views",
        "Review suitable enquiries and bookings, delivery and complaints, collected cash and commitments, and your capacity. Compare with previous assumptions rather than a target you invented after the result. Keep revenue, profit and cash distinct. Use appropriate accounting support for financial interpretation.",
      ],
      [
        "Choose one priority",
        "Record what improved, what became harder and what you still do not know. Pick one meaningful action with an owner and date. Preserve the previous note so you can check whether last month's decision helped. Avoid replacing the whole strategy because of one unusual week.",
      ],
    ],
    example:
      "A business finds enquiries increased but quotes took longer to send. The next action is a clearer scope template and a response routine, rather than immediately buying more advertising. The following review checks whether the delay reduced.",
    checklist: [
      "Review demand, delivery, money and capacity.",
      "Separate facts from explanations.",
      "Check the previous action.",
      "Choose one owned next decision.",
    ],
    helpPrompt:
      "Could someone help me simplify a blank monthly review so it leads to one useful action rather than more reporting?",
    nextStep: { label: "Ask a practical review question", href: "/ideas" },
  },
  {
    slug: "choose-small-business-metrics-that-mean-something",
    title: "Choose business numbers that tell you what happened",
    category: "Review and improve",
    description:
      "Distinguish visits, enquiries, suitable leads, completed work and collected revenue.",
    intro:
      "A metric is useful when its definition is clear. Visits, messages and registered accounts show different kinds of activity. None automatically means a satisfied customer or money earned.",
    sections: [
      [
        "Define each stage",
        "Write what counts as an enquiry, a suitable request, a quote, an accepted job, completed work and collected payment. Keep refunds and cancellations visible. Use consistent periods and avoid counting the same event twice. Unknown data should remain unknown instead of being entered as zero.",
      ],
      [
        "Link numbers to a decision",
        "Choose a small set you can act on. If many suitable enquiries never receive a quote, inspect the handover. If bookings are strong but cash is weak, inspect timing and collection. With small samples, avoid presenting percentage changes as reliable trends without context.",
      ],
    ],
    example:
      "Ten new enquiries include three duplicates and four outside the service area. Reporting ten qualified leads would misrepresent the result. A clear definition gives three potentially suitable enquiries to investigate.",
    checklist: [
      "Write a definition for each stage.",
      "Remove duplicates appropriately.",
      "Separate activity from receipts.",
      "Show the period and uncertainty.",
    ],
    helpPrompt:
      "Could someone challenge the definitions in a small enquiry report? I want suitable requests and real payments counted separately.",
    nextStep: {
      label: "Review your business model assumptions",
      href: "/tools/profit-break-even-calculator",
    },
  },
  {
    slug: "run-one-business-improvement-experiment",
    title: "Run one small business improvement experiment",
    category: "Review and improve",
    description:
      "Make a controlled change with a question, time limit and honest review.",
    intro:
      "An improvement experiment does not need sophisticated software. It needs a clear question and a change you can observe. Keep the risk small and protect customer rights and service quality throughout.",
    sections: [
      [
        "Write the hypothesis",
        "Say what you believe is happening and why one change might help. Choose a suitable measure and time period. Record the starting state. Do not treat a simple before-and-after comparison as proof of causation when demand, season or other changes could explain the result.",
      ],
      [
        "Review the whole effect",
        "Check unintended consequences and staff or customer feedback, not only the preferred number. Decide whether to keep, adjust or reverse the change. A result that challenges your expectation is useful. Avoid changing several important variables at once if you want to learn which one mattered.",
      ],
    ],
    example:
      "A business makes the service area clearer on its enquiry page and records the mix of incoming requests. A later improvement is promising, but the owner also notes the period was small and another campaign changed. They keep investigating rather than claiming certainty.",
    checklist: [
      "Write one testable question.",
      "Make a bounded reversible change.",
      "Record context and limitations.",
      "Decide whether to keep, alter or reverse.",
    ],
    helpPrompt:
      "Could someone help me design a small enquiry-page experiment with a sensible measure and no exaggerated claim about the result?",
    nextStep: {
      label: "Check your website journey",
      href: "/tools/website-health-checklist",
    },
  },
  {
    slug: "use-customer-complaints-to-fix-a-process",
    title: "Learn from a complaint without reducing it to a bad review",
    category: "Review and improve",
    description:
      "Address the customer's issue and then investigate the process behind it.",
    intro:
      "A complaint needs a fair response in its own right. Once the immediate issue is handled appropriately, it can also reveal unclear expectations or a delivery gap. Do not ask a customer to accept less simply because you want a learning opportunity.",
    sections: [
      [
        "Establish what happened",
        "Listen, record the relevant facts and compare them with the agreement and applicable rights. Keep personal information private. Explain the response route and a realistic update time. Seek suitable professional advice where the circumstances require it, especially before making legal assertions.",
      ],
      [
        "Look for a repeatable correction",
        "Ask whether the issue arose from unclear scope, missed communication, a faulty process or something else. Correct the cause where possible and check the change later. Do not publish the complaint as a marketing story without appropriate permission or blame an identifiable customer in a public discussion.",
      ],
    ],
    example:
      "Several customers misunderstand what a basic visit includes. The business addresses individual complaints fairly and then clarifies the scope before booking. A rewritten description complements, rather than replaces, the appropriate remedy for existing cases.",
    checklist: [
      "Respond to the actual issue.",
      "Check facts, agreement and rights.",
      "Identify a process correction.",
      "Review whether the correction helped.",
    ],
    helpPrompt:
      "Could someone help me analyse an anonymised pattern of scope misunderstandings? I want to improve the process without sharing private complaint details.",
    nextStep: {
      label: "Find relevant professional support",
      href: "/find-help",
    },
  },
  {
    slug: "review-a-business-partnership-before-renewing",
    title: "Review a partnership before simply renewing it",
    category: "Review and improve",
    description:
      "Assess customer benefit, responsibilities, actual outcomes and any commercial arrangement.",
    intro:
      "A partnership can continue out of habit even when the original purpose has faded. A review gives both businesses a chance to check whether the arrangement still helps customers and whether responsibilities remain clear.",
    sections: [
      [
        "Return to the original purpose",
        "List the customer situation the partnership was meant to support, what each side actually delivered and any unresolved problems. Distinguish introductions from completed work and verified fees. Check disclosure, consent and relevant terms. Do not exchange private customer outcomes merely to make a report more detailed.",
      ],
      [
        "Agree the next version",
        "Keep what works, clarify handovers and stop promises neither side can support. Record how referrals, complaints, changes and exit will be handled. A relationship can remain friendly without continuing every commercial element. Confirm any agreed payment changes separately and clearly.",
      ],
    ],
    example:
      "Two providers find their introductions are useful, but customers are confused about who invoices. They clarify separate contracting and billing before renewing the arrangement. A referral count alone would have missed the practical problem.",
    checklist: [
      "Check customer benefit and fit.",
      "Review actual outcomes and problems.",
      "Clarify responsibility and disclosure.",
      "Record the revised agreement or exit.",
    ],
    helpPrompt:
      "Could someone help me prepare neutral review questions for a small referral partnership? I want to discuss customer experience as well as fees.",
    nextStep: {
      label: "Read BCN's introduction approach",
      href: "/how-we-work",
    },
  },
  {
    slug: "decide-which-business-idea-to-work-on-next",
    title: "Choose the next business idea without chasing every possibility",
    category: "Review and improve",
    description:
      "Compare ideas against customer need, evidence, capacity and cost before committing.",
    intro:
      "New ideas arrive faster than most businesses can deliver them. Capture them without treating each as urgent. A simple comparison helps protect current commitments while keeping useful possibilities available.",
    sections: [
      [
        "Use the same questions",
        "For each idea, record the customer problem, evidence, expected contribution, time, cost, risks and dependencies. Label estimates honestly. Ask whether it strengthens the current business or introduces a different one. A high score is a thinking aid, not proof of demand or guaranteed income.",
      ],
      [
        "Choose a small next test",
        "Place ideas into now, later or waiting for evidence. Limit active work to what capacity supports. Give the selected idea one bounded experiment and a review point. Keep the reason for deferring an idea so it does not return every week as an apparently new priority.",
      ],
    ],
    example:
      "An owner compares a new service with fixing a slow quote process. Existing enquiries are waiting, so the process improvement comes first. The service idea remains recorded with a clear test for a later available week.",
    checklist: [
      "Record ideas in one place.",
      "Compare them using consistent questions.",
      "Respect current delivery capacity.",
      "Choose one bounded next test.",
    ],
    helpPrompt:
      "Could someone challenge my choice between two small improvement ideas using customer need and available time? I want a reasoned trade-off rather than encouragement to do both.",
    nextStep: { label: "Map the next milestone", href: "/start" },
  },
  {
    slug: "update-old-business-content-without-faking-freshness",
    title: "Update an old guide because the answer changed",
    category: "Review and improve",
    description:
      "Check facts, links and usefulness instead of changing the date to make a page look new.",
    intro:
      "An older guide can remain useful if it still answers the question accurately. Update it when information changes or the explanation can improve. A fresh date alone does not make the content better.",
    sections: [
      [
        "Check the substance",
        "Review the task, examples, current official sources and links. Remove unsupported claims and identify outdated prices or rules. Keep useful existing URLs where practical. If a subject needs specialist review, obtain it rather than disguising uncertainty with confident wording.",
      ],
      [
        "Record meaningful changes",
        "Use an updated date when a substantive review or change justifies it and explain important corrections where appropriate. Do not claim personal experience, customer results or professional review that did not happen. Add a useful next step if the reader previously reached a dead end.",
      ],
    ],
    example:
      "A guide's software comparison no longer reflects current terms. The owner removes unverified prices and explains how to compare live offers. They preserve the helpful decision framework and do not claim the guide is newly researched merely because its date changed.",
    checklist: [
      "Check the actual answer and examples.",
      "Verify changing facts and links.",
      "Remove unsupported claims.",
      "Record meaningful changes honestly.",
    ],
    helpPrompt:
      "Could someone review one older guide for stale assumptions and broken decision steps? I want substantive corrections rather than a cosmetic rewrite.",
    nextStep: { label: "Explore practical advice", href: "/advice" },
    sources: ["google"],
  },
  {
    slug: "plan-the-next-quarter-of-a-small-business",
    title: "Plan the next quarter around one useful business improvement",
    category: "Review and improve",
    description:
      "Use recent evidence to choose a manageable priority and the work that supports it.",
    intro:
      "A quarterly plan is easier to use when it contains a few real choices. Start with the business as it is: current customers, delivery, costs and capacity. Do not fill the calendar simply because a planning template has empty boxes.",
    sections: [
      [
        "Review before setting targets",
        "Look at what customers asked for, what work left a useful contribution, what consumed time and which commitments already exist. Distinguish facts from ambitions. Identify one constraint or opportunity with evidence behind it. Use suitable professional support for consequential financial or legal decisions.",
      ],
      [
        "Build a realistic sequence",
        "Choose one main improvement, define what completion means and work backwards to a few milestones. Assign time, responsibility and a review date. Keep routine delivery and personal capacity in the plan. If assumptions change, update the sequence openly rather than pretending the original forecast was certain.",
      ],
    ],
    example:
      "A service owner chooses to reduce enquiry-to-quote delay. The quarter contains a scope template, a controlled trial and a review of suitable enquiries and customer feedback. Adding three new service lines waits until the current journey works reliably.",
    checklist: [
      "Review recent evidence.",
      "Choose one main improvement.",
      "Define completion and milestones.",
      "Reserve capacity and a review point.",
    ],
    helpPrompt:
      "Could someone help me turn one business priority into three realistic quarterly milestones? I want a plan that fits delivery commitments rather than an oversized wishlist.",
    nextStep: { label: "Ask for help with the next milestone", href: "/ideas" },
  },
];
