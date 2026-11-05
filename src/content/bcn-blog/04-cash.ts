import type { BcnBlogDraft } from "./types";
export const cash: BcnBlogDraft[] = [
  {
    slug: "what-to-put-in-a-professional-quote",
    title: "What belongs in a clear, professional quote?",
    category: "Quotes and cash",
    description:
      "Make scope, price, assumptions and acceptance easy to understand before work starts.",
    intro:
      "A good quote reduces uncertainty on both sides. It tells a customer what they are considering and gives you a shared record of the work. Appearance helps, but clear scope matters more than an elaborate layout.",
    sections: [
      [
        "Describe the work and the boundary",
        "Identify the supplier and customer, date the document and give it a reference. List the agreed work, quantities where useful, exclusions, assumptions, expected timing and price basis. State applicable VAT correctly. Explain how long the quote remains valid and how the customer can accept it. Check terms appropriate to the customer and transaction.",
      ],
      [
        "Keep it distinct from an invoice",
        "Label the document as a quote. It is a proposal for work, not a demand for payment or proof that money has arrived. If the customer accepts, preserve the agreed version and terms. Changes should produce a clear written variation rather than an unexplained new total.",
      ],
    ],
    example:
      "A garden quote states removal of specified shrubs and disposal of the resulting waste. It excludes stump grinding and describes access assumptions. The customer can compare the actual scope with another quote rather than trying to interpret 'garden tidy: £400'.",
    checklist: [
      "Use a quote reference and date.",
      "Write inclusions and exclusions.",
      "Make total price and VAT basis clear.",
      "Explain acceptance, validity and changes.",
    ],
    helpPrompt:
      "Could someone review an anonymised quote and identify unclear scope or assumptions? I am looking for clarity feedback, not a legal certification.",
    nextStep: {
      label: "Build a printable quote",
      href: "/tools/quote-builder",
    },
    sources: ["invoices"],
  },
  {
    slug: "handle-extra-work-after-a-quote",
    title: "The customer has asked for extra work. What happens to the quote?",
    category: "Quotes and cash",
    description:
      "Use a written variation to agree scope, price and timing before extra work starts.",
    intro:
      "'While you are here' can turn a small job into unpaid work or an unexpected bill. Pause long enough to establish whether the request is already included. If it is genuinely extra, agree the change before doing it.",
    sections: [
      [
        "Compare the request with the agreed scope",
        "Refer to the accepted quote rather than relying on memory. If your original description was unclear, acknowledge that and work through it fairly. A variation should identify the added or removed work, any price change and the effect on delivery. Do not automatically label corrections to your own defective work as chargeable extras.",
      ],
      [
        "Get a clear decision",
        "Give the customer enough information to choose. Record acceptance of the variation and keep it with the original quote. A verbal discussion can be followed by a short written confirmation, with a suitable agreement process. Consumer rights and contract terms may affect what is permissible, so get appropriate advice where uncertain.",
      ],
    ],
    example:
      "A designer is asked to add a booking page to an agreed three-page site. They describe the additional setup, testing and customer inputs, quote the extra amount and explain the revised completion date. The customer can accept or keep the original scope.",
    checklist: [
      "Check the original inclusions.",
      "Describe the specific change.",
      "State the price and timetable effect.",
      "Record agreement before extra delivery.",
    ],
    helpPrompt:
      "Could someone help me turn an informal extra request into a clear scope-change note? I want both the original work and optional addition to remain understandable.",
    nextStep: {
      label: "Prepare a separate quote for extra work",
      href: "/tools/quote-builder",
    },
  },
  {
    slug: "ask-for-a-deposit-with-clear-terms",
    title: "Explain a deposit clearly before a customer pays",
    category: "Quotes and cash",
    description:
      "Clarify what a deposit covers, how it affects the balance and what happens if plans change.",
    intro:
      "A deposit can help fund materials or reserve capacity, but the word alone explains very little. Customers need to know what they are paying for and how the payment connects to the agreed work.",
    sections: [
      [
        "Make the payment stages explicit",
        "Set out the full price, deposit amount, remaining balance and when each payment is due. Explain what work or commitment follows the deposit. Do not present money held for future delivery as spare profit. Keep a record of payments and issue the appropriate documents for your circumstances.",
      ],
      [
        "Do not invent a universal cancellation rule",
        "Refunds, cancellation rights and permissible charges depend on the transaction, customer and fair contract terms. Simply writing 'non-refundable' does not settle the matter. Obtain suitable advice and explain applicable terms before payment. If you cannot deliver, address the customer's rights rather than automatically keeping the money.",
      ],
    ],
    example:
      "A furniture maker explains the agreed total, a payment before ordering materials and the final payment point. The terms describe changes and cancellations appropriately. The customer sees the stages before accepting instead of receiving a surprise payment request after the order.",
    checklist: [
      "Show the full price and payment stages.",
      "Explain what the deposit supports.",
      "Review fair cancellation and refund terms.",
      "Track the deposit against the balance.",
    ],
    helpPrompt:
      "I need professional help reviewing deposit and cancellation wording for made-to-order work. I can share my proposed process privately, without customer records.",
    nextStep: { label: "Find relevant professional help", href: "/find-help" },
    sources: ["invoices"],
  },
  {
    slug: "chase-a-late-business-payment-methodically",
    title: "Chase a late business payment with a clear record",
    category: "Quotes and cash",
    description:
      "Check the invoice, establish the reason for delay and choose the right next step.",
    intro:
      "A late payment may reflect an administrative mistake, a disputed invoice or a customer unable to pay. Start by checking the facts. A calm, complete record is more useful than a string of increasingly angry messages.",
    sections: [
      [
        "Check before chasing",
        "Confirm the agreed payment terms, invoice details, delivery evidence and any credit note or part payment. Ask whether the invoice reached the right person and whether something is disputed. Verify payment status through your own records; a screenshot of a proposed payment is not necessarily cleared money.",
      ],
      [
        "Use an appropriate escalation route",
        "Record promises with dates and follow up on the agreed next step. Do not threaten charges or legal action you do not understand. UK rules for late commercial payments differ from consumer situations and depend on the circumstances. Consult current official guidance or an adviser before calculating interest, fees or taking formal action.",
      ],
    ],
    example:
      "A supplier finds an invoice is awaiting a purchase-order reference, not being ignored. They resolve the missing detail and obtain an expected payment date. In another case, a disputed line needs evidence and discussion before ordinary reminders will help.",
    checklist: [
      "Reconcile the outstanding amount.",
      "Check agreed terms and invoice details.",
      "Ask about a dispute or missing information.",
      "Record the next date and escalation decision.",
    ],
    helpPrompt:
      "Could a bookkeeper help me organise an overdue-invoice process? I need to distinguish admin delays, disputes and situations requiring professional advice.",
    nextStep: {
      label: "Request business support privately",
      href: "/find-help",
    },
    sources: ["late"],
  },
  {
    slug: "make-a-simple-weekly-cash-check",
    title: "A simple weekly cash check for a small business",
    category: "Quotes and cash",
    description:
      "Look at upcoming receipts, bills and uncertainty before the week becomes urgent.",
    intro:
      "A short cash check works best at a regular time, using current records. Its purpose is to spot a timing problem early enough to make a sensible decision, rather than explain the bank balance after it has fallen.",
    sections: [
      [
        "Build a dated short view",
        "Begin with reconciled available cash. List expected receipts and outgoing commitments for the coming weeks. Keep uncertain receipts visibly separate. Include annual renewals, staged supplier payments and obligations your accountant has identified. Do not count the same outstanding invoice as both current cash and a future receipt.",
      ],
      [
        "Turn the lowest point into a question",
        "If the projected balance becomes tight, identify which assumptions cause it. Can an invoice query be resolved, a discretionary purchase delayed or a payment stage agreed lawfully? Do not assume another sale arrives just because the plan needs one. Where debts or solvency are a concern, obtain timely qualified advice.",
      ],
    ],
    example:
      "A studio has enough cash today, but a software renewal and material order fall before a large expected receipt. Seeing the gap three weeks ahead gives the owner time to review timing and commitments. The projection remains uncertain until the customer actually pays.",
    checklist: [
      "Reconcile the starting balance.",
      "Add receipts and payments to dates.",
      "Show uncertainty explicitly.",
      "Choose one action for any projected gap.",
    ],
    helpPrompt:
      "Could someone review the structure of a blank weekly cash planner? I want a useful routine without sharing live account details on a public board.",
    nextStep: { label: "Find help with business numbers", href: "/find-help" },
    sources: ["plan"],
  },
  {
    slug: "compare-fixed-price-and-hourly-service-work",
    title: "Fixed price or hourly work: which fits this job?",
    category: "Quotes and cash",
    description:
      "Match your pricing method to the uncertainty and control in the work.",
    intro:
      "Neither fixed pricing nor hourly charging is automatically fairer. The useful question is what each side knows before work starts and how changes will be handled. Explain the basis clearly enough for the customer to compare.",
    sections: [
      [
        "Locate the uncertainty",
        "A defined repeatable task may suit a fixed price. Uncertain investigation may need a different approach, such as a paid diagnostic stage with a spending limit. Include preparation, communication and checking in your costing. Avoid giving a firm fixed total while leaving every important input unknown.",
      ],
      [
        "Agree control points",
        "For hourly work, explain the rate, chargeable activities, reporting and any cap or approval point. For a fixed scope, explain exclusions and variations. A cap should trigger a conversation before it is exceeded, rather than serve as a rough suggestion. Keep a written record of the basis accepted.",
      ],
    ],
    example:
      "An IT specialist offers a bounded diagnostic session first because the cause of a fault is unknown. Once the issue is identified, they can quote separately for the repair. The customer avoids an open-ended promise, and the specialist avoids pretending to know the unknown.",
    checklist: [
      "Define what is known and unknown.",
      "Choose a suitable pricing basis.",
      "Agree approval points or limits.",
      "Explain how changes affect the total.",
    ],
    helpPrompt:
      "Could someone challenge whether my repair service needs a diagnostic stage before a fixed quote? I want customers to understand the uncertainty before booking.",
    nextStep: {
      label: "Cost the delivery work",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "keep-a-quote-register-without-a-crm",
    title: "Keep track of quotes without buying a CRM yet",
    category: "Quotes and cash",
    description:
      "Use a small, secure register for quote versions, decisions and agreed follow-ups.",
    intro:
      "You need to know what was offered, which version was accepted and what happens next. A modest quote register can do that before a larger system earns its place. The important part is a reliable habit.",
    sections: [
      [
        "Use fields that support a decision",
        "Record a reference, date, customer identifier, service, quoted amount, version, status and any agreed next date. Store personal information securely with access limited to people who need it. Link to the actual quote rather than copying inconsistent versions into several places. Choose statuses everyone understands.",
      ],
      [
        "Separate acceptance from payment",
        "A sent quote is not a sale. An accepted quote is not necessarily delivered work or received money. Keep those stages distinct. Review stale entries and your retention needs rather than keeping every contact indefinitely. Add software when the volume or handover requirements justify it.",
      ],
    ],
    example:
      "A builder labels quote Q014 version two as accepted and marks version one superseded. The register records the agreed start conversation and links to the accepted document. There is no guessing which attachment the customer meant.",
    checklist: [
      "Create a unique quote reference.",
      "Record versions and status consistently.",
      "Keep agreed next dates visible.",
      "Restrict access and review retention.",
    ],
    helpPrompt:
      "Could someone review a blank quote-register layout and suggest only the fields needed for a one-person service business?",
    nextStep: { label: "Create your next quote", href: "/tools/quote-builder" },
    sources: ["privacy"],
  },
  {
    slug: "vat-basis-when-comparing-business-costs",
    title: "Compare business costs on a consistent VAT basis",
    category: "Quotes and cash",
    description:
      "Understand why net and gross prices can make otherwise similar quotes look misleading.",
    intro:
      "Two costs cannot be compared fairly if one includes VAT and the other does not. The right planning basis depends on whether VAT is charged, recoverable and relevant to your circumstances. Label it instead of guessing.",
    sections: [
      [
        "Separate the displayed price from your cost",
        "If VAT is not recoverable, it forms part of what the purchase costs your business. If you are registered and entitled to recover it, the cost comparison may use net figures while cash timing still involves the amount paid. Do not assume registration means every VAT amount is recoverable.",
      ],
      [
        "Check the transaction, not just the headline",
        "UK VAT treatment depends on the supply and circumstances. Standard, reduced, zero-rated and exempt supplies are not interchangeable. Special schemes and construction reverse-charge situations need separate treatment. Use current HMRC guidance or your accountant for the actual transaction; a simple comparison calculator does not determine tax liability.",
      ],
    ],
    example:
      "One supplier advertises £120 including VAT and another £100 plus VAT. If the applicable rate is 20%, both totals are £120. A comparison showing £120 against £100 would invent a saving. This is an illustrative rate calculation, not a determination that your purchase uses that rate.",
    checklist: [
      "Label every amount net or gross.",
      "Check whether VAT is charged.",
      "Establish recoverability with suitable advice.",
      "Use the same basis throughout the comparison.",
    ],
    helpPrompt:
      "I need an accountant to confirm the VAT basis for a cost comparison. I can explain the purchase and registration position privately rather than publishing tax documents.",
    nextStep: {
      label: "Compare costs consistently",
      href: "/tools/business-cost-comparison",
    },
    sources: ["vat"],
  },
];
