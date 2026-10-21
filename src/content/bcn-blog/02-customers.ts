import type { BcnBlogDraft } from "./types";
export const customers: BcnBlogDraft[] = [
  {
    slug: "find-your-first-customers-without-spam",
    title: "Find your first customers without becoming another unwanted pitch",
    category: "Finding customers",
    description:
      "Start with relevant conversations and clear permission instead of a purchased contact list.",
    intro:
      "The first customers are easier to understand when you can explain why your offer is relevant to them. Sending more messages cannot repair an offer that does not fit. Start with the problem, the setting and an appropriate way to talk.",
    sections: [
      [
        "Build a small relevance list",
        "List places where your intended customers already seek help: permitted community discussions, local events, professional groups or introductions through people you know. Check the rules before posting. Being able to find an email address is not the same as having permission to market to it. Follow the current ICO guidance for the recipient and channel.",
      ],
      [
        "Offer a small next step",
        "Describe one problem you can help with and a sensible way to establish fit. Avoid invented urgency or claiming to have found lost revenue. Track conversations, quotes, bookings and reasons people decline. Do not treat a friendly exchange as a qualified lead or use someone's help request as permission for unrelated follow-ups.",
      ],
    ],
    example:
      "A local repairer sees a permitted request for furniture repairs. They explain the types of joints they repair and ask whether the owner would like to share a photograph privately. They do not copy the member list or pitch everyone in the group.",
    checklist: [
      "Choose one customer problem.",
      "Find three appropriate places to participate.",
      "Check contact and posting rules.",
      "Record genuine next steps and objections.",
    ],
    helpPrompt:
      "I repair wooden furniture and need help choosing an appropriate local route to first customers. Could someone review my short offer for clarity, without sending it to anyone?",
    nextStep: { label: "Get feedback on your offer", href: "/ideas" },
    sources: ["privacy"],
  },
  {
    slug: "write-a-service-description-people-understand",
    title: "Write a service description people understand on the first read",
    category: "Finding customers",
    description:
      "Replace vague claims with the customer, task, result and boundaries of your service.",
    intro:
      "A visitor should not need to decode what you sell. Words such as solutions, excellence and transformation tell them little about the actual work. Start with the job they need done, then show how you do it.",
    sections: [
      [
        "Answer four buying questions",
        "Say who the service is for, what you do, what the customer receives and how they take the next step. Include the location or delivery method where relevant. If pricing varies, explain the information needed to quote. A starting price needs a genuine available scope, rather than a figure that almost nobody can obtain.",
      ],
      [
        "Test comprehension",
        "Show the description to someone unfamiliar with your business. Ask them to explain the service back to you without prompting. Where they misunderstand, revise the wording. You are testing the writing, not the reader. Keep any specialist term that is essential, but explain what it means in this context.",
      ],
    ],
    example:
      "'End-to-end property solutions' becomes 'End-of-tenancy cleaning for two- and three-bedroom homes in our local area, with an agreed room checklist and an optional oven clean.' The second description gives a customer useful information before they enquire.",
    checklist: [
      "Name the specific work.",
      "Explain the output and exclusions.",
      "Make location and pricing basis clear.",
      "Ask an unfamiliar reader to repeat the offer.",
    ],
    helpPrompt:
      "Could someone read these two sentences and tell me what service they think I provide, who it suits and what remains unclear? I need a clarity check rather than a rewrite of my entire website.",
    nextStep: {
      label: "Review the rest of your website",
      href: "/tools/website-health-checklist",
    },
    sources: ["ads"],
  },
  {
    slug: "ask-for-a-business-introduction-well",
    title: "How to ask for a business introduction people can comfortably make",
    category: "Finding customers",
    description:
      "Give a contact enough context to make a relevant introduction without handing over private details.",
    intro:
      "'Do you know anyone who needs my services?' gives your contact a large, awkward job. A useful introduction request identifies a particular situation and lets both sides decide whether a conversation would help.",
    sections: [
      [
        "Make the fit easy to recognise",
        "Explain the kind of business, current problem and piece of work you can support. Provide a short description your contact can forward unchanged. Do not demand their address book or ask them to vouch for work they have never seen. State any referral payment transparently before it affects a recommendation.",
      ],
      [
        "Let the other person choose",
        "Ask the connector to check interest before sharing personal contact details. A declined introduction should end politely. Once connected, establish the recipient's needs rather than assuming the introduction is an order. Give your connector a brief outcome update only where appropriate and without disclosing private discussions.",
      ],
    ],
    example:
      "A photographer asks a printer whether any existing clients have mentioned needing new product photos. The printer first asks a relevant client whether an introduction would be welcome. The client can decline without being added to a photographer's marketing list.",
    checklist: [
      "Describe one recognisable situation.",
      "Supply a short forwardable explanation.",
      "Ask for permission before details are shared.",
      "Agree how any referral arrangement is disclosed.",
    ],
    helpPrompt:
      "Could someone improve a three-sentence introduction request for product photography? I want contacts to understand the fit without feeling pressured to recommend me.",
    nextStep: { label: "Understand BCN introductions", href: "/find-help" },
    sources: ["privacy", "disclosure"],
  },
  {
    slug: "follow-up-a-quote-without-pressure",
    title: "Follow up a quote without making the customer uncomfortable",
    category: "Finding customers",
    description:
      "Use an agreed decision date and a useful question instead of repeated sales messages.",
    intro:
      "A quote can sit unanswered because the customer is busy, confused, comparing options or no longer interested. One considerate follow-up can clarify that. Repeated 'just checking in' messages rarely add useful information.",
    sections: [
      [
        "Agree the next step when quoting",
        "Explain when the price is valid, what availability means and whether you will follow up. Ask when the customer expects to decide. Keep that agreement separate from marketing consent. If no decision date was agreed, make a reasonable relevant contact and give the person an easy way to end the conversation.",
      ],
      [
        "Help them decide",
        "Ask whether scope, timing or an unanswered question is holding things up. Do not invent a deadline or pretend another customer has taken the slot. If the work is no longer needed, close the quote in your records. Use the reason, when freely provided, to improve future quoting.",
      ],
    ],
    example:
      "A decorator writes: 'You mentioned deciding after the weekend. Is there anything in the room list or preparation work you would like me to clarify? If plans have changed, that is fine too.' This refers to the actual conversation and gives the customer room to answer honestly.",
    checklist: [
      "Record the agreed decision date.",
      "Refer to the customer's actual question.",
      "Check availability before promising it.",
      "Close declined or expired quotes cleanly.",
    ],
    helpPrompt:
      "Could someone review a quote follow-up for tone? The customer asked for time to compare options and I want to clarify the scope without pushing them.",
    nextStep: { label: "Create a clearer quote", href: "/tools/quote-builder" },
  },
  {
    slug: "measure-where-business-enquiries-come-from",
    title: "Find out where enquiries come from before buying more marketing",
    category: "Finding customers",
    description:
      "A simple source log for enquiries, bookings and actual revenue, with honest attribution limits.",
    intro:
      "A busy social account and a useful source of customers are not necessarily the same thing. You need a small record of how people found you and what happened next. Start with a few reliable fields rather than a complicated dashboard.",
    sections: [
      [
        "Ask and record consistently",
        "For each genuine enquiry, record the date, broad source, service requested and outcome. 'Recommended by an existing customer' is a useful answer; you do not always need the referrer's personal details. Include unknown as an option. A tracking link only shows part of a person's journey, so keep reported and technically observed sources distinct.",
      ],
      [
        "Compare like with like",
        "Review sources over a sensible period. Count suitable enquiries, quotes, bookings and collected revenue separately. Include the money and time spent on each route. A booking that later cancels is not a completed job. With small numbers, treat a promising source as a hypothesis to keep testing.",
      ],
    ],
    example:
      "A cleaner receives twelve enquiries: eight from a group post, three referrals and one unknown. Only two group enquiries fit the service area, while all three referrals do. The useful question is how to attract more relevant enquiries, not how to repeat the biggest raw number.",
    checklist: [
      "Use the same broad source labels.",
      "Keep unknown rather than guessing.",
      "Separate enquiries from paid work.",
      "Include your time in channel comparisons.",
    ],
    helpPrompt:
      "Could someone help me simplify an anonymised enquiry log? I want to compare sources without collecting unnecessary personal information or claiming every visit became revenue.",
    nextStep: {
      label: "Compare marketing costs",
      href: "/tools/business-cost-comparison",
    },
    sources: ["privacy"],
  },
  {
    slug: "make-a-local-business-partnership-useful",
    title: "Make a local business partnership useful to the customer",
    category: "Finding customers",
    description:
      "Choose complementary services, clear handovers and transparent referrals rather than a vague lead swap.",
    intro:
      "A useful partnership solves a customer problem neither business handles alone. It needs more than an agreement to promote each other. Begin with the situation where a customer genuinely needs the second service.",
    sections: [
      [
        "Design the handover",
        "Agree what each business does, who quotes, who contracts with the customer and how problems are handled. Check that the other business can support the promise you are making. Never present a partner as independently verified unless you have actually performed and can explain that verification.",
      ],
      [
        "Keep choice and money clear",
        "Customers should understand whether they are buying one combined service or separate services. Explain referral payments where relevant and ask permission before sharing their details. You can recommend a complementary business without pretending it is the only option or taking responsibility for promises you cannot fulfil.",
      ],
    ],
    example:
      "A gardener and a tree surgeon agree that complex tree work goes directly to the qualified specialist. The gardener describes their own limits and offers a permission-based introduction. Each business provides its own quote and terms, rather than bundling unclear responsibility into one price.",
    checklist: [
      "Name the customer situation.",
      "Define each business's scope.",
      "Agree consent and complaint handling.",
      "Explain any referral payment clearly.",
    ],
    helpPrompt:
      "I am considering a complementary local partnership. Could someone challenge the handover plan and help me spot where the customer might be unclear about responsibility?",
    nextStep: {
      label: "Find relevant businesses",
      href: "/business-directory",
    },
    sources: ["disclosure", "privacy"],
  },
  {
    slug: "qualify-a-business-enquiry-kindly",
    title:
      "Work out whether an enquiry fits without making people jump through hoops",
    category: "Finding customers",
    description:
      "Ask the minimum useful questions about scope, timing and budget before preparing a proposal.",
    intro:
      "A long qualification form can put off a good customer. No questions at all can lead to hours of work on an unsuitable request. Aim for enough information to suggest a sensible next step, and explain why you need it.",
    sections: [
      [
        "Ask about the work first",
        "Find out what the person wants to change, what is happening now, the desired timing and who will make the decision. Ask about budget sensitively and offer a genuine scope or price guide where possible. Some buyers need your help understanding likely costs; an unknown budget is not automatically a bad enquiry.",
      ],
      [
        "Route rather than reject blindly",
        "Decide whether the next step is a quote, a brief clarification, a smaller service or a respectful explanation that you cannot help. Never pass the details to another provider without permission. Record broad reasons enquiries do not fit so you can improve the information on your website.",
      ],
    ],
    example:
      "A web designer learns that a shop needs accurate opening hours and a working contact form by Friday. A full ecommerce proposal would miss the immediate need. They discuss a bounded repair first, with a separate decision about a rebuild later.",
    checklist: [
      "Ask what needs to change.",
      "Confirm timing and decision responsibility.",
      "Explain a realistic pricing basis.",
      "Offer one appropriate next step.",
    ],
    helpPrompt:
      "Could someone review my four enquiry questions? I want enough context to assess a fit without demanding a full business plan from a potential customer.",
    nextStep: { label: "See the private help route", href: "/find-help" },
  },
  {
    slug: "handle-a-no-without-burning-a-relationship",
    title: "What to do when a potential customer says no",
    category: "Finding customers",
    description:
      "Close an enquiry professionally, learn what you can and respect the decision.",
    intro:
      "A declined offer is information, not an invitation to argue. The person may lack budget, prefer another approach or simply not need the work. A professional response protects their choice and your reputation.",
    sections: [
      [
        "Acknowledge the decision",
        "Thank them for letting you know and confirm that you will close the enquiry. If appropriate, ask once whether they are comfortable sharing the main reason. Do not make feedback a condition of leaving. Remove planned follow-ups unless a specific later contact is genuinely agreed and lawful.",
      ],
      [
        "Look for a pattern, not a personal verdict",
        "Review several outcomes before changing your price or service. Separate poor fit, timing, unclear scope and price concerns. If three customers misunderstand the same deliverable, fix the explanation. If a request was never suitable, improve how you qualify it. One rejection cannot tell you the entire market's view.",
      ],
    ],
    example:
      "A customer chooses a cheaper maintenance service with a smaller scope. The original provider records the difference and improves their comparison notes. They do not accuse the competitor of poor quality or send repeated warnings to the customer.",
    checklist: [
      "Close the enquiry respectfully.",
      "Ask for optional feedback only once.",
      "Cancel unwanted follow-ups.",
      "Review patterns across several decisions.",
    ],
    helpPrompt:
      "I have anonymised reasons for five lost quotes. Could someone help me separate offer-clarity problems from customers who were never a suitable fit?",
    nextStep: { label: "Ask a focused business question", href: "/ideas" },
  },
];
