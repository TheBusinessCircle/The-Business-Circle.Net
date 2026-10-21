import type { BcnBlogDraft } from "./types";
export const starting: BcnBlogDraft[] = [
  {
    slug: "test-a-business-idea-before-building-it",
    title: "How to test a business idea before building it",
    category: "Starting out",
    description:
      "Turn an idea into a small, honest test before spending on branding, stock or a full website.",
    intro:
      "You do not need to prove that your whole dream will work this week. You need to find out whether a particular person has a problem worth solving. Start there, before buying the equipment or polishing the logo.",
    sections: [
      [
        "Write a claim you can check",
        "Use this sentence: 'I think [specific people] struggle with [specific task], and currently solve it by [alternative].' If you cannot name the alternative, investigate. Doing nothing is an alternative too. A business can have no direct competitor and still struggle because customers do not care enough to change.",
      ],
      [
        "Look for behaviour, not encouragement",
        "Ask people about the last time the problem happened, what they tried and what the consequences were. Friends saying they love your idea is kindness, not demand. A useful next step might be permission to discuss a real job, a request for a quote or a trial booking. Explain honestly what exists and what is still a proposal.",
      ],
    ],
    example:
      "Imagine a gardener considering a subscription for tiny courtyards. Instead of buying another van, they speak to five local residents about the last time they paid for garden help. Two want one-off clearance; three want regular upkeep. The gardener now has two different offers to investigate, rather than one assumed subscription business.",
    checklist: [
      "Choose one customer group you can reach.",
      "Write five questions about previous behaviour.",
      "Agree a small test and a spending limit.",
      "Record what would make you continue, change or stop.",
    ],
    helpPrompt:
      "I am testing courtyard maintenance for local residents. Could someone help me improve five interview questions? I need feedback on the questions, not funding or a website build.",
    nextStep: { label: "Write your free starting plan", href: "/start" },
    sources: ["plan"],
  },
  {
    slug: "choose-your-first-customer-group",
    title: "Choose your first customer group without shrinking your ambition",
    category: "Starting out",
    description:
      "A practical way to decide who to help first when your idea could serve almost anyone.",
    intro:
      "'Everyone could use this' makes the first sale difficult. Different customers describe the same problem differently, have different budgets and look for help in different places. Choosing a starting group gives you something specific to test.",
    sections: [
      [
        "Compare access, urgency and fit",
        "List three possible groups. For each, write where you could have a genuine conversation, how recently the problem occurs and whether you can deliver a useful result with your current skills. Use observations rather than invented market-size figures. A large group you cannot reach may be a worse starting point than ten relevant people nearby.",
      ],
      [
        "Keep the choice temporary",
        "Pick a group for the next fortnight, not for the lifetime of the company. Write down why you chose it and what evidence would change your mind. You can broaden once you understand the work. Avoid claiming specialist expertise just because you have chosen a sector to investigate.",
      ],
    ],
    example:
      "A bookkeeper could target all small businesses, but knows several mobile hairdressers and understands their appointment and payment patterns. They test a clear monthly record-organising offer with that group first. The lesson might later transfer to other appointment businesses, but the first conversations can be much more specific.",
    checklist: [
      "Name three groups in plain language.",
      "Find a permitted way to speak to each.",
      "Choose the group with the clearest current problem.",
      "Set a date to review the choice.",
    ],
    helpPrompt:
      "I can organise business records and am choosing between mobile hairdressers and small trades firms. Could an owner explain which monthly admin task causes the most trouble? Please share no private customer records.",
    nextStep: { label: "Ask for practical feedback", href: "/ideas" },
    sources: ["plan"],
  },
  {
    slug: "customer-interview-questions-for-a-new-idea",
    title: "Five customer interview questions that beat 'would you buy this?'",
    category: "Starting out",
    description:
      "Learn about a real business problem without leading people towards the answer you want.",
    intro:
      "People are often generous about an idea that costs them nothing. An interview is more useful when it uncovers something that actually happened. Your job is to understand the current situation before describing your proposed solution.",
    sections: [
      [
        "Ask about the last occasion",
        "Try: 'When did this last happen?', 'What did you do?', 'What took the most time?', 'What did it cost you?', and 'What have you already tried changing?' Follow the answer rather than reading a sales script. If the person has never experienced the problem, record that rather than persuading them they should have.",
      ],
      [
        "Separate notes from interpretation",
        "Write their actual meaning in one column and your proposed response in another. Ask before recording a conversation. Keep unnecessary personal details out of your notes, and never publish identifiable stories without permission. A small interview sample helps you choose the next experiment; it does not establish demand across an entire market.",
      ],
    ],
    example:
      "A founder assumes cafes need another social media scheduler. In interviews, owners describe having plenty of draft posts but no usable product photographs. The immediate obstacle is creating material, not scheduling it. That finding changes the first service they test, without requiring any software development.",
    checklist: [
      "Start with behaviour rather than your pitch.",
      "Ask one question at a time.",
      "Write down surprises and negative answers.",
      "End by asking permission for a relevant follow-up.",
    ],
    helpPrompt:
      "I want to understand how independent cafes prepare product photos. Could an owner talk me through the last time they needed new pictures? I am researching the problem and will not turn the conversation into an unsolicited pitch.",
    nextStep: { label: "Build a small starting plan", href: "/start" },
    sources: ["privacy"],
  },
  {
    slug: "start-a-business-around-a-job",
    title: "Test a business around a job without planning impossible weeks",
    category: "Starting out",
    description:
      "Use a realistic time budget for an early business, including preparation, delivery and recovery.",
    intro:
      "A plan that needs twenty spare hours will fail if your real week contains six. Work from the time you actually have. An early business can move forward through a small repeatable commitment, provided the offer fits the available capacity.",
    sections: [
      [
        "Budget for the whole job",
        "Count customer conversations, travel, buying supplies, delivery, messages and bookkeeping. Reserve some time for problems. Check your employment contract, any relevant restrictions and applicable business requirements before taking work. Do not use an employer's equipment, contacts or paid time without permission.",
      ],
      [
        "Choose a test that fits",
        "A fixed-scope Saturday appointment may fit better than promising weekday support. Tell customers your response hours before they book. Keep a small calendar for the next four weeks and avoid using every free slot. If a test only works by borrowing sleep indefinitely, change the scope or timetable.",
      ],
    ],
    example:
      "An employed designer has two two-hour evenings and a three-hour Sunday slot. A seven-hour website project would leave no time for enquiries or revisions. A two-hour homepage review with a written summary fits the week more honestly and provides evidence about what customers ask for next.",
    checklist: [
      "Mark work, caring commitments and rest first.",
      "Count your actual available hours.",
      "Choose one small paid or research task.",
      "Publish realistic response and delivery times.",
    ],
    helpPrompt:
      "I have about four hours a week to test a design service. Could someone who started part-time help me reduce this offer to a deliverable I can reliably finish?",
    nextStep: { label: "Map your first milestone", href: "/start" },
    sources: ["trading"],
  },
  {
    slug: "make-a-one-page-business-plan",
    title: "Make a one-page business plan you will actually use",
    category: "Starting out",
    description:
      "Put the customer, offer, costs, delivery and next experiment on a single working page.",
    intro:
      "A useful first plan helps you choose what to do next. It does not need a confident forecast for a business you have not tested. Keep your assumptions visible so you can replace them with evidence as you learn.",
    sections: [
      [
        "Use six working boxes",
        "Write the customer, their problem, your first offer, how you will reach them, what delivery costs and what you will test next. Add the date. Where you do not know something, write a question rather than a convincing sentence. The page is a decision aid, not a substitute for a detailed plan where a lender or other organisation needs one.",
      ],
      [
        "Attach one number to each assumption",
        "How many customer conversations will you try? How many hours does the work require? What cash must leave before payment arrives? Use a range if uncertain. At the next review, compare the assumptions with actual results instead of quietly rewriting the original prediction.",
      ],
    ],
    example:
      "A mobile bicycle mechanic lists a first offer of basic home servicing within a small radius. Their unknowns are travel time, parts availability and demand on weekdays. The next action is a route-and-cost test and three customer conversations, rather than designing a three-year expansion chart.",
    checklist: [
      "Complete six boxes in plain language.",
      "Mark every untested claim as an assumption.",
      "Pick the most expensive uncertainty to test first.",
      "Review the page after the test, not just at year end.",
    ],
    helpPrompt:
      "I have a one-page plan for mobile bike servicing. Could someone challenge the delivery-time and travel assumptions? I want a short practical review rather than a general motivational chat.",
    nextStep: { label: "Download your own starter plan", href: "/start" },
    sources: ["plan"],
  },
  {
    slug: "choose-a-small-first-business-offer",
    title: "Turn a broad business idea into one small first offer",
    category: "Starting out",
    description:
      "Define a useful result, clear scope and a finish line before adding more services.",
    intro:
      "A broad ambition is difficult to buy. 'I help businesses grow' leaves a customer guessing what happens, how long it takes and what they receive. A small first offer makes those details clear without limiting what you might build later.",
    sections: [
      [
        "Sell a defined piece of work",
        "Name the starting situation, the work you will do and the output the customer receives. Say what is excluded and what information you need. Avoid guaranteeing an outcome outside your control, such as a particular number of sales. A smaller promise you can keep teaches you more than a large promise you cannot measure.",
      ],
      [
        "Make the finish visible",
        "Define completion before starting. A delivered checklist, a configured booking page or a cleaned courtyard can be inspected. 'Ongoing support' needs response times, boundaries and a review date. Make it easy for a customer to understand the first step without committing to a long relationship.",
      ],
    ],
    example:
      "Instead of launching a full admin agency, an owner offers to organise one month's supplier invoices into a customer-owned folder and produce a missing-document list. Tax advice, bookkeeping entries and ongoing monitoring are excluded. The customer can see exactly what they are paying for.",
    checklist: [
      "Write the output in one sentence.",
      "State inputs and exclusions.",
      "Estimate delivery and checking time.",
      "Explain how completion will be confirmed.",
    ],
    helpPrompt:
      "I want to offer admin help but my draft scope is too broad. Could someone review one fixed task and point out where a customer might misunderstand what is included?",
    nextStep: {
      label: "Cost your first offer",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "decide-what-not-to-build-yet",
    title: "What should you leave out of your first business launch?",
    category: "Starting out",
    description:
      "Separate what a customer needs to complete a task from features that can wait.",
    intro:
      "More features can delay the first useful result. Before adding a shop, app, loyalty scheme or elaborate dashboard, identify the smallest safe way for a real customer to get what they came for. Simpler must still mean trustworthy and workable.",
    sections: [
      [
        "Follow the customer's task",
        "Write the steps from discovering you to receiving the work and getting support. Anything needed for safety, legal obligations, accessibility, honest pricing or reliable delivery stays on the list. Decorative extras and speculative features need evidence. Manual administration can be sensible at a small scale if you can protect information and meet your promises.",
      ],
      [
        "Give later ideas an entry condition",
        "Do not just write 'later'. Write the event that would justify the addition: five customers repeatedly asking for online booking, or admin taking more time than a reliable tool would save. This stops a wishlist becoming the default work queue.",
      ],
    ],
    example:
      "A workshop organiser initially needs accurate dates, accessibility information, clear booking terms and a reliable confirmation process. A member portal may wait. If repeat attendees later struggle to manage bookings, the organiser has a specific reason to investigate an account system.",
    checklist: [
      "Draw the customer journey in five steps.",
      "Protect essential obligations and support.",
      "Move optional features to a dated list.",
      "Give each deferred feature an evidence trigger.",
    ],
    helpPrompt:
      "I am preparing a small workshop launch. Could someone walk through my booking steps and identify a missing essential or a feature I can safely postpone?",
    nextStep: { label: "Ask for a focused review", href: "/ideas" },
    sources: ["accessibility"],
  },
  {
    slug: "decide-whether-to-continue-a-business-test",
    title: "When should you continue, change or stop a business test?",
    category: "Starting out",
    description:
      "Use a review date and honest evidence rather than treating every setback as a reason to spend more.",
    intro:
      "A test is valuable when it changes a decision. If every result means 'keep going', you have not designed a test. Agree in advance what you are trying to learn and what limits protect your time and money.",
    sections: [
      [
        "Set a decision before the result",
        "Write the question, test length, spending cap and evidence you need. Distinguish a problem people recognise from a service they will choose at a viable price. A lack of replies might mean the offer is unclear or the route is wrong; it does not automatically establish that the problem does not exist.",
      ],
      [
        "Change one important variable",
        "At review, list what happened separately from your explanation. If you change audience, price, scope and channel at once, the next result will be hard to interpret. Stopping a particular test can protect the wider dream. Record the lesson so the same assumption does not return in a different logo.",
      ],
    ],
    example:
      "A founder plans ten permitted conversations over two weeks with a £40 materials cap. Nobody wants the proposed monthly box, but four people describe a seasonal one-off need. They stop buying subscription packaging and test the seasonal offer. That is a useful change, not proof of guaranteed success.",
    checklist: [
      "Write a clear learning question.",
      "Set a time and spending limit.",
      "Keep evidence separate from interpretation.",
      "Choose one next decision at the review.",
    ],
    helpPrompt:
      "My first offer test produced conversations but no bookings. Could someone help me interpret the anonymised results and choose one change to test next?",
    nextStep: { label: "Share a specific business question", href: "/ideas" },
  },
];
