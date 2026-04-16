export const LEGAL_LAST_UPDATED = "14 April 2026";

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
