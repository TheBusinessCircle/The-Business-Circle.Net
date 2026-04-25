export const LEGAL_LAST_UPDATED = "14 April 2026";
export const TERMS_VERSION = "2026-04-25";
export const BCN_RULES_VERSION = "2026-04-25";
export const TERMS_LAST_UPDATED = "25 April 2026";
export const BCN_RULES_LAST_UPDATED = "25 April 2026";

export const PRIVACY_POLICY_CONTENT = {
  label: "Privacy Policy",
  title: "Privacy Policy",
  description:
    "How The Business Circle Network collects, uses, stores, and protects information connected to the website, memberships, enquiries, and founder services.",
  intro:
    "This Privacy Policy explains how The Business Circle Network handles personal information when you browse the website, enquire about services, apply for membership, create an account, or use the platform.",
  sections: [
    {
      title: "Who this policy applies to",
      paragraphs: [
        "This policy applies to visitors, members, applicants, contacts, and service enquiries connected to The Business Circle Network website and related platform services.",
        "It covers information provided directly by you, information created through your use of the platform, and limited technical information collected to keep the site working properly and securely."
      ]
    },
    {
      title: "Information we may collect",
      paragraphs: [
        "We may collect contact details, account information, profile information, business details, billing-related information, communication history, founder service enquiry information, and limited device or usage data.",
        "Payment card information is handled by Stripe. We do not store full card details on our own systems."
      ],
      bullets: [
        "Name, email address, and contact details",
        "Business name, role, website, profile, or company details",
        "Membership, subscription, and billing status information",
        "Messages, support requests, contact submissions, and founder-service forms",
        "Basic technical data such as IP address, browser details, and site usage signals"
      ]
    },
    {
      title: "How we use information",
      paragraphs: [
        "We use information to operate the platform, manage memberships, deliver resources and community features, respond to support requests, process founder-service enquiries, improve site performance, and maintain platform security.",
        "We may also use information to send important service messages related to accounts, billing, security, updates, or support."
      ],
      bullets: [
        "To create and manage member accounts",
        "To process subscriptions, upgrades, and account access",
        "To respond to enquiries, support requests, and founder-service applications",
        "To improve the website, member experience, and service quality",
        "To protect the platform against misuse, fraud, or abuse"
      ]
    },
    {
      title: "Sharing and service providers",
      paragraphs: [
        "We only share information with service providers or partners where it is reasonably necessary to run the website, deliver services, process payments, communicate with users, store files, or protect the platform.",
        "Examples may include hosting providers, payment processors, email tools, file storage providers, and analytics or security services."
      ]
    },
    {
      title: "Retention and protection",
      paragraphs: [
        "We keep information for as long as it is needed for operational, contractual, security, support, record-keeping, or legal reasons.",
        "We take reasonable technical and organisational steps to protect information, but no internet-based system can be guaranteed to be completely secure."
      ]
    },
    {
      title: "Your choices",
      paragraphs: [
        "You can contact us if you need help updating account details, handling support requests, or asking questions about how your information is used.",
        "If you no longer want marketing or optional communications, you can opt out using the relevant links or by contacting support."
      ]
    }
  ]
} as const;

export const TERMS_OF_SERVICE_CONTENT = {
  label: "Terms Of Service",
  title: "Terms of Service",
  description:
    "The terms that govern website use, membership access, subscriptions, founder service requests, acceptable use, and platform conduct within The Business Circle Network.",
  intro:
    "These Terms of Service set out the basic rules for using The Business Circle Network website, applying for membership, accessing the platform, and purchasing related founder services.",
  sections: [
    {
      title: "Acceptance of these terms",
      paragraphs: [
        "By using the website, creating an account, applying for membership, purchasing a subscription, or submitting a founder-service request, you agree to these terms.",
        "If you do not agree with these terms, you should not use the platform or related services."
      ]
    },
    {
      title: "Membership and account responsibility",
      paragraphs: [
        "You are responsible for keeping your account details accurate and for maintaining the security of your login credentials.",
        "Membership access is personal to the account holder unless we explicitly agree otherwise in writing."
      ],
      bullets: [
        "Use accurate information when registering or applying",
        "Keep login credentials secure",
        "Do not share access in ways that breach plan or platform rules",
        "Use the platform in a lawful and respectful way"
      ]
    },
    {
      title: "Subscriptions, billing, and upgrades",
      paragraphs: [
        "All membership access requires Stripe Checkout. Accounts are only activated after a successful checkout, including when a discount reduces the total to GBP 0.",
        "Subscriptions renew automatically unless cancelled through the Stripe billing portal or other supported workflow.",
        "Discounts, coupons, or promotion codes can reduce the price, including to GBP 0. Discounted memberships remain subscriptions and are still tied to Stripe customer and subscription records.",
        "If a payment fails, is reversed, or a subscription ends, access to member areas is restricted when Stripe marks the subscription as no longer active. If cancellation is set to end at period end, access continues until the current billing period ends.",
        "Plan changes, upgrades, or account access are subject to the current subscription status and platform rules in force at the time.",
        "Payments are non-refundable unless a refund is required by law or a specific written refund commitment has been agreed in advance."
      ]
    },
    {
      title: "Acceptable use and conduct",
      paragraphs: [
        "The Business Circle Network is designed as a professional, trust-led environment. Users must not misuse the website, abuse other members, upload harmful content, interfere with platform security, or use the network in misleading or unlawful ways.",
        "We may suspend or remove access where platform standards, community expectations, billing rules, or legal requirements are breached."
      ]
    },
    {
      title: "Content, intellectual property, and permissions",
      paragraphs: [
        "Platform design, branding, copy, resources, and original site materials remain the property of The Business Circle Network or the relevant rights holders unless stated otherwise.",
        "Members remain responsible for the content they submit and must ensure they have the rights and permissions needed to share it."
      ]
    },
    {
      title: "Founder services and enquiries",
      paragraphs: [
        "Founder services are subject to their own scope, pricing, fulfilment, and review process. Submitting an enquiry or request does not guarantee acceptance or availability.",
        "Where founder-service payments are required, the relevant payment and service status will be reflected through the platform workflow."
      ]
    },
    {
      title: "Liability and contact",
      paragraphs: [
        "We aim to keep the platform available, useful, and secure, but we do not guarantee uninterrupted access, specific business outcomes, or error-free service at all times.",
        "If you have questions about these terms, please contact support using the details provided in the website footer or contact page."
      ]
    }
  ]
} as const;

export const BCN_RULES_CONTENT = {
  label: "BCN Rules",
  title: "BCN Rules",
  description:
    "The operating standard for professionalism, respect, trust, messaging, events, and conduct inside The Business Circle Network.",
  intro:
    "The Standard Inside The Business Circle. The Business Circle is a private environment built for business owners who value clarity, respect, trust, and real progress. Access is granted on the understanding that every member contributes to the standard of the room.",
  sections: [
    {
      title: "1. Respect Is Non-Negotiable",
      paragraphs: [
        "Every interaction should reflect professionalism and basic respect.",
        "Disagreement is allowed. Disrespect is not."
      ],
      bullets: [
        "No hostility",
        "No harassment",
        "No personal attacks",
        "No discrimination of any kind"
      ]
    },
    {
      title: "2. This Is a Business Environment",
      paragraphs: [
        "This is not a place for noise, spam, or attention-seeking behaviour.",
        "Relationships should be built properly and respectfully."
      ],
      bullets: [
        "No mass messaging",
        "No unsolicited selling in private messages",
        "No irrelevant self-promotion",
        "No pressure-based networking"
      ]
    },
    {
      title: "3. Private Messaging Comes With Responsibility",
      paragraphs: [
        "1 to 1 messaging exists to build genuine connections, not to exploit access.",
        "If someone is not interested, respect it."
      ],
      bullets: [
        "Do not pitch immediately after connecting",
        "Do not send repeated unwanted messages",
        "Do not pressure other members into decisions",
        "Do not continue messaging after someone has shown they are not interested"
      ]
    },
    {
      title: "4. Video Calls and Group Events",
      paragraphs: [
        "Video calls, 1 to 1 calls, and group events are premium parts of the BCN experience and must be treated as such.",
        "Members are expected to join with intent, be present and engaged, respect speaking time and event structure, and contribute constructively."
      ],
      bullets: [
        "Do not record calls without permission",
        "Do not disrupt sessions",
        "Do not use calls to aggressively sell",
        "Do not share private meeting content outside the platform without consent"
      ]
    },
    {
      title: "5. Confidentiality and Trust",
      paragraphs: [
        "What is shared inside BCN should be treated with care.",
        "Trust is the foundation of the network."
      ],
      bullets: [
        "Do not share private conversations externally",
        "Do not screenshot or distribute member discussions without consent",
        "Do not misuse information gained through the platform",
        "Do not present another member's ideas, contacts, opportunities, or private information as your own"
      ]
    },
    {
      title: "6. No Harmful, Misleading, or Illegal Activity",
      paragraphs: [
        "BCN has zero tolerance for harmful, misleading, or unlawful conduct.",
        "Serious violations may result in immediate removal."
      ],
      bullets: [
        "No fraudulent behaviour",
        "No misleading claims",
        "No illegal services or offers",
        "No scams",
        "No impersonation",
        "No abusive conduct"
      ]
    },
    {
      title: "7. Protect the Environment",
      paragraphs: [
        "BCN is a curated business environment.",
        "If a member's behaviour lowers the quality, safety, or trust of the space, action may be taken.",
        "Where removal is due to rule violations, refunds may not be issued, subject to the Terms & Conditions and applicable law."
      ],
      bullets: [
        "A warning",
        "Temporary restriction",
        "Removal from specific features",
        "Full removal from the platform"
      ]
    },
    {
      title: "8. BCN Is Not for Everyone",
      paragraphs: [
        "The Business Circle is built for business owners who want to contribute, connect properly, and grow in a serious environment.",
        "If someone is here only to take, spam, sell aggressively, or extract value without contributing, this is not the right place for them."
      ]
    },
    {
      title: "Agreement",
      paragraphs: [
        "By joining The Business Circle, members agree to uphold these standards and help protect the quality of the environment.",
        "This is how BCN maintains a space where serious business owners can think clearly, connect properly, and move forward."
      ]
    }
  ]
} as const;

export const COOKIE_POLICY_CONTENT = {
  label: "Cookie Policy",
  title: "Cookie Policy",
  description:
    "How The Business Circle Network uses cookies and similar technologies for functionality, security, analytics, and experience improvement.",
  intro:
    "This Cookie Policy explains how cookies and similar technologies may be used across The Business Circle Network website and platform experience.",
  sections: [
    {
      title: "What cookies are",
      paragraphs: [
        "Cookies are small text files stored on your device that help websites recognise a browser, remember settings, maintain sessions, and understand how the site is being used.",
        "Some cookies are strictly necessary for security, authentication, and platform functionality. Others may help improve performance or user experience."
      ]
    },
    {
      title: "How we use cookies",
      paragraphs: [
        "Cookies may be used to support sign-in flows, remember preferences, maintain secure sessions, understand performance, improve the website, and reduce platform abuse or security issues."
      ],
      bullets: [
        "Authentication and secure session management",
        "Remembering preferences or site settings",
        "Performance monitoring and troubleshooting",
        "Analytics and experience improvement",
        "Security, fraud prevention, and platform protection"
      ]
    },
    {
      title: "Third-party technologies",
      paragraphs: [
        "Some cookies or similar technologies may be set through third-party services that support payments, analytics, communications, embedded content, or platform operations.",
        "Where third-party tools are used, their own privacy or cookie terms may also apply."
      ]
    },
    {
      title: "Managing cookies",
      paragraphs: [
        "You can usually manage or delete cookies through your browser settings. Restricting certain cookies may affect how parts of the website or member platform function.",
        "If you need help understanding the practical effect of cookie changes on the platform, please contact support."
      ]
    }
  ]
} as const;
