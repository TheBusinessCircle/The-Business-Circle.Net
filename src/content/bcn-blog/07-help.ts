import type { BcnBlogDraft } from "./types";
export const help: BcnBlogDraft[] = [
  {
    slug: "write-a-business-help-request-people-can-answer",
    title: "Write a business-help request someone can actually answer",
    category: "Helping each other",
    description:
      "Turn a broad dream into a specific request for experience, feedback or a bounded contribution.",
    intro:
      "People are more able to help when they understand the next obstacle. You do not need a polished business plan to ask. Explain what you are building, what you have tried and the particular contribution that would move it forward.",
    sections: [
      [
        "Give enough context",
        "Name the stage, customer or task and the next milestone. Say whether you need a short answer, a review or practical work. State relevant timing and whether you seek free, discounted, paid or skill-swap support. Avoid publishing passwords, customer records or details you need to keep confidential.",
      ],
      [
        "Make the request finishable",
        "Ask for one clear thing. 'Help me build my dream' can become 'Help me choose the first three questions for a customer interview'. A helper can then decide whether their experience fits. Advice is not automatically a promise of delivery, and a reply does not authorise unrelated sales messages.",
      ],
    ],
    example:
      "A new baker asks an experienced stallholder to review a checklist for their first permitted market event. They are asking about preparation and practical questions, not for someone to fund a bakery or do an unlimited business launch.",
    checklist: [
      "Describe the idea and current stage.",
      "State one obstacle and milestone.",
      "Explain the support type and time needed.",
      "Remove private information before posting.",
    ],
    helpPrompt:
      "I am testing a small local service. Could someone review my five customer questions and identify any that lead the answer? A short written response would be enough.",
    nextStep: { label: "Explore Build it together", href: "/ideas" },
  },
  {
    slug: "offer-free-business-help-with-boundaries",
    title: "Offer useful free help without committing to an endless project",
    category: "Helping each other",
    description:
      "Set a clear contribution, time limit and handover so free help remains generous and workable.",
    intro:
      "Free help is easier to give when both sides know what it includes. You can make a meaningful contribution in half an hour without taking responsibility for an entire business. A boundary helps the recipient plan too.",
    sections: [
      [
        "Define the contribution",
        "Say what you can review or deliver, what experience supports it and what is outside the scope. Give a realistic time or output limit. If you are learning, say so. Do not offer regulated or safety-critical professional advice beyond your competence. Never make a free offer conditional on an undisclosed purchase.",
      ],
      [
        "End with a useful handover",
        "Explain the findings, any limits and what the recipient can do next. Ask permission before using the work as a public example. If further work could be paid, discuss it separately without implying an obligation. A completed free contribution should still leave the person with something useful.",
      ],
    ],
    example:
      "A designer offers a twenty-minute review of a homepage heading and contact route. They return three observations and stop there. The owner is free to make the changes themselves, ask another helper or request a separate paid proposal.",
    checklist: [
      "Name a bounded contribution.",
      "State exclusions and timing.",
      "Disclose any commercial next step.",
      "Deliver a usable handover without obligation.",
    ],
    helpPrompt:
      "I can give one startup a short homepage clarity review this week. I will provide three written observations; it does not include development or require buying anything.",
    nextStep: { label: "Find a request you can help with", href: "/ideas" },
  },
  {
    slug: "offer-a-genuine-startup-discount",
    title: "Offer a startup discount that is clear and genuine",
    category: "Helping each other",
    description:
      "Explain the actual payable price, real comparison and service limits before someone accepts.",
    intro:
      "Discounted help can make good professional work more accessible. It only works when the owner can understand the real saving and the work can still be delivered sustainably. A big percentage is not enough information.",
    sections: [
      [
        "Use an honest comparison",
        "State the actual payable amount and a genuine usual price where you make that comparison. Explain the same scope on both sides. Do not inflate a reference price or describe a smaller package as a discount on a larger one without explaining the difference. Check the applicable advertising rules.",
      ],
      [
        "Cost the commitment",
        "Decide how many discounted projects you can support, who the offer suits and what inputs are required. Include any applicable VAT and unavoidable charges clearly. Explain ongoing costs, ownership and exit arrangements. The recipient should not discover later that a discounted setup depends on an expensive compulsory subscription.",
      ],
    ],
    example:
      "A photographer offers a defined short product shoot at £120 instead of their genuine £180 price for that same package. They state the number of images, usage rights and travel limits. A custom commercial shoot is a different service requiring its own quote.",
    checklist: [
      "Verify the usual-price comparison.",
      "Show the full payable price.",
      "Keep scope and terms explicit.",
      "Set a realistic availability limit.",
    ],
    helpPrompt:
      "Could someone check whether my startup-discount offer explains the genuine reference price, full amount due and ongoing costs clearly?",
    nextStep: { label: "Review practical-help requests", href: "/ideas" },
    sources: ["ads"],
  },
  {
    slug: "agree-a-business-skill-swap-clearly",
    title: "Agree a skill swap without leaving either person guessing",
    category: "Helping each other",
    description:
      "Define deliverables, timing, ownership and what happens if one side cannot finish.",
    intro:
      "A skill swap can help two businesses progress without a cash fee between them. It still uses time and creates responsibilities. Do not rely on 'we will sort each other out' as the whole agreement.",
    sections: [
      [
        "Define both sides separately",
        "Describe what each person will deliver, what they need, the expected timing and a reasonable completion test. Equal hours do not automatically mean equal value, so agree the exchange rather than assuming it. Clarify rights to use the work and any costs such as materials, hosting or travel.",
      ],
      [
        "Consider obligations beyond cash",
        "No cash changing hands does not automatically remove tax, record-keeping or other legal obligations. Ask an appropriate adviser about your circumstances. Agree what happens if work changes or one person cannot continue. Keep private account access limited and remove it when the task is complete.",
      ],
    ],
    example:
      "A photographer and copywriter agree a small product shoot in exchange for rewriting two service descriptions. They define outputs and one revision round each. A full brand strategy or a second shoot would require a separate discussion.",
    checklist: [
      "Write both deliverables.",
      "Agree timing and revisions.",
      "Clarify rights and out-of-pocket costs.",
      "Check relevant accounting and legal questions.",
    ],
    helpPrompt:
      "I am proposing a small photo-for-copy swap. Could someone help me identify missing scope or handover details before either of us starts?",
    nextStep: { label: "Ask for practical exchange feedback", href: "/ideas" },
    sources: ["ip", "trading"],
  },
  {
    slug: "choose-between-business-help-offers",
    title: "Choose a helpful offer without choosing only the cheapest",
    category: "Helping each other",
    description:
      "Compare scope, fit, evidence and responsibility across free, discounted and paid offers.",
    intro:
      "A free offer can be valuable and a paid offer can be poor. Price alone does not establish suitability. Compare what is actually proposed and whether the helper understands the task you need completed.",
    sections: [
      [
        "Compare the same outcome",
        "Write the intended result, included work, timing, required inputs, price and ongoing commitments for each offer. Ask about relevant experience and any limits. Check identities and credentials appropriately for the work. Platform moderation is not a guarantee of competence or a substitute for your own assessment.",
      ],
      [
        "Agree before sharing access",
        "Clarify who is responsible for the work, how you can raise a problem and what happens at handover. Accepting an introduction is not automatically a purchase. Do not send passwords or confidential records just because someone replied helpfully. Start with the minimum access needed and use a suitable agreement for actual delivery.",
      ],
    ],
    example:
      "One helper offers a short page review; another quotes for implementing changes. Both may be useful, but they are different contributions. Comparing the review with the build as if they were identical would lead to confusion.",
    checklist: [
      "Compare deliverables, not labels.",
      "Check relevant experience.",
      "Identify ongoing costs and responsibility.",
      "Agree scope before access or payment.",
    ],
    helpPrompt:
      "Could someone help me compare two anonymised offers for different levels of website help? I want to understand the scope differences before choosing.",
    nextStep: { label: "Learn how BCN handles help", href: "/how-we-work" },
  },
  {
    slug: "give-business-feedback-that-is-useful",
    title: "Give feedback that helps someone take the next step",
    category: "Helping each other",
    description:
      "Be specific about the task, observation and possible improvement without pretending to know everything.",
    intro:
      "'Looks great' is kind, and 'this will never work' is blunt, but neither necessarily helps. Useful feedback connects a specific observation to the decision the owner is trying to make.",
    sections: [
      [
        "Ask what they need reviewed",
        "Find out whether the owner wants clarity, feasibility, pricing-method feedback or a technical check. Stay inside that scope. Describe what you observed and distinguish it from an inference. If you have not tested a feature or spoken to customers, do not present your impression as proof.",
      ],
      [
        "Suggest a manageable next action",
        "Explain why one change might help and how the owner could test it. Acknowledge uncertainty and your own experience limits. Do not turn feedback into a claim that only you can fix the business. Sensitive criticism belongs in an appropriate private conversation, not a public pile-on.",
      ],
    ],
    example:
      "Instead of 'your website is terrible', a helper says: 'I could not find the area you serve on the service page. Adding that information near the enquiry button might help visitors decide whether to contact you.' The owner has a specific observation to investigate.",
    checklist: [
      "Confirm the review question.",
      "State an observable finding.",
      "Separate opinion from evidence.",
      "Offer one achievable next action.",
    ],
    helpPrompt:
      "I can review one short service description for clarity. I will explain what I understand and where I hesitate, rather than claiming to assess the whole business.",
    nextStep: { label: "Find somewhere to contribute", href: "/ideas" },
  },
  {
    slug: "protect-a-business-idea-when-asking-for-help",
    title: "Ask for help with an idea without publishing everything",
    category: "Helping each other",
    description:
      "Share the problem and next task while keeping confidential details out of public requests.",
    intro:
      "You can often get useful help without revealing a customer list, private method or unpublished design. Decide what someone actually needs to understand before posting. Public discussion is not a confidential advisory relationship.",
    sections: [
      [
        "Share the task, limit the sensitive detail",
        "Explain the customer problem, stage and type of help needed. Remove account credentials, personal data, commercially sensitive numbers and private files. Use an anonymised example where appropriate. If the central task requires confidential information, establish a suitable private process and professional advice first.",
      ],
      [
        "Understand rights and agreements",
        "Intellectual property takes different forms, and an idea alone is not automatically protected in every way. Consult official guidance or a qualified adviser about actual protection and agreements. Do not assume a platform message creates an NDA or transfers ownership of work. Clarify rights before commissioning a contribution.",
      ],
    ],
    example:
      "A founder asks for help choosing a prototype test method without publishing the full manufacturing design. They explain the material, use case and testing goal at a safe level, then decide whether specialist confidential advice is needed.",
    checklist: [
      "Identify information that must stay private.",
      "Write the task at a safe level of detail.",
      "Remove personal data and credentials.",
      "Clarify rights before commissioned work.",
    ],
    helpPrompt:
      "I need help planning a prototype test. Could someone advise on the type of specialist to approach before I share confidential design files?",
    nextStep: { label: "Request help privately", href: "/find-help" },
    sources: ["ip", "privacy"],
  },
  {
    slug: "close-a-business-help-request-with-a-useful-update",
    title:
      "Close a help request with an update that respects everyone involved",
    category: "Helping each other",
    description:
      "Record progress, thank contributors and avoid turning a private result into an unapproved testimonial.",
    intro:
      "A useful update lets helpers know their contribution mattered and stops an old request attracting more offers. It can also help another owner learn, provided private details and exaggerated claims stay out of it.",
    sections: [
      [
        "Describe the next step completed",
        "Say what was decided, delivered or learned. If the business is still testing, say so. Distinguish a completed contribution from proof that the whole business will succeed. Close requests that no longer need help and let shortlisted helpers know where appropriate, without sharing another provider's private proposal.",
      ],
      [
        "Ask before naming people",
        "Thank contributors privately or obtain permission for public attribution. A helper may not want an informal contribution used as a commercial endorsement. Do not publish someone else's pricing, messages or personal details without appropriate permission. An honest outcome can simply be that the owner found the next question to investigate.",
      ],
    ],
    example:
      "A startup reports that interview questions were revised and three conversations are booked. It does not claim the idea is validated or publish the helper's private notes. The update shows progress without manufacturing a success story.",
    checklist: [
      "State the actual progress.",
      "Close an out-of-date request.",
      "Thank contributors appropriately.",
      "Get permission for public names or stories.",
    ],
    helpPrompt:
      "Could someone check a short progress update for accuracy and privacy before I share it? I want to thank the help without overstating the result.",
    nextStep: {
      label: "Manage your practical-help requests",
      href: "/ideas/mine",
    },
  },
];
