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
  focusSections?: Array<{
    label: string;
    title: string;
    copy: string;
  }>;
  relatedLinks?: Array<{
    label: string;
    href: string;
  }>;
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
  },
  businessOwnerNetworkUk: {
    path: "/business-owner-network-uk",
    title: "Business Owner Network UK",
    metaTitle: "Business Owner Network UK",
    description:
      "A private business owner network for people building real companies, making real decisions and looking for a calmer, more useful room.",
    keywords: [
      "business owner network UK",
      "business owner community UK",
      "private business network",
      "business networking for owners",
      "UK business community"
    ],
    eyebrow: "Business owner network UK",
    heroTitle: "A private business owner network for serious UK operators.",
    heroCopy:
      "The Business Circle Network is for people building real companies, making real decisions and looking for a calmer, more useful room around the work.",
    answerQuestion: "What is a serious business owner network in the UK?",
    answerText:
      "A serious business owner network gives owners a private, standards-led environment where context, trust and useful conversation matter more than public performance. BCN is being built for UK business owners who want clearer thinking, protected member areas, practical resources and a calmer route into better business relationships.",
    problemTitle: "Business owners need better rooms, not more noise",
    problemCopy:
      "Many owners already have enough content, events and surface-level conversations. What is often missing is a room where people understand owner pressure, respect privacy and can discuss decisions with useful context.",
    alternativeTitle: "What makes The Business Circle Network different",
    alternativeCopy:
      "BCN separates the public explanation from the private member environment. Public pages explain the standard. Member profiles, rooms, resources, dashboards and messages stay protected behind authentication and tier access.",
    fitItems: [
      "UK business owners making serious decisions",
      "Founders who want context before conversation",
      "Operators who prefer trust and standards over noise",
      "Owners looking for useful relationships, not public performance"
    ],
    focusSections: [
      {
        label: "Better conversations",
        title: "How BCN supports better conversations",
        copy:
          "The network is designed around protected rooms, clearer profiles and member resources, so conversations can begin with more context and less cold explanation."
      },
      {
        label: "Founder Audit",
        title: "How the Founder Audit helps you choose the right starting point",
        copy:
          "The Founder Audit gives owners a calmer way to reflect on fit before choosing a membership room. It helps turn interest into a more informed next step."
      }
    ],
    relatedLinks: [
      { label: "Founder Community UK", href: "/founder-community-uk" },
      { label: "Private Business Network", href: "/private-business-network" },
      { label: "Business Networking UK", href: "/business-networking-uk" },
      { label: "Insights", href: "/insights" }
    ],
    faqItems: [
      {
        question: "Is BCN a business owner network for the UK?",
        answer:
          "Yes. BCN is positioned for UK business owners, founders and serious operators who want a private business environment with clearer standards and better conversations."
      },
      {
        question: "Is BCN the same as a normal networking group?",
        answer:
          "No. BCN is being built as a private member environment with protected dashboards, resources, rooms, profiles and tiered access rather than a public networking feed."
      },
      {
        question: "Can I run the Founder Audit before joining?",
        answer:
          "Yes. The Founder Audit is available publicly and helps owners choose a clearer starting point before exploring membership."
      }
    ]
  },
  founderCommunityUk: {
    path: "/founder-community-uk",
    title: "Founder Community UK",
    metaTitle: "Founder Community UK",
    description:
      "A private founder community for UK business owners who want clearer thinking, better conversations and a serious environment to grow inside.",
    keywords: [
      "founder community UK",
      "private founder community",
      "UK founder network",
      "startup founder community",
      "business founder network"
    ],
    eyebrow: "Founder community UK",
    heroTitle: "A private founder community for clearer thinking and better conversations.",
    heroCopy:
      "BCN is being built for UK founders and business owners who want signal over noise, a serious room around the work and practical resources that stay protected inside membership.",
    answerQuestion: "What should a private founder community give UK business owners?",
    answerText:
      "A private founder community should give owners a calmer environment for clearer thinking, trusted conversations, useful resources and better context around serious decisions. BCN is being built carefully around those standards rather than pretending to be a large public social network.",
    problemTitle: "Founders need signal, not noise",
    problemCopy:
      "Founders can lose time in spaces that reward speed, visibility and volume before understanding. Serious decisions need context, trust and a room that can hold complexity calmly.",
    alternativeTitle: "What members should expect from BCN",
    alternativeCopy:
      "Members should expect a protected environment with practical resources, member areas, standards, tiered access and founder-led thinking. The aim is a useful room, not a loud platform.",
    fitItems: [
      "UK founders who want a private environment around serious decisions",
      "Startup founders who want calmer context without hype",
      "Business owners who value protected resources and clearer standards",
      "Operators who want better conversations as the business grows"
    ],
    focusSections: [
      {
        label: "Soft launch honesty",
        title: "BCN is being built carefully",
        copy:
          "The platform is in a careful build and soft-launch phase. That means the public site explains the direction without making inflated claims about size, activity or outcomes."
      },
      {
        label: "Founder-led build",
        title: "How the environment is being shaped",
        copy:
          "Trevor Newton is shaping BCN around clearer thinking, practical member resources and protected rooms for people carrying real business decisions."
      }
    ],
    relatedLinks: [
      { label: "Business Owner Network UK", href: "/business-owner-network-uk" },
      { label: "Private Business Network", href: "/private-business-network" },
      { label: "Founder Audit", href: "/audit" },
      { label: "Insights", href: "/insights" }
    ],
    faqItems: [
      {
        question: "Is BCN a private founder community?",
        answer:
          "Yes. BCN is being built as a private founder-led business environment with member-only resources, rooms, dashboards and standards."
      },
      {
        question: "Is BCN making claims about large member numbers?",
        answer:
          "No. The public positioning is deliberately careful. BCN is being built steadily and does not rely on inflated claims, fake activity or testimonials."
      },
      {
        question: "Who is the founder community for?",
        answer:
          "It is for UK founders, business owners and serious operators who want clearer thinking, better conversations and a calmer environment around the work."
      }
    ]
  }
} as const satisfies Record<string, PublicIntentPage>;

export const PUBLIC_INTENT_PAGE_ROUTES = Object.values(PUBLIC_INTENT_PAGES).map(
  (page) => page.path
);
