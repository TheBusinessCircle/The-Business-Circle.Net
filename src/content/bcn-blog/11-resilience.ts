import type { BcnBlogDraft } from "./types";
export const resilience: BcnBlogDraft[] = [
  {
    slug: "secure-your-business-email-first",
    title: "Start business account security with your email",
    category: "Staying resilient",
    description:
      "Protect the account that often controls password recovery for other business services.",
    intro:
      "Business email often receives password-reset links and important customer messages. If it is compromised, other accounts may be exposed too. Start by understanding who controls it and how recovery works.",
    sections: [
      [
        "Review sign-in and recovery",
        "Follow current NCSC guidance for strong account protection, including suitable multi-factor authentication. Use unique credentials and a reputable password manager where appropriate. Check recovery details and authorised access. Do not share one account password with every helper or leave recovery tied to a former supplier.",
      ],
      [
        "Prepare for an incident",
        "Know the provider's recovery route and keep essential support information available safely outside the affected account. Review suspicious forwarding rules or access through an authorised process. If compromise is suspected, use current incident guidance and qualified help. Do not send passwords or recovery codes to someone offering support in a message.",
      ],
    ],
    example:
      "An owner discovers a former provider still controls the recovery address. They resolve ownership through the provider's legitimate process and set up appropriate business recovery. They do not bypass access controls or publish account details on a help board.",
    checklist: [
      "Confirm business control of the account.",
      "Use appropriate multi-factor protection.",
      "Review recovery and delegated access.",
      "Keep a legitimate recovery plan.",
    ],
    helpPrompt:
      "I need an authorised review of our email ownership and recovery setup. Could someone explain the process without asking me to post credentials?",
    nextStep: { label: "Find suitable technical help", href: "/find-help" },
    sources: ["cyber"],
  },
  {
    slug: "backups-need-a-restore-check",
    title: "A backup is more useful when you know it restores",
    category: "Staying resilient",
    description:
      "Identify important records, protect copies and test recovery in an isolated environment.",
    intro:
      "A message saying 'backup complete' is not the same as knowing you can recover the business. Start with what you would need after a lost device, deleted file or unavailable service.",
    sections: [
      [
        "Define what must be recoverable",
        "List essential files, records and configuration, their owners and acceptable loss or downtime. Use current NCSC guidance to choose appropriate protected copies. Synchronisation alone may also replicate mistakes or deletions. Check access, retention and whether important attachments or database records are included.",
      ],
      [
        "Test safely",
        "Restore a representative backup into an isolated authorised environment, not over the live system. Check that records open and required relationships or files are present. Record the test and gaps. Protect restored personal data and remove test copies appropriately. Obtain expert help for consequential systems.",
      ],
    ],
    example:
      "A business tests a file restore and finds the exported project list lacks attachments. That gap can be fixed before an incident. Simply seeing a large archive file would not have established that the working records were recoverable.",
    checklist: [
      "List essential data and owners.",
      "Check protected copies and retention.",
      "Restore a representative sample safely.",
      "Record gaps and repeat after major changes.",
    ],
    helpPrompt:
      "Could someone help plan a restore test for our business records in an isolated environment? I do not want anyone overwriting the live system.",
    nextStep: { label: "Request technical support", href: "/find-help" },
    sources: ["cyber"],
  },
  {
    slug: "check-a-suspicious-supplier-payment-request",
    title: "A supplier changed their bank details. Check before paying",
    category: "Staying resilient",
    description:
      "Use an independently established contact route rather than trusting the message requesting the change.",
    intro:
      "A convincing email can still be fraudulent. Payment changes deserve a deliberate check, especially when the request is urgent or unusual. Do not let pressure replace verification.",
    sections: [
      [
        "Verify outside the suspicious message",
        "Use a known, independently established contact route for the supplier, not a number or link supplied in the change request. Follow your bank's current fraud guidance and your business's approval process. Do not reply with sensitive information or use an unfamiliar login page to prove your identity.",
      ],
      [
        "Make checking normal",
        "Agree who can approve payment-detail changes and how evidence is recorded. Ensure colleagues know that pausing is acceptable. If a payment may already have gone to a fraudster, contact the bank immediately through its genuine route and seek current reporting guidance. Do not assume a transfer can always be recovered.",
      ],
    ],
    example:
      "An invoice arrives with a new account and an urgent payment instruction. The owner phones the supplier using the established number in their records. The check happens before the transfer rather than relying on the familiar-looking email signature.",
    checklist: [
      "Pause an unexpected change.",
      "Use an independently verified contact.",
      "Follow appropriate payment approvals.",
      "Contact the bank promptly if fraud is suspected.",
    ],
    helpPrompt:
      "Could someone help us write a simple supplier bank-change checking process? We need a process review, not an assessment of real bank details in public.",
    nextStep: { label: "Find suitable business support", href: "/find-help" },
    sources: ["cyber"],
  },
  {
    slug: "know-what-customer-data-you-keep",
    title: "Know what customer information your business keeps",
    category: "Staying resilient",
    description:
      "Make a simple data inventory before adding another form, tool or helper.",
    intro:
      "Customer information can spread across inboxes, spreadsheets, phones and software. A basic inventory makes it easier to understand access, purpose and retention. Do not begin by copying all the information into one new document.",
    sections: [
      [
        "Record locations and purposes",
        "List categories of information, why you use them, where they are held and who can access them. Note relevant providers and sharing arrangements. Use the ICO's current small-organisation guidance for your obligations. A contact having enquired does not automatically justify every later use of their details.",
      ],
      [
        "Reduce unnecessary copies",
        "Look for exports, old shared folders and personal-device copies that no longer serve an appropriate purpose. Decide retention through a suitable process that also considers legal and contractual requirements. Do not delete records indiscriminately. Establish an authorised owner for access and retention decisions.",
      ],
    ],
    example:
      "A service business discovers enquiry spreadsheets have been copied into three shared drives. It identifies the working record, reviews access and plans appropriate retention. The inventory lists the locations without reproducing customer names and notes.",
    checklist: [
      "List data categories and purposes.",
      "Identify storage and access.",
      "Review unnecessary duplication.",
      "Agree an authorised retention process.",
    ],
    helpPrompt:
      "Could someone help me structure a data inventory for a small service business? I need guidance on categories and questions, without sharing real customer information.",
    nextStep: {
      label: "Request relevant professional help",
      href: "/find-help",
    },
    sources: ["privacy"],
  },
  {
    slug: "prepare-for-an-important-tool-going-down",
    title: "What happens if your most important business tool goes down?",
    category: "Staying resilient",
    description:
      "Plan a workable fallback for bookings, messages or records before an outage.",
    intro:
      "Every service can become unavailable. A modest continuity plan starts with the task that cannot wait and a safe way to continue or communicate. It does not require pretending you can recreate an entire platform instantly.",
    sections: [
      [
        "Identify the dependency",
        "Choose one critical tool and list the work that stops if it fails. Check what information can be accessed safely offline and who owns the recovery route. Review the provider's status and support options. Do not bypass security or export excessive personal data merely to create a fallback.",
      ],
      [
        "Test the fallback",
        "Use a controlled exercise to check that the people involved understand the temporary process. Define what must be reconciled when service returns, including duplicate bookings or transactions. Keep customers informed with accurate expectations. A fallback should reduce confusion, not create an uncontrolled second record system.",
      ],
    ],
    example:
      "A booking business prepares a secure temporary enquiry log and a clear customer message for an outage. When the system returns, one responsible person reconciles the log before confirming appointments. This avoids silently accepting conflicting bookings.",
    checklist: [
      "Choose one critical dependency.",
      "Document legitimate support and recovery.",
      "Test a safe temporary process.",
      "Plan reconciliation after recovery.",
    ],
    helpPrompt:
      "Could someone help us design a small booking-system outage drill with synthetic information? We want to test communication and reconciliation safely.",
    nextStep: {
      label: "Ask for practical technical experience",
      href: "/ideas",
    },
    sources: ["cyber", "privacy"],
  },
  {
    slug: "reduce-reliance-on-one-big-customer",
    title: "Understand your reliance on one large customer",
    category: "Staying resilient",
    description:
      "Review revenue, contribution and commitments without damaging a valuable relationship.",
    intro:
      "A large customer can be a strong relationship and a concentration risk at the same time. Understand the exposure before making promises based on work that may change. The aim is a resilient business, not an excuse to neglect a good customer.",
    sections: [
      [
        "Measure more than revenue share",
        "Look at collected revenue, contribution, outstanding invoices, time used and future commitments. Separate contracted work from informal expectations. Consider what happens if volume falls or payment is delayed. Do not publish identifiable customer figures in a community request.",
      ],
      [
        "Choose gradual safeguards",
        "Review suitable cash planning, clear agreements and realistic ways to serve other customers. Avoid spending heavily on capacity supported only by an unconfirmed expectation. Qualified advice may be needed for contractual or financial decisions. Diversification should be tested with the same care as any new offer.",
      ],
    ],
    example:
      "A studio finds one client supplies half its income but uses most urgent capacity. It checks the agreement and tests a small route to other suitable work. It does not assume the large client will disappear or that replacement sales arrive automatically.",
    checklist: [
      "Review contribution and payment exposure.",
      "Separate commitments from expectations.",
      "Model a plausible change in volume.",
      "Choose a small resilience action.",
    ],
    helpPrompt:
      "Could someone help me interpret an anonymised customer-concentration summary and identify questions for my accountant?",
    nextStep: {
      label: "Request business advice privately",
      href: "/find-help",
    },
  },
  {
    slug: "plan-for-a-quiet-business-season",
    title: "Plan for a quiet season while the diary is still busy",
    category: "Staying resilient",
    description:
      "Use real seasonal records to prepare cash, maintenance and relevant customer activity.",
    intro:
      "A quiet period is easier to plan for before it arrives. Use your own records rather than assuming every year repeats exactly. Separate predictable seasonality from a new problem that needs investigation.",
    sections: [
      [
        "Review the actual pattern",
        "Compare enquiries, completed work, contribution and cash receipts by period. Note unusual events and changes in service mix. A drop in sales may arrive before or after a drop in cash. Avoid building a forecast from a single exceptional month.",
      ],
      [
        "Plan suitable work",
        "Consider maintenance, training, useful content and permitted customer activity that fit the quieter period. Test any seasonal offer before relying on it. Do not discount all work automatically or assume unused capacity has no cost. Review commitments and obtain suitable advice if the cash outlook is concerning.",
      ],
    ],
    example:
      "A garden business uses past winters to plan equipment maintenance and test a genuinely relevant service. It checks the costs and demand rather than adding an unrelated offer simply to fill the calendar.",
    checklist: [
      "Review several periods of real records.",
      "Distinguish sales and receipt timing.",
      "Plan useful work and commitments.",
      "Test any new seasonal offer.",
    ],
    helpPrompt:
      "Could another seasonal service owner help me challenge a quiet-period plan using anonymised figures and realistic capacity?",
    nextStep: {
      label: "Check your break-even assumptions",
      href: "/tools/profit-break-even-calculator",
    },
  },
  {
    slug: "make-a-business-if-im-unavailable-note",
    title: "Write an 'if I am unavailable' note for your business",
    category: "Staying resilient",
    description:
      "Document essential contacts and next actions without creating a list of exposed passwords.",
    intro:
      "If you are the only person who knows what happens next, a short absence can become a business problem. An essential-operations note helps an authorised person understand priorities without giving them unrestricted access.",
    sections: [
      [
        "Capture the minimum essentials",
        "List current commitments, appropriate support contacts, critical dates and where authorised records are held. Explain who may make decisions and where limits apply. Do not place passwords, recovery codes or full customer records in an ordinary document. Use suitable secure access and recovery arrangements.",
      ],
      [
        "Review it with the right person",
        "Choose someone appropriately authorised and check they understand the note. Keep it current after important changes. Agree what can wait, what must be escalated and how customers should be informed. Professional advice may be needed for formal authority or continuity arrangements.",
      ],
    ],
    example:
      "A sole trader records where the accepted job schedule is held and how an authorised colleague can contact booked customers appropriately. The colleague knows the limits of their role and does not have to search through a private inbox.",
    checklist: [
      "Identify essential commitments.",
      "Name authorised contacts and limits.",
      "Link secure records without copying secrets.",
      "Review the note after major changes.",
    ],
    helpPrompt:
      "Could someone review a blank continuity-note structure and suggest missing operational questions? I will keep private access details out of the discussion.",
    nextStep: { label: "Find practical business support", href: "/ideas" },
    sources: ["cyber", "privacy"],
  },
];
