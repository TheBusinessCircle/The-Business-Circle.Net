import type { BcnBlogDraft } from "./types";
export const marketing: BcnBlogDraft[] = [
  {
    slug: "ask-for-an-honest-customer-review",
    title: "Ask for a customer review without scripting the praise",
    category: "Trust and marketing",
    description:
      "Make feedback optional, genuine and useful while respecting the platform's rules.",
    intro:
      "A genuine review helps a future customer understand the experience. You can make leaving one easier without deciding what the customer should say. An awkward or manufactured review request undermines the trust you wanted to build.",
    sections: [
      [
        "Ask after an appropriate moment",
        "Use a relevant completed-service conversation and make the request optional. Provide the correct review route. Do not write the review for the customer, invent experiences or pressure them to remove criticism. Check the current rules of the review platform, particularly around incentives and selectively asking only happy customers.",
      ],
      [
        "Keep feedback and publication distinct",
        "A private thank-you message is not automatically permission to publish a testimonial with a name or photo. Ask for the specific use and preserve the meaning. If feedback describes a problem, address it rather than treating the review request as a way to hide it.",
      ],
    ],
    example:
      "A repairer sends the customer the review link after checking the repair is complete. They ask for an honest account of the experience, not 'five stars'. A private complaint goes through the support process rather than being exchanged for a promised good review.",
    checklist: [
      "Check the platform's current rules.",
      "Keep the request optional.",
      "Do not script or filter the verdict.",
      "Obtain permission for separate testimonial use.",
    ],
    helpPrompt:
      "Could someone check my short review request for pressure or unclear wording? I want genuine feedback and no incentive that breaks the platform rules.",
    nextStep: {
      label: "Discuss a practical marketing question",
      href: "/ideas",
    },
    sources: ["ads"],
  },
  {
    slug: "write-a-small-business-case-study-honestly",
    title: "Write a case study without turning a good result into a wild claim",
    category: "Trust and marketing",
    description:
      "Explain the starting problem, actual work, evidence and limits with customer permission.",
    intro:
      "A useful case study shows how you approached a real problem. It does not need a dramatic percentage. Clear evidence and honest boundaries are more persuasive than a result you cannot substantiate.",
    sections: [
      [
        "Document what changed",
        "Describe the situation, agreed work and observable result. Distinguish customer-reported feedback from measured data. Record the time period and relevant limits. If several changes happened together, do not automatically attribute all improvement to your contribution. Obtain permission for the details you plan to publish.",
      ],
      [
        "Use evidence you can stand behind",
        "A screenshot needs context and privacy checks. Revenue requires reliable evidence and a clear basis; an enquiry is not a sale. If the project is too new for outcome data, explain the delivered improvement instead. Do not fabricate a customer story to fill a gap in your portfolio.",
      ],
    ],
    example:
      "A developer can show that an enquiry form now delivers a synthetic test message and provides clear confirmation. That is a verified functional result. Claiming the repair doubled the customer's income would require very different evidence.",
    checklist: [
      "Get specific publication permission.",
      "Separate delivered work from outcomes.",
      "Label reported and measured results.",
      "Include the timeframe and limits.",
    ],
    helpPrompt:
      "Could someone challenge the evidence in a draft case study? I want to remove any claim that goes beyond what the project records actually show.",
    nextStep: { label: "Find a useful peer review", href: "/ideas" },
  },
  {
    slug: "plan-business-posts-from-customer-questions",
    title: "Find useful post ideas in questions customers already ask",
    category: "Trust and marketing",
    description:
      "Build a small content list around real decisions instead of posting for the sake of activity.",
    intro:
      "You do not need a new motivational message every day. Useful business content often starts with a question customers repeatedly ask before buying, using or maintaining your service.",
    sections: [
      [
        "Collect questions safely",
        "Write the question in general terms without customer names or private details. Group questions around choosing a service, preparing for work, understanding price and looking after the result. Prioritise questions you can answer accurately from your own expertise. Where specialist rules apply, link to current authoritative guidance or seek an appropriate review.",
      ],
      [
        "Give the reader a completed task",
        "A post should let someone understand or do something, even if they never buy. Include a specific example, a limitation and a suitable next step. Avoid stretching one answer across numerous near-identical pages merely to target keywords. Revisit existing useful pages when the answer changes.",
      ],
    ],
    example:
      "A floor fitter turns 'Do I move the furniture before you arrive?' into a clear preparation guide. It helps booked customers, reduces avoidable delays and gives prospective buyers a better understanding of the process.",
    checklist: [
      "List ten genuine recurring questions.",
      "Remove identifying details.",
      "Choose one answer you can substantiate.",
      "Finish with a practical action.",
    ],
    helpPrompt:
      "I have six anonymised customer questions. Could someone help me choose the one that would make the most useful first guide?",
    nextStep: { label: "Explore practical business guides", href: "/advice" },
    sources: ["google"],
  },
  {
    slug: "check-your-google-business-profile-basics",
    title: "Check the basics of your Google Business Profile",
    category: "Trust and marketing",
    description:
      "Review accurate business details and eligibility rather than chasing ranking promises.",
    intro:
      "A business listing is useful when a customer can rely on it. Start with truthful representation and current information. Do not create extra locations or add keywords to a business name just because someone promises better rankings.",
    sections: [
      [
        "Check eligibility and representation",
        "Use Google's current guidelines for whether and how the business can have a profile. Confirm the genuine name, business category, contact details and appropriate location or service-area setup. An online-only business should not assume it qualifies. Do not expose a home address merely to copy another listing.",
      ],
      [
        "Inspect the customer journey",
        "Follow the website and contact links. Review opening hours, including relevant changes, and ensure photographs represent the real business. Keep ownership and recovery access under business control. Accurate information supports customers; it is not a guarantee of a particular map position or number of calls.",
      ],
    ],
    example:
      "A mobile service business discovers its listing links to an old enquiry page. Updating the correct destination resolves a concrete obstacle. It does not justify claiming a guaranteed increase in search visibility.",
    checklist: [
      "Check current eligibility guidance.",
      "Confirm truthful business details.",
      "Test website and contact links.",
      "Secure owner access and recovery.",
    ],
    helpPrompt:
      "Could someone check the accuracy of my public business listing against my own service details? I am not looking for fabricated locations or ranking guarantees.",
    nextStep: {
      label: "Check the linked website too",
      href: "/tools/website-health-checklist",
    },
    sources: ["local"],
  },
  {
    slug: "helpful-content-without-posting-every-day",
    title: "Do you need to post every day to market a small business?",
    category: "Trust and marketing",
    description:
      "Choose a sustainable content rhythm based on usefulness, delivery time and real enquiries.",
    intro:
      "A publishing schedule is a work commitment, not proof that marketing is succeeding. Choose a rhythm you can maintain while doing the actual customer work. Measure whether the content helps a relevant person take a useful step.",
    sections: [
      [
        "Start with quality and a purpose",
        "Give each piece one job: explain a service, answer a question, show genuine work or help someone make a decision. Reserve time for checking accuracy and responding appropriately. Repeating a weak message more often does not make it stronger. Search visibility depends on more than frequency.",
      ],
      [
        "Review the full cost",
        "Count writing, images, editing, posting and follow-up time. Compare suitable enquiries and meaningful customer actions, while accepting attribution limits. Keep an existing useful guide current rather than changing its date without meaningful updates. If the workload crowds out delivery, reduce the cadence or narrow the format.",
      ],
    ],
    example:
      "A sole trader chooses one well-explained preparation guide and one genuine project note each month. They can answer replies and maintain accuracy. Daily generic posts would consume more time without a clear purpose.",
    checklist: [
      "Choose the reader and task.",
      "Budget preparation and response time.",
      "Pick a repeatable realistic rhythm.",
      "Review useful outcomes rather than post counts.",
    ],
    helpPrompt:
      "Could someone help me choose a realistic content routine for two available hours a week? I want to answer real customer questions rather than fill a calendar.",
    nextStep: { label: "Ask for a focused contribution", href: "/ideas" },
    sources: ["google"],
  },
  {
    slug: "explain-affiliate-links-and-paid-recommendations",
    title: "Make paid recommendations clear before someone clicks",
    category: "Trust and marketing",
    description:
      "Keep commissions and commercial relationships visible while preserving an honest recommendation.",
    intro:
      "A recommendation can still be useful when a business earns a commission, provided the relationship is clear and the advice fits the person's needs. Hiding the commercial reason makes it harder for them to judge the suggestion.",
    sections: [
      [
        "Disclose at the decision point",
        "Use clear wording where the recommendation appears, not only in a distant policy page. Explain the relevant relationship and follow current advertising guidance. Do not imply an approved partnership where none exists or invent savings and benefits. Commission should not determine whether a product is a good fit.",
      ],
      [
        "Keep alternatives available",
        "Explain who the product suits, its limitations and when an existing or free option may be enough. Verify current prices and terms before quoting them. A click is not a purchase or earned revenue. Keep any commission evidence separate from estimates and referral activity.",
      ],
    ],
    example:
      "A guide recommending bookkeeping software explains that an approved referral link may earn commission and describes the features relevant to the task. It also says when a simple existing record system may be adequate. The reader can decide with the relationship visible.",
    checklist: [
      "Verify the actual commercial relationship.",
      "Disclose it close to the recommendation.",
      "Explain fit and limitations.",
      "Separate clicks from verified commission.",
    ],
    helpPrompt:
      "Could someone review the disclosure and comparison structure for a software recommendation? I need the commercial relationship clear before the reader clicks.",
    nextStep: { label: "Read how BCN works and earns", href: "/how-we-work" },
    sources: ["disclosure"],
  },
  {
    slug: "turn-one-useful-guide-into-several-formats",
    title: "Reuse a useful guide without flooding people with the same message",
    category: "Trust and marketing",
    description:
      "Adapt one accurate explanation for different customer tasks and channels.",
    intro:
      "Reusing good work can save time. The point is to make the explanation useful in a different setting, rather than paste the same paragraph everywhere and call it a strategy.",
    sections: [
      [
        "Keep a reliable source version",
        "Choose one guide as the maintained explanation. Check its facts and examples before deriving shorter versions. A checklist, short demonstration and brief answer can each help a different reader. Link back where more context is necessary. Do not remove an important qualification just to make a more dramatic headline.",
      ],
      [
        "Adapt to the task",
        "A customer email may explain preparation for a booked service. A public post may help someone recognise the same question before booking. Follow channel rules and consent requirements. Track where versions are used so a later change does not leave contradictory instructions circulating.",
      ],
    ],
    example:
      "A decorator's room-preparation guide becomes a booking checklist and a short video showing access requirements. Each version serves the same practical need at a different moment. None implies that a stock demonstration is a real customer's completed job.",
    checklist: [
      "Maintain one source explanation.",
      "Choose a distinct use for each format.",
      "Preserve important qualifications.",
      "Record versions that need future updates.",
    ],
    helpPrompt:
      "Could someone help turn one preparation guide into a concise booking checklist? I want the important instructions preserved, not exaggerated for engagement.",
    nextStep: { label: "Offer or request a specific skill", href: "/ideas" },
    sources: ["ads"],
  },
  {
    slug: "judge-marketing-help-before-buying",
    title: "Questions to ask before buying marketing help",
    category: "Trust and marketing",
    description:
      "Clarify the work, evidence, account ownership and measurement before agreeing to a package.",
    intro:
      "A marketing proposal should explain what will be done and why it fits your business. Activity counts alone do not show value. Ask how the provider will connect their work to a realistic business goal without guaranteeing outcomes they cannot control.",
    sections: [
      [
        "Ask for the actual deliverables",
        "Clarify the channels, content, research, technical work, reporting and exclusions. Ask what input and approvals they need from you. Understand the total cost, including advertising spend and tools. Examples of relevant past work should be genuine and appropriately contextualised, not evidence of guaranteed future results.",
      ],
      [
        "Keep control of your assets",
        "Agree who owns accounts, content, domains and data and how access ends. Ask how enquiries, suitable leads and collected revenue will be distinguished. A report should show limitations as well as progress. Avoid signing solely because a provider predicts a particular ranking or effortless passive income.",
      ],
    ],
    example:
      "A shop compares two proposals. One promises daily posts; the other defines a focused enquiry journey, required changes and a measurement plan. The owner asks both providers to explain scope and evidence before deciding which, if either, fits.",
    checklist: [
      "Identify the business problem.",
      "Compare defined deliverables and full costs.",
      "Confirm account ownership and exit terms.",
      "Ask how outcomes and uncertainty are reported.",
    ],
    helpPrompt:
      "Could someone help me compare two anonymised marketing proposals on scope, ownership and measurement? I do not need anyone contacting the providers on my behalf.",
    nextStep: {
      label: "Compare the ongoing costs",
      href: "/tools/business-cost-comparison",
    },
  },
];
