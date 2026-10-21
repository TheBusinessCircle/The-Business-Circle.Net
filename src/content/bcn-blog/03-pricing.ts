import type { BcnBlogDraft } from "./types";
export const pricing: BcnBlogDraft[] = [
  {
    slug: "price-your-own-time-when-self-employed",
    title: "Your own time belongs in the price of the job",
    category: "Pricing and profit",
    description:
      "Include preparation, travel and admin when checking whether a service price works.",
    intro:
      "If you only count materials and paid staff, a job can appear profitable while paying you almost nothing. Your time is part of the work. Give it a realistic planning cost before deciding whether the price is sustainable.",
    sections: [
      [
        "Count the hours around delivery",
        "Include the visit, quotation, buying supplies, travel, doing the work, clearing up and routine follow-up. Some time belongs to a specific job; other time belongs in your overhead allocation. Keep the method consistent so that you do not charge the same allowance twice. Estimates improve when you compare them with actual time.",
      ],
      [
        "Separate a costing assumption from take-home pay",
        "An hourly labour allowance is a planning input, not a calculation of personal income after tax. Business structure, taxes, unpaid time and other costs affect what you can draw. Start with a useful job-cost model, then ask an accountant to help you understand the personal-income side.",
      ],
    ],
    example:
      "A service visit takes two hours on site and one hour for travel and preparation. At an illustrative labour cost of £25 per hour, labour is £75, not £50. Add materials and allocated overhead before considering profit. These figures are examples, not recommended local rates.",
    checklist: [
      "List every stage of a typical job.",
      "Time a completed job honestly.",
      "Separate direct time from overhead time.",
      "Review the price using the full cost.",
    ],
    helpPrompt:
      "Could someone review my anonymised job-cost list and identify time I have missed? I want help with the costing method, not advice on what every business in my area should charge.",
    nextStep: {
      label: "Calculate a job price",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "profit-margin-versus-markup-worked-example",
    title: "Margin and markup are different: a worked example",
    category: "Pricing and profit",
    description:
      "See why adding 25% to cost does not leave a 25% profit margin.",
    intro:
      "Margin measures profit as a share of the selling price. Markup measures it as a share of cost. Mixing them up can leave less room than you planned, even when the arithmetic looks reasonable.",
    sections: [
      [
        "Start with a complete cost",
        "For this simple model, include labour, materials, direct expenses and a sensible share of overhead. Use a consistent VAT basis. If costs are incomplete, neither a correct margin nor a correct markup will rescue the result. The model describes operating room before taxes and costs you have excluded.",
      ],
      [
        "Use the right denominator",
        "For a target margin expressed as a decimal, price equals cost divided by one minus the margin. Margin equals profit divided by price. Markup equals profit divided by cost. A target of 100% margin cannot be reached with positive cost in this model. Round the customer price carefully and check the resulting margin again.",
      ],
    ],
    example:
      "With £400 total cost, a 25% markup gives a £500 price and £100 profit. The margin is £100 divided by £500, or 20%. For a 25% margin, £400 divided by 0.75 gives £533.33 rounded. The difference is £33.33 of price before any applicable VAT.",
    checklist: [
      "Write the full cost first.",
      "Label the percentage as margin or markup.",
      "Calculate the selling price.",
      "Check the margin after rounding.",
    ],
    helpPrompt:
      "I have been adding a percentage to costs and calling it margin. Could someone check one anonymised example and help me use the terms consistently?",
    nextStep: {
      label: "Test margin in the pricing calculator",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "allocate-business-overheads-without-double-counting",
    title: "Give each job a share of overhead without counting it twice",
    category: "Pricing and profit",
    description:
      "A simple method for allocating monthly business costs across realistic chargeable hours.",
    intro:
      "Insurance, software and general administration still need paying when they are not attached to a particular customer. Allocating overhead helps you see whether a price contributes enough to keep the business running.",
    sections: [
      [
        "Choose a realistic denominator",
        "Add the relevant monthly overheads, then divide by the hours you realistically expect to charge for in that month. Do not use every hour you are awake or every working hour if some is needed for selling and admin. Where costs vary seasonally, use a representative period and review it.",
      ],
      [
        "Keep direct and shared costs separate",
        "Materials bought for one job normally sit in that job's cost. General subscriptions may sit in overhead. If a travel allowance already includes vehicle costs, inspect whether you are also allocating the same costs through overhead. There is no universal allocation for every business; clarity and consistency matter.",
      ],
    ],
    example:
      "Illustrative overhead of £900 across 90 chargeable hours gives a £10 hourly allocation. A six-hour job carries £60 overhead. If only 60 hours are realistically billable, the same monthly overhead requires £15 per hour instead. Capacity assumptions can change the result substantially.",
    checklist: [
      "List monthly shared operating costs.",
      "Convert annual costs to the same period.",
      "Estimate achievable chargeable hours.",
      "Check that no expense appears twice.",
    ],
    helpPrompt:
      "Could a practical business owner help me distinguish direct job expenses from shared overhead? I can share anonymised categories rather than bank statements.",
    nextStep: {
      label: "Build the overhead into your price",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "break-even-jobs-versus-available-capacity",
    title: "Your break-even target also needs to fit in the diary",
    category: "Pricing and profit",
    description:
      "Compare required sales with the time available to deliver them before chasing more volume.",
    intro:
      "A break-even calculator can tell you how many sales cover the costs in a simple model. It cannot give you extra hours. Compare the required work with the capacity you can actually deliver.",
    sections: [
      [
        "Calculate contribution first",
        "Contribution is the selling price less variable costs for the sale. Fixed costs divided by positive contribution gives a break-even sales quantity. Round up when selling whole jobs. If contribution is zero or negative, there is no finite break-even quantity in this simple model. Keep all inputs on the same time and VAT basis.",
      ],
      [
        "Check the calendar constraint",
        "Estimate delivery time, travel and unavoidable administration. Include downtime and realistic demand, not just theoretical maximum bookings. If the required sales exceed capacity, consider price, scope, service mix or overhead. Adding more low-contribution work can make the diary busier without solving the problem.",
      ],
    ],
    example:
      "At £150 per job with £50 variable cost, contribution is £100. Monthly fixed costs of £1,500 require 15 jobs. If a job consumes a day and only 12 days are available, the target does not fit. The model needs changing before a marketing push.",
    checklist: [
      "Use a single week or month.",
      "Work out contribution per job.",
      "Round required whole jobs up.",
      "Compare delivery hours with your actual diary.",
    ],
    helpPrompt:
      "My model needs more jobs than I can deliver alone. Could someone help me compare a smaller scope, different price and different service mix?",
    nextStep: {
      label: "Check your break-even point",
      href: "/tools/profit-break-even-calculator",
    },
  },
  {
    slug: "minimum-job-price-for-small-service-visits",
    title: "Does your business need a minimum job price?",
    category: "Pricing and profit",
    description:
      "Understand the fixed effort of small visits before deciding how to price them fairly.",
    intro:
      "A fifteen-minute task can still require a booking, travel, parking and payment administration. A minimum charge may be sensible, but customers need to understand what it covers before agreeing to the visit.",
    sections: [
      [
        "Cost the smallest realistic visit",
        "Separate the task from the fixed effort of attending. Include preparation and a fair allocation of overhead, without double counting. Compare the result with what customers value. If tiny jobs rarely work financially, consider grouping local visits or offering a clearly bounded remote option where suitable.",
      ],
      [
        "Explain the basis before booking",
        "State whether the minimum includes a time allowance, travel area, materials or diagnosis. Make additional charges and any applicable VAT clear. Do not advertise a cheap task price and only reveal an unavoidable attendance charge afterwards. A minimum charge should help a customer understand the total decision.",
      ],
    ],
    example:
      "A technician estimates 20 minutes of preparation, 40 minutes of travel and 15 minutes on site. Even before materials, the business is allocating 75 minutes to the appointment. They test a clearly described minimum visit charge rather than pricing only the hands-on minutes.",
    checklist: [
      "Time the entire smallest visit.",
      "Define what the minimum includes.",
      "Explain extra work and materials.",
      "Check the full advertised customer price.",
    ],
    helpPrompt:
      "Could someone read my minimum-visit wording and tell me whether the included time, travel and extra charges are clear?",
    nextStep: {
      label: "Cost a small service job",
      href: "/tools/job-pricing-calculator",
    },
    sources: ["ads"],
  },
  {
    slug: "calculate-the-cost-of-a-discount",
    title: "What does a discount really cost your business?",
    category: "Pricing and profit",
    description:
      "Check the effect on contribution before agreeing to a lower price.",
    intro:
      "A small percentage discount on the selling price can remove a much larger percentage of the profit available. Before reducing a quote, calculate the effect and decide why the concession makes sense.",
    sections: [
      [
        "Keep costs visible",
        "Separate costs that genuinely reduce with the discount from those that stay the same. If the same labour and materials are required, the discount usually comes from the amount left over. Do not assume you can make it up through volume without checking both capacity and additional costs.",
      ],
      [
        "Exchange scope rather than hide the cost",
        "A lower price can reflect less work, a different timetable or a deliberately bounded contribution. Explain the difference honestly. If advertising a discount, use a genuine basis for comparison rather than inventing a high usual price. A free sample also needs a clear limit and no surprise obligation.",
      ],
    ],
    example:
      "A £500 job with £400 cost leaves £100. A 10% discount cuts the price to £450 and leaves £50, halving the amount left before excluded costs and taxes. Delivering two discounted jobs may require twice the work to recover the original £100.",
    checklist: [
      "Calculate the amount left at full price.",
      "Repeat at the proposed discount.",
      "Check whether scope or costs change.",
      "State the genuine terms and limits.",
    ],
    helpPrompt:
      "I want to offer a startup discount without making the work unsustainable. Could someone check the scope and cost comparison in one illustrative quote?",
    nextStep: {
      label: "Check the job economics",
      href: "/tools/job-pricing-calculator",
    },
    sources: ["ads"],
  },
  {
    slug: "review-prices-when-costs-change",
    title: "Review your prices when costs change, without guessing",
    category: "Pricing and profit",
    description:
      "Compare old and current job costs, then explain future pricing changes clearly.",
    intro:
      "Keeping the same price while time and supplier costs change can quietly reduce what a job leaves behind. A price review starts with current evidence, not a percentage copied from another business.",
    sections: [
      [
        "Re-cost representative jobs",
        "Choose three common jobs and compare estimated with actual hours, materials and overhead. Look for repeated overruns as well as supplier price changes. Use a consistent VAT basis. A job that was profitable last year is not automatically profitable today, but one unusual overrun should not dictate every price.",
      ],
      [
        "Respect existing commitments",
        "Separate future quotes from work already agreed. Check contractual terms before altering a committed price or an ongoing arrangement. Explain what changes, when and why in ordinary language. Where a smaller scope remains available, describe it accurately rather than quietly reducing service while keeping the old promise.",
      ],
    ],
    example:
      "A maintenance business discovers that a standard visit routinely takes 90 minutes rather than the estimated hour. Part of the fix is a better scope description; part is a revised price for future bookings. The owner does not add unexpected charges to already accepted fixed quotes.",
    checklist: [
      "Select representative completed jobs.",
      "Compare actual time and costs.",
      "Separate new work from current commitments.",
      "Write a clear effective-date explanation.",
    ],
    helpPrompt:
      "Could someone review a proposed price-change explanation for future customers? I want it clear, factual and consistent with the work I actually provide.",
    nextStep: {
      label: "Recalculate a typical job",
      href: "/tools/job-pricing-calculator",
    },
  },
  {
    slug: "profit-is-not-cash-in-the-bank",
    title: "Why a profitable month can still leave you short of cash",
    category: "Pricing and profit",
    description:
      "Separate work earned, invoices issued and money received when planning business cash.",
    intro:
      "A profitable job may require materials today and pay next month. Your accounts and your bank balance describe different things. Understand the timing before assuming a good sales month has solved a cash problem.",
    sections: [
      [
        "Put expected money on dates",
        "List when cash is likely to arrive and when bills must leave. Mark uncertain receipts honestly. An invoice date is not a receipt date, and a deposit is not automatically profit available to spend. Include payment-provider delays, refunds and upcoming obligations where relevant.",
      ],
      [
        "Look ahead before accepting more work",
        "Growth can increase the cash needed for supplies and delivery. Ask whether your agreed payment stages fit that timing. Keep business taxes and other obligations in the plan using advice appropriate to your circumstances. This exercise is a planning view, not a replacement for accounts or personalised financial advice.",
      ],
    ],
    example:
      "A business earns £3,000 from a job costing £2,000, but must pay suppliers before the customer pays. The £1,000 difference does not fund the earlier £2,000 outflow. The owner needs to understand the gap and agree an appropriate payment structure before committing.",
    checklist: [
      "List expected receipts by date.",
      "List unavoidable outgoing payments.",
      "Mark uncertain amounts and delays.",
      "Review the lowest projected cash point.",
    ],
    helpPrompt:
      "Could a bookkeeper help me understand an anonymised cash-timing plan? I need to distinguish invoices from receipts and identify questions to take to my accountant.",
    nextStep: { label: "Request relevant business help", href: "/find-help" },
    sources: ["plan"],
  },
];
