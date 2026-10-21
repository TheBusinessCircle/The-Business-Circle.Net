import type { BcnBlogDraft } from "./types";
export const yourWay: BcnBlogDraft[] = [
  {
    slug: "start-a-business-without-a-large-network",
    title: "Start making useful business connections without a large network",
    category: "Business your way",
    description:
      "Choose a few relevant conversations and make a clear contribution without chasing connection counts.",
    intro:
      "You do not need hundreds of contacts before you can learn or contribute. A smaller number of relevant, respectful conversations can help you understand a problem and find the next step. A connection count is not a business outcome.",
    sections: [
      [
        "Start with a shared task",
        "Choose a question you can answer or a specific question you need answered. Participate where that conversation is welcome and follow the rules. Explain your experience honestly. Do not pretend familiarity or use another person's public help request as an opening for unrelated sales.",
      ],
      [
        "Make continuation optional",
        "Offer a useful response without demanding a meeting. If both people want to continue privately, establish permission and the purpose. Respect a declined request. Keep notes proportionate and do not collect private profiles or contact lists merely because they are visible.",
      ],
    ],
    example:
      "A new owner contributes a clear checklist for preparing product photographs, then asks a separate focused question about supplier terms. They become useful through the quality of the exchange, not by sending a hundred generic introductions.",
    checklist: [
      "Find one relevant discussion.",
      "Offer one specific contribution.",
      "State experience and limits.",
      "Ask before moving to private contact.",
    ],
    helpPrompt:
      "I am new to business and can help test whether a service description makes sense to a first-time reader. I would also welcome experience with planning a first customer interview.",
    nextStep: { label: "Explore useful connections", href: "/connections" },
  },
  {
    slug: "ask-business-questions-when-youre-a-beginner",
    title: "Ask a beginner business question without apologising for it",
    category: "Business your way",
    description:
      "Give the context and decision you face so someone can explain the right next step.",
    intro:
      "Not knowing a business term is normal when you are starting. You do not need to sound experienced to deserve a useful answer. Clear context helps a helper explain without making assumptions about what you already know.",
    sections: [
      [
        "Describe the decision in ordinary language",
        "Say what you are trying to do, what you have read or tried and where you got stuck. Ask for an explanation at the level you need. If the answer concerns tax, contracts, safety or another specialist area, ask which official guidance or qualified professional is appropriate.",
      ],
      [
        "Check your understanding",
        "Repeat the answer back in your own words and identify the next action. Avoid acting on a confident anonymous reply where the consequences require proper advice. Good helpers can explain their reasoning and limits. You are allowed to ask for a source or say that an answer is still unclear.",
      ],
    ],
    example:
      "An owner says, 'I understand the amount I charge, but I do not understand why markup and margin differ.' A worked numerical example answers that much better than telling them to research finance generally.",
    checklist: [
      "State the task and context.",
      "Explain the specific uncertainty.",
      "Ask for plain language and relevant sources.",
      "Confirm your understanding before acting.",
    ],
    helpPrompt:
      "I am starting out and need a plain-language explanation of contribution per sale. Could someone use a small illustrative example and explain what it leaves out?",
    nextStep: { label: "Ask a specific question", href: "/ideas" },
  },
  {
    slug: "build-a-business-around-caring-responsibilities",
    title: "Design a business offer around the time you can reliably give",
    category: "Business your way",
    description:
      "Use realistic availability and clear customer expectations when other responsibilities shape your week.",
    intro:
      "A business plan should fit your actual responsibilities. You do not need to copy someone else's schedule. Start with the periods you can reliably offer and design delivery around them, with room for change.",
    sections: [
      [
        "Choose a compatible delivery model",
        "Consider whether fixed appointments, asynchronous work or a limited number of projects fits your capacity. Include preparation, admin and support. State response hours clearly without feeling obliged to publish private family details. Avoid promising constant availability if that is not the service you can provide.",
      ],
      [
        "Protect a manageable commitment",
        "Set a realistic number of bookings and a process for changes. Review the plan after actual delivery and distinguish temporary disruption from a structural mismatch. If an offer repeatedly requires unavailable hours, adjust the offer or timetable rather than relying on permanent overextension.",
      ],
    ],
    example:
      "An owner offers two scheduled review slots a week with written follow-up instead of open-ended daytime support. Customers know the arrangement before booking, and the owner can deliver a bounded service consistently.",
    checklist: [
      "Map reliable availability.",
      "Include work around delivery.",
      "Choose a compatible scope.",
      "Explain response and booking expectations.",
    ],
    helpPrompt:
      "Could someone help me reduce a service offer to fit two reliable working sessions a week? I would prefer practical scope advice rather than pressure to be available constantly.",
    nextStep: { label: "Build a realistic starting plan", href: "/start" },
  },
  {
    slug: "make-business-help-easier-to-access",
    title: "Make your offer of business help easier to access",
    category: "Business your way",
    description:
      "Offer clear formats and expectations instead of assuming everyone wants the same kind of meeting.",
    intro:
      "A video call is not everyone's easiest way to ask a question. Written responses, clear instructions and predictable timings can make help more usable. Ask about the task and preferences without demanding a personal explanation.",
    sections: [
      [
        "Explain the format",
        "State whether support is written, by phone, by video or in person, and what preparation is required. Offer a suitable alternative where feasible. Use plain language, accessible documents and meaningful links. Do not put essential instructions only in a poster image or uncaptioned recording.",
      ],
      [
        "Let the person choose what to disclose",
        "Ask what format or adjustment would help them participate, rather than requesting medical information unnecessarily. Be honest about what you can support. A short written outline before a call and a clear action note afterwards may help many people, regardless of the reason.",
      ],
    ],
    example:
      "A helper offers feedback either as a short written list or a scheduled conversation with notes. The requester chooses the written route. They do not need to explain a disability or personal situation to justify that preference.",
    checklist: [
      "State format and preparation clearly.",
      "Offer feasible alternatives.",
      "Use accessible text and documents.",
      "Avoid unnecessary sensitive questions.",
    ],
    helpPrompt:
      "Could someone review whether my help-offer instructions are clear and usable without a video call? I want the same practical value in a written format.",
    nextStep: { label: "Offer a useful contribution", href: "/ideas" },
    sources: ["accessibility", "privacy"],
  },
  {
    slug: "network-without-working-the-room",
    title: "Business connections for people who dislike working the room",
    category: "Business your way",
    description:
      "Use preparation, a specific question and a useful follow-up instead of performing a sales persona.",
    intro:
      "You do not need to become the loudest person at an event to make a useful connection. A few relevant conversations can be enough. Give yourself a practical purpose rather than an arbitrary target of collected contacts.",
    sections: [
      [
        "Prepare one contribution and one question",
        "Be able to explain the work you do in ordinary language. Choose something useful you can share and one question genuinely relevant to the setting. Listen to the answer instead of treating it as a gap before your pitch. Respect the event's rules and other people's time.",
      ],
      [
        "Make follow-up specific",
        "If a useful next step emerges, agree it. Do not add everyone to a mailing list or assume exchanging a card authorises repeated marketing. A short follow-up should refer to the actual discussion and give the other person space to decline. No follow-up is needed where no relevant reason exists.",
      ],
    ],
    example:
      "An owner attends a workshop to understand local supplier options. One conversation produces a useful question about delivery terms and permission to send a short brief. That is a clearer outcome than returning with twenty names and no context.",
    checklist: [
      "Choose a practical purpose.",
      "Prepare a plain explanation.",
      "Listen for a relevant shared task.",
      "Agree any specific follow-up.",
    ],
    helpPrompt:
      "Could someone help me explain my service in two natural sentences for a local business event? I want it clear, not a rehearsed sales speech.",
    nextStep: { label: "Find a reason to connect", href: "/connections" },
    sources: ["privacy"],
  },
  {
    slug: "know-when-you-need-a-specialist",
    title: "When does a business question need a specialist?",
    category: "Business your way",
    description:
      "Use peer experience for context while recognising decisions that need qualified advice.",
    intro:
      "Another owner's experience can help you ask better questions. It cannot automatically settle your tax position, contract, safety obligations or regulated decision. The right kind of help depends on the consequences and the facts.",
    sections: [
      [
        "Consider the cost of being wrong",
        "Ask whether an error could affect health, legal rights, significant money, personal data or someone else's safety. Check whether qualifications, authorisation or insurance are relevant. A confident reply or a popular profile is not proof of competence. Official guidance can help identify the right professional questions.",
      ],
      [
        "Prepare a useful specialist brief",
        "Summarise the decision, relevant circumstances, timing and documents available. Share sensitive material only through an appropriate authorised route. Ask the professional to explain scope, fees and limitations. Peer support can still help you organise the question without pretending to replace specialist advice.",
      ],
    ],
    example:
      "A peer explains how they track invoices, but the owner's unusual VAT situation needs an accountant. The useful contribution is helping assemble the facts and questions, not copying another business's tax treatment.",
    checklist: [
      "Assess the consequences of error.",
      "Check relevant competence and authorisation.",
      "Use current official starting guidance.",
      "Prepare a concise private brief.",
    ],
    helpPrompt:
      "I need help identifying the right type of professional for a specific business question. Could someone explain the relevant specialism without asking me to publish sensitive documents?",
    nextStep: {
      label: "Request suitable professional help",
      href: "/find-help",
    },
    sources: ["support"],
  },
  {
    slug: "restart-a-business-idea-after-a-long-pause",
    title: "Restart a business idea without pretending nothing has changed",
    category: "Business your way",
    description:
      "Review old assumptions, current capacity and the smallest useful new test.",
    intro:
      "An old plan is a record of what you believed then. It is not a binding instruction for today. Restart by checking what still matters and what circumstances have changed, rather than trying to catch up with an imaginary timetable.",
    sections: [
      [
        "Separate assets from assumptions",
        "List useful skills, documents, relationships and work already completed. Check rights, access and current relevance before reuse. Then list assumptions about customers, costs and availability that need fresh evidence. Do not revive old prices or promises without checking them.",
      ],
      [
        "Choose a small re-entry task",
        "Pick one action that creates current information: a conversation, a cost check or a prototype test. Set a realistic limit and review point. Avoid buying a new brand or tool merely to make the restart feel official. The first goal is evidence of a useful next step.",
      ],
    ],
    example:
      "A founder returning to a craft service checks material costs and speaks to potential buyers before reprinting last year's price list. Existing photographs may still be useful, but old demand assumptions need revisiting.",
    checklist: [
      "List reusable assets.",
      "Check current rights and access.",
      "Identify stale assumptions.",
      "Run one small new test.",
    ],
    helpPrompt:
      "I am returning to an idea after a pause. Could someone help me choose which assumption to recheck first rather than rewriting the whole plan?",
    nextStep: { label: "Refresh your starting plan", href: "/start" },
  },
  {
    slug: "define-business-success-beyond-company-size",
    title: "What would a useful business look like for you?",
    category: "Business your way",
    description:
      "Define income, capacity, service quality and personal constraints before copying someone else's growth goal.",
    intro:
      "A bigger team or busier calendar is not everyone's definition of progress. Decide what the business needs to provide and what limits matter to you. That makes growth decisions easier to judge.",
    sections: [
      [
        "Write concrete outcomes",
        "Consider sustainable owner income, reliable service, manageable hours and appropriate resilience. Keep financial targets distinct from actual results. Include the cost and capacity needed to deliver them. A lifestyle preference does not remove contractual, tax or other business responsibilities.",
      ],
      [
        "Use goals to make trade-offs",
        "Compare an opportunity with the outcomes you chose. More revenue that requires unaffordable risk or impossible availability may be a poor fit. Review goals as circumstances change, using evidence from the business. Avoid judging progress solely against public success stories that omit costs and context.",
      ],
    ],
    example:
      "A consultant chooses a bounded number of well-scoped projects rather than an unlimited support service. They test whether contribution and demand can support the target without exceeding available hours. The target remains a hypothesis until the numbers work.",
    checklist: [
      "Describe the outcomes you want.",
      "Write the capacity and financial assumptions.",
      "Identify non-negotiable constraints.",
      "Review opportunities against those criteria.",
    ],
    helpPrompt:
      "Could someone help me turn a broad goal into a realistic capacity-and-income question? I want to test the assumptions rather than claim a guaranteed target.",
    nextStep: {
      label: "Explore the break-even model",
      href: "/tools/profit-break-even-calculator",
    },
  },
];
