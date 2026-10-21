import type { BcnBlogDraft } from "./types";
export const websites: BcnBlogDraft[] = [
  {
    slug: "check-your-business-homepage-in-five-minutes",
    title: "Give your homepage a five-minute clarity check",
    category: "Websites",
    description:
      "Check whether a new visitor can understand your service, location and next step.",
    intro:
      "Open your homepage as someone who has never heard of you. They arrive with a task, not a desire to admire your design. Can they understand whether you can help before scrolling through several screens?",
    sections: [
      [
        "Look for the buying basics",
        "Check the main heading, opening description and first action. Together they should explain the work, intended customer and relevant location or delivery method. Specific descriptions usually help more than vague claims. A useful photo supports the explanation; it should not contain essential information that is absent from the page text.",
      ],
      [
        "Ask someone to complete a task",
        "Give an unfamiliar person a concrete task, such as finding whether you cover their area. Watch without guiding them. Record where they hesitate. This is a small usability observation, not a performance audit, accessibility certification or proof that the entire website works.",
      ],
    ],
    example:
      "A visitor looking for boiler servicing sees 'Reliable solutions for modern living'. Replacing that with an accurate service-and-area heading answers the first question sooner. The improvement still needs testing with real visitors.",
    checklist: [
      "Name the service clearly.",
      "Show the relevant area or delivery method.",
      "Check one obvious next step.",
      "Observe an unfamiliar reader doing a task.",
    ],
    helpPrompt:
      "Could someone try to find my service area and enquiry route on the homepage? Please tell me where you hesitate, without entering personal details.",
    nextStep: {
      label: "Run the website self-assessment",
      href: "/tools/website-health-checklist",
    },
  },
  {
    slug: "test-a-contact-form-without-missing-enquiries",
    title: "Does your contact form actually deliver the enquiry?",
    category: "Websites",
    description:
      "Test the whole form journey, including errors, confirmation and receipt.",
    intro:
      "A form can look convincing while sending nothing to the right person. Test from the visitor's first field through to a received message. A 'thank you' screen alone does not prove delivery.",
    sections: [
      [
        "Use a clearly labelled test",
        "Enter synthetic details and a message marked TEST. Check required-field errors and a valid submission. Confirm that the destination inbox receives it, including any spam handling. Avoid repeated submissions that could trigger alerts or rate limits. Test only a site you own or are authorised to check.",
      ],
      [
        "Make the outcome understandable",
        "Tell visitors what happened, when to expect a reply and what to do if the issue is urgent. Provide an appropriate alternative contact route. Do not expose submitted personal details in public URLs or analytics. A manual test is useful evidence for that occasion, not continuous monitoring.",
      ],
    ],
    example:
      "A shop's form displays a success message, but its email service rejects delivery. An owner discovers the gap by checking both ends, then retests after the configuration is fixed. Merely changing the button would not have solved it.",
    checklist: [
      "Use synthetic test details.",
      "Check errors and a valid submission.",
      "Verify actual receipt.",
      "Confirm expectations and an alternative route.",
    ],
    helpPrompt:
      "I need help checking my own enquiry form from submission to receipt. Could a developer help using synthetic details and explain what the test can and cannot establish?",
    nextStep: { label: "Find website help", href: "/find-help" },
    sources: ["privacy"],
  },
  {
    slug: "mobile-website-check-for-business-owners",
    title: "Check your website on a phone before adding another feature",
    category: "Websites",
    description:
      "Try the real customer journey on a small screen, including navigation and forms.",
    intro:
      "Your customer may be outside, distracted and using one thumb. A desktop screenshot cannot tell you whether the mobile journey works. Start with the few tasks that matter most to your business.",
    sections: [
      [
        "Try the complete journey",
        "On a real phone, find a service, check the relevant detail and reach the enquiry or purchase step. Try the menu, cookie controls and form. Look for clipped text, accidental sideways scrolling and controls that are hard to tap. Use text enlargement too. Do not enter a real order simply to test without an agreed test process.",
      ],
      [
        "Prioritise blocking problems",
        "A broken enquiry route matters more than a decorative animation. Record the page, device, browser and steps that reproduce the issue. Share a screenshot only after checking it contains no personal information. A small device sample helps find problems but does not establish universal compatibility.",
      ],
    ],
    example:
      "A booking button is visible on desktop but hidden under a mobile banner. Testing the actual task exposes the obstruction. The owner can give a developer an exact reproduction instead of saying the site 'feels wrong'.",
    checklist: [
      "Try a key task on a real phone.",
      "Open and close navigation.",
      "Enlarge text and inspect forms.",
      "Record reproducible blocking issues.",
    ],
    helpPrompt:
      "Could someone try my public service-to-enquiry journey on a small phone and identify one reproducible obstacle? Please stop before sending a real enquiry.",
    nextStep: {
      label: "Use the website checklist",
      href: "/tools/website-health-checklist",
    },
    sources: ["accessibility"],
  },
  {
    slug: "business-website-accessibility-first-checks",
    title: "Accessibility checks a business owner can start with",
    category: "Websites",
    description:
      "Look at headings, keyboard use, labels and readable content without claiming a full audit.",
    intro:
      "Accessibility helps people use your website in different circumstances. You can spot some common barriers yourself, but passing a few checks is not a certification. Treat the findings as a starting point for improvement.",
    sections: [
      [
        "Check structure and controls",
        "Look for meaningful page titles and headings. Try navigating with a keyboard and see whether focus remains visible. Check that form fields have useful labels and errors explain what to fix. Ensure important information is available as text rather than only inside an image. Use W3C guidance for the relevant detail.",
      ],
      [
        "Combine methods",
        "Automated tools can find some issues; manual checks and testing with disabled users reveal others. Do not promise full compliance from a scanner score. Record the tested page and task, fix important barriers and retest. Captions, alternatives and understandable language also need attention where relevant.",
      ],
    ],
    example:
      "A contact field has only a pale placeholder. Once someone starts typing, its purpose disappears. A persistent visible label helps people understand the field and gives the developer a concrete improvement to implement correctly.",
    checklist: [
      "Inspect page titles and headings.",
      "Try keyboard navigation.",
      "Check form labels and errors.",
      "Plan further testing rather than claiming certification.",
    ],
    helpPrompt:
      "Could an accessibility specialist help prioritise barriers on my main enquiry journey? I want an honest scope and clear findings rather than a badge from an automated score.",
    nextStep: {
      label: "Start a website self-assessment",
      href: "/tools/website-health-checklist",
    },
    sources: ["accessibility"],
  },
  {
    slug: "write-a-useful-business-service-page",
    title: "What should a useful service page tell a customer?",
    category: "Websites",
    description:
      "Explain scope, fit, process and pricing information before asking for an enquiry.",
    intro:
      "A service page should help someone decide whether to contact you. It needs more than repeated claims that you are friendly and professional. Answer the questions a suitable customer actually brings.",
    sections: [
      [
        "Build around decisions",
        "Describe the task, who it suits, the area served, what is included and what is excluded. Explain the process and information needed to quote. Give honest pricing context where possible. Use real evidence with permission and describe limitations. Do not invent reviews or use stock imagery as proof of your own completed work.",
      ],
      [
        "Provide a clear next step",
        "Tell the reader what happens after they enquire and how soon they can reasonably expect a response. Link to related practical information without burying the main task. A short accurate page can be more useful than a long page repeating the same keyword in every heading.",
      ],
    ],
    example:
      "A rendering contractor explains preparation, access, finish options and the factors that affect a site quote. A customer can ask better questions before booking a survey. The page avoids promising a universal fixed price for unknown buildings.",
    checklist: [
      "Explain fit and scope.",
      "Describe the working process.",
      "Use genuine evidence.",
      "Make the enquiry step and response expectation clear.",
    ],
    helpPrompt:
      "Could a business owner read my service page and list the three things they would still need to know before enquiring?",
    nextStep: {
      label: "Check the customer journey",
      href: "/tools/website-health-checklist",
    },
    sources: ["google"],
  },
  {
    slug: "use-business-photos-without-misleading-customers",
    title: "Use photos that show your business honestly",
    category: "Websites",
    description:
      "Choose clear, permitted pictures without revealing private details or inventing proof.",
    intro:
      "Photos help when they answer a customer question: what the work looks like, who attends or where to find you. They damage trust when a stock scene is presented as your team or an invented result.",
    sections: [
      [
        "Show relevant detail",
        "Use clear photographs with an identifiable purpose. Ask permission where needed, including for customer premises and identifiable people. Check images for addresses, documents, vehicle plates or other information you should not publish. Keep original files and record the permissions and usage rights.",
      ],
      [
        "Separate illustration from evidence",
        "An illustration can explain an idea, but label it where a reader might mistake it for real work. Do not use generated before-and-after pictures as customer evidence. Give meaningful images useful text alternatives and avoid forcing visitors to download unnecessarily large files. A photographer can help if the task needs specialist skill.",
      ],
    ],
    example:
      "A joiner photographs a finished shelf with the customer's permission, cropping out family photographs and paperwork. The caption describes the actual job and materials. The picture provides evidence without turning the customer's home into unrestricted marketing material.",
    checklist: [
      "Choose a purpose for each image.",
      "Check rights and permission.",
      "Remove private details.",
      "Label illustrations and describe meaningful images.",
    ],
    helpPrompt:
      "Could a photographer help me plan five useful business photos and a simple permission process? I want genuine images, not a large shoot I cannot yet afford.",
    nextStep: { label: "Ask for a bounded contribution", href: "/ideas" },
    sources: ["ip", "privacy"],
  },
  {
    slug: "prepare-a-website-brief-before-hiring",
    title: "Prepare a website brief before asking for prices",
    category: "Websites",
    description:
      "Help developers quote comparable work by defining tasks, content and ownership.",
    intro:
      "'How much is a website?' is hard to answer usefully. A short brief makes the work clearer and helps you compare proposals. Begin with the customer tasks and business constraints, rather than a long wishlist of effects.",
    sections: [
      [
        "State the job the site must do",
        "Name the audience, key tasks, required pages, forms or integrations, available content and intended launch window. Explain accessibility and maintenance needs. Say what already exists and what must be preserved. Avoid sharing passwords or live customer exports just to obtain an initial estimate.",
      ],
      [
        "Ask about ongoing responsibility",
        "Clarify ownership of the domain, accounts, source or platform, content and relevant licences. Ask what hosting, updates, backups and support cost and what happens if you leave. A low build price can be hard to compare without this information. Confirm inclusions and exclusions in writing.",
      ],
    ],
    example:
      "A clinic's brief identifies booking information, practitioner details, accessibility needs and an existing booking-system link. It asks bidders to separate content work from technical setup and ongoing support. Proposals become easier to compare without exposing patient information.",
    checklist: [
      "List the main visitor tasks.",
      "Identify existing assets and constraints.",
      "Clarify content and integration responsibilities.",
      "Ask for ongoing costs and exit arrangements.",
    ],
    helpPrompt:
      "Could a developer review my short website brief before I seek proposals? I want missing decisions identified, not a sales presentation.",
    nextStep: { label: "Request relevant providers", href: "/find-help" },
  },
  {
    slug: "small-website-fix-or-full-rebuild",
    title: "Does your website need a repair or a rebuild?",
    category: "Websites",
    description:
      "Separate a specific problem from broader platform limitations before committing to a project.",
    intro:
      "A disappointing website does not automatically need replacing. First establish what is wrong and whether it can be reproduced. A focused repair might solve the immediate problem, while an unsupported platform may need a larger decision.",
    sections: [
      [
        "Diagnose before redesigning",
        "List the business tasks that fail and the evidence for each. Separate broken functionality, unclear content, accessibility barriers, performance problems and missing features. Ask a competent developer which issues are local repairs and which stem from the underlying platform. Do not equate a dated visual style with a proven loss of sales.",
      ],
      [
        "Compare complete options",
        "For each option, consider scope, risk, ongoing maintenance, ownership and migration. Preserve valuable URLs and working functionality where practical. Back up before changes and agree a rollback approach. If a rebuild is justified, its brief should explain the actual limitations being replaced.",
      ],
    ],
    example:
      "A business has clear service pages but a broken contact form. Restoring delivery and testing it can be the first priority. Another business may lack a safe supported update path, making a planned migration more sensible than repeated patches.",
    checklist: [
      "Write reproducible problems.",
      "Obtain an evidence-based diagnosis.",
      "Compare repair and migration costs.",
      "Agree backups and release checks.",
    ],
    helpPrompt:
      "Could a developer assess whether these specific website problems need repairs or a rebuild? Please distinguish observed faults from design preferences.",
    nextStep: {
      label: "Record your website findings",
      href: "/tools/website-health-checklist",
    },
  },
];
