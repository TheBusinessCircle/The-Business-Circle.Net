export type PublicIntentPage = {
  path: string;
  title: string;
  metaTitle: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  heroTitle: string;
  heroCopy: string;
  answerQuestion: string;
  answerText: string;
  problemTitle: string;
  problemCopy: string;
  alternativeTitle: string;
  alternativeCopy: string;
  fitItems: string[];
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
};

export const PUBLIC_INTENT_PAGES = {
  privateBusinessNetwork: {
    path: "/private-business-network",
    title: "Private Business Network",
    metaTitle: "Private Business Network",
    description:
      "A private founder-led business network for owners who want better conversations, clearer thinking and trusted rooms without public social noise.",
    keywords: [
      "private business network",
      "private business community UK",
      "founder led business network",
      "business owner network UK"
    ],
    eyebrow: "Private business network",
    heroTitle: "A private business network built around standards, context and trust.",
    heroCopy:
      "The Business Circle Network gives serious owners a calmer place to connect, build context and find useful conversations without turning business relationships into a public feed.",
    answerQuestion: "What is a private business network?",
    answerText:
      "A private business network is a controlled environment where business owners can connect, share context and build trusted relationships away from public social feeds. The Business Circle Network is built for owners who want better conversations, clearer thinking, useful resources and founder-led standards inside a private member environment.",
    problemTitle: "The problem with open business spaces",
    problemCopy:
      "Open business spaces often reward visibility before trust. Owners can spend time posting, pitching and scanning noise without building the kind of context that makes a useful conversation possible.",
    alternativeTitle: "The BCN alternative",
    alternativeCopy:
      "BCN keeps the public site clear and the private environment protected. Member rooms, profiles, resources and conversations sit behind access, while public pages explain the standard and help owners decide whether the room fits.",
    fitItems: [
      "Owners who want business context before conversation",
      "Founders who value privacy and standards",
      "Operators who want fewer distractions around serious work",
      "Business owners looking for trusted relationships over public attention"
    ],
    faqItems: [
      {
        question: "Is The Business Circle Network a private business network?",
        answer:
          "Yes. It is designed as a private founder-led business environment with member-only access, structured rooms, resources, profiles and clear standards."
      },
      {
        question: "Are private member areas public?",
        answer:
          "No. Public pages explain the platform, but dashboards, private rooms, messages, billing data and sensitive member context are protected behind authentication and access rules."
      },
      {
        question: "How do owners join?",
        answer:
          "Owners review the membership rooms, choose the tier that fits, create an account through the join route and complete secure Stripe checkout before access opens."
      }
    ]
  },
  businessNetworkingUk: {
    path: "/business-networking-uk",
    title: "Business Networking UK",
    metaTitle: "Business Networking UK",
    description:
      "A calmer UK business networking alternative for owners who want useful conversations, trusted relationships and a private founder-led environment.",
    keywords: [
      "business networking UK",
      "business networking for owners",
      "UK business owner community",
      "networking alternative UK"
    ],
    eyebrow: "Business networking UK",
    heroTitle: "A calmer alternative to noisy UK business networking.",
    heroCopy:
      "BCN is for business owners who want the useful parts of networking without spammy promotion, loose rooms or constant public performance.",
    answerQuestion: "What is a better alternative to traditional business networking in the UK?",
    answerText:
      "A better alternative to traditional UK business networking is a private, standards-led environment where owners can build trust, understand context and have useful conversations before chasing referrals. The Business Circle Network is built for business owners who want less noise, clearer thinking and stronger relationships.",
    problemTitle: "Traditional networking can become shallow quickly",
    problemCopy:
      "Many owners do not need more events, more pitches or more business cards. They need a serious room where people understand context, respect boundaries and build relationships with patience.",
    alternativeTitle: "BCN makes networking more structured",
    alternativeCopy:
      "The network combines member profiles, private rooms, useful resources, founder-led standards and clearer tier placement so conversations can start with more context and less noise.",
    fitItems: [
      "UK business owners who want a better room around them",
      "Founders who want useful conversation over empty activity",
      "Operators who prefer trust and context before promotion",
      "Owners who want connection, resources and clearer business thinking"
    ],
    faqItems: [
      {
        question: "Is BCN only for UK business owners?",
        answer:
          "The platform is currently positioned around UK business owners, founders and operators, while the underlying standards are useful for serious owners who want a private business environment."
      },
      {
        question: "How is BCN different from normal networking?",
        answer:
          "BCN is not built around public promotion or loose access. It is a private business owner environment with standards, rooms, profiles, resources and more deliberate conversation."
      },
      {
        question: "Can I run the Founder Audit before joining?",
        answer:
          "Yes. The Founder Audit is a short starting point for owners who want to understand which membership room may fit before they join."
      }
    ]
  }
} as const satisfies Record<string, PublicIntentPage>;

export const PUBLIC_INTENT_PAGE_ROUTES = Object.values(PUBLIC_INTENT_PAGES).map(
  (page) => page.path
);
