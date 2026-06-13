export type CommunityRoomGuidance = {
  title: string;
  shortIntro: string;
  whatThisRoomIsFor: string;
  howToPost: string[];
  suggestedPrompts: string[];
  examplePost: string;
  pinnedCtaLabel: string;
  pinnedCtaAction?: {
    href: string;
  };
  tierContext?: string;
  emptyState: {
    title: string;
    description: string;
  };
};

const FOUNDATION_TIER_CONTEXT =
  "Foundation is the shared member layer. It is not a basic room. It is where every member can build context, trust and early momentum without overwhelm.";

export const COMMUNITY_ROOM_GUIDANCE: Record<string, CommunityRoomGuidance> = {
  introductions: {
    title: "Introduction: Introduce Yourself",
    shortIntro: "This is the first place to say hello inside The Business Circle.",
    whatThisRoomIsFor:
      "Use this room to introduce yourself so other members can quickly understand who you are, what you do and how they might connect with you.",
    howToPost: [
      "Your name",
      "Your business or idea",
      "What you help people with",
      "What you are currently working on",
      "One thing you would like support, advice or connections with"
    ],
    suggestedPrompts: [
      "Who are you, what are you building, and what should members know first?",
      "What kind of people would be useful for you to meet inside BCN?",
      "What are you focused on improving in the business right now?"
    ],
    examplePost:
      "Hi, I am [name]. I run [business]. I help [type of people] with [what you do]. Right now I am working on [current focus]. I would be happy to connect with people who [useful connection/support].",
    pinnedCtaLabel: "Introduce yourself",
    tierContext:
      "This room is visible across the shared member layer so new members can be understood quickly.",
    emptyState: {
      title: "This room is ready for the first introduction",
      description:
        "Start with who you are, what you do, what you are building and one useful connection or support ask."
    }
  },
  "general-chat": {
    title: "Business Conversations",
    shortIntro: "A relaxed but useful room for everyday business conversation.",
    whatThisRoomIsFor:
      "Use this room for general business discussion, quick thoughts, useful questions and conversations that do not need a specialist room.",
    howToPost: [
      "A business thought you want opinions on",
      "Something you noticed in your market",
      "A small decision you are weighing up",
      "A useful lesson from the week",
      "A question other owners may relate to"
    ],
    suggestedPrompts: [
      "What decision are you weighing up this week?",
      "What have you noticed in your market that other owners may recognise?",
      "What small lesson from this week could help another member?"
    ],
    examplePost:
      "Quick one: I am trying to decide whether to focus more on [option A] or [option B]. Has anyone here tested either?",
    pinnedCtaLabel: "Start a conversation",
    tierContext: FOUNDATION_TIER_CONTEXT,
    emptyState: {
      title: "This room is ready for the first conversation",
      description:
        "Start with a quick question, a lesson from the week, or a business decision you are currently working through."
    }
  },
  "business-support": {
    title: "Help, Advice and Business Support",
    shortIntro: "Ask for input before you stay stuck too long.",
    whatThisRoomIsFor:
      "Use this room when you want honest feedback, ideas, advice or a second pair of eyes on something you are building.",
    howToPost: [
      "Website feedback",
      "Pricing questions",
      "Offer positioning",
      "Content ideas",
      "Business decisions",
      "Customer journey problems",
      "Growth or operations problems"
    ],
    suggestedPrompts: [
      "What are you trying to fix, and what have you already tried?",
      "Where would a second pair of eyes help you move faster?",
      "What decision feels heavier than it should right now?"
    ],
    examplePost:
      "I could use a second opinion on [topic]. The situation is [short context]. I am currently thinking [your idea], but I am not sure if I am missing something.",
    pinnedCtaLabel: "Ask for help",
    tierContext: FOUNDATION_TIER_CONTEXT,
    emptyState: {
      title: "This room is open for practical support",
      description:
        "Ask a clear question, share enough context, and let other owners help you see the next sensible move."
    }
  },
  "wins-and-progress": {
    title: "Wins and Movement",
    shortIntro: "Small progress counts here. Wins do not need to be huge.",
    whatThisRoomIsFor:
      "Use this room to share wins, progress, milestones and moments that show things are moving.",
    howToPost: [
      "First sale or new enquiry",
      "A website or offer improvement",
      "A useful meeting",
      "A habit you kept consistently",
      "Something you fixed that was holding you back",
      "A lesson that moved the business forward"
    ],
    suggestedPrompts: [
      "What moved forward this week, even if it was small?",
      "What did you fix, ship or learn that deserves to be noticed?",
      "What progress could give another member a useful lesson?"
    ],
    examplePost:
      "Small win today: I finally [thing you did]. It might not look massive from the outside, but it moves me forward because [why it matters].",
    pinnedCtaLabel: "Share a win",
    tierContext: FOUNDATION_TIER_CONTEXT,
    emptyState: {
      title: "This room is ready for the first win",
      description:
        "Share a small move, a useful lesson, or something that helped the business feel less stuck."
    }
  },
  collaboration: {
    title: "Connections, Offers and Collaboration",
    shortIntro: "A clear place for useful asks, offers and possible shared wins.",
    whatThisRoomIsFor:
      "Use this room for collaboration, referral partners, skill swaps, joint content, shared projects, clear offers and specific asks.",
    howToPost: [
      "An offer that explains who you help and how",
      "A specific ask for advice, introductions or suppliers",
      "A possible collaboration angle",
      "A referral partner you are looking for",
      "A shared project or joint content idea"
    ],
    suggestedPrompts: [
      "Who do you help, and who would be useful for you to meet?",
      "What are you currently looking for that another member might know?",
      "What audience do you serve, and who else serves them well?"
    ],
    examplePost:
      "Offer: I help [who] with [what] so they can [result].\n\nAsk: I am currently looking for [type of person, advice, intro, supplier, opportunity].",
    pinnedCtaLabel: "Post an offer or ask",
    tierContext:
      "This room keeps collaboration human and specific. No spam, no repeated hard-selling, and no vague pitches.",
    emptyState: {
      title: "This room is ready for the first useful connection",
      description:
        "Start with one clear offer, one clear ask, or one collaboration angle that would be easy for the right member to understand."
    }
  },
  marketing: {
    title: "Marketing and Visibility",
    shortIntro: "For the work that helps the right people understand the business faster.",
    whatThisRoomIsFor:
      "Use this room for positioning, messaging, visibility, content, demand, website clarity and how the business shows up in public.",
    howToPost: [
      "A positioning question",
      "A content idea you want feedback on",
      "Website or landing page messaging",
      "Visibility decisions",
      "Audience or offer clarity",
      "A marketing lesson from the week"
    ],
    suggestedPrompts: [
      "What part of your message is not landing clearly enough yet?",
      "What visibility move are you considering, and what are you unsure about?",
      "What did your market show you this week?"
    ],
    examplePost:
      "I am working on the way I explain [offer/business]. The current version is [short version]. Does this feel clear enough, or would you expect something different?",
    pinnedCtaLabel: "Ask for visibility feedback",
    tierContext: FOUNDATION_TIER_CONTEXT,
    emptyState: {
      title: "This room is ready for a visibility question",
      description:
        "Bring a message, page, content idea or audience question and ask for the kind of feedback that would help you improve it."
    }
  },
  "bcn-updates": {
    title: "BCN Updates and Founder Intelligence",
    shortIntro:
      "A curated signal room. Members add perspective underneath the updates rather than opening top-level posts.",
    whatThisRoomIsFor:
      "Use this space to read founder-relevant business signals, then comment when your perspective could help another owner think more clearly.",
    howToPost: [
      "Add a comment under the signal if you have relevant context",
      "Share how the update affects your business or sector",
      "Ask what other owners are noticing",
      "Connect the signal to a practical decision",
      "Keep replies useful rather than reactive"
    ],
    suggestedPrompts: [
      "How does this signal affect pricing, demand, delivery or trust?",
      "What should business owners watch next?",
      "What does this change in your own decision-making?"
    ],
    examplePost:
      "This matters for my business because [context]. I am watching [thing to watch] next, especially around [pricing, demand, trust, staffing or delivery].",
    pinnedCtaLabel: "Comment on a signal",
    pinnedCtaAction: {
      href: "/member/bcn-updates"
    },
    tierContext:
      "Top-level updates are curated centrally so the signal stays clean. Member discussion happens in the comments.",
    emptyState: {
      title: "No signals are visible here yet",
      description:
        "When the next curated update arrives, open the strongest signal and add perspective underneath if it helps the room."
    }
  },
  "inner-circle-chat": {
    title: "Inner Circle Discussion",
    shortIntro: "A deeper strategy room for more intentional business conversation.",
    whatThisRoomIsFor:
      "Use this room for deeper business conversation, sharper feedback, stronger accountability and more intentional connections.",
    howToPost: [
      "Strategic decisions",
      "Offer refinement",
      "Growth bottlenecks",
      "Collaboration opportunities",
      "Visibility and positioning questions",
      "What you are trying to improve this month"
    ],
    suggestedPrompts: [
      "What bottleneck needs a sharper outside perspective?",
      "What are you trying to improve this month, and what is in the way?",
      "What decision would become clearer with stronger context?"
    ],
    examplePost:
      "I am currently trying to solve [specific bottleneck]. The current situation is [context]. My next move might be [idea], but I would value a sharper outside perspective.",
    pinnedCtaLabel: "Start an Inner Circle discussion",
    tierContext:
      "Inner Circle exists for members who want more focus, stronger signal and deeper business conversation than the shared rooms can carry.",
    emptyState: {
      title: "This Inner Circle room is ready for the first deeper thread",
      description:
        "Bring a decision, bottleneck or refinement question that deserves a more focused owner conversation."
    }
  },
  "founder-strategy": {
    title: "Founder Strategy",
    shortIntro: "A focused room for trade-offs, decisions and owner-readiness.",
    whatThisRoomIsFor:
      "Use this room for strategy, positioning, growth architecture, founder decisions and the trade-offs that need sharper thinking.",
    howToPost: [
      "Strategic trade-offs",
      "Offer or market decisions",
      "Growth bottlenecks",
      "Owner-readiness questions",
      "What needs simplifying before the next stage",
      "Where you need a clearer outside view"
    ],
    suggestedPrompts: [
      "What strategic choice are you avoiding because it feels too close?",
      "What needs simplifying before the business can move faster?",
      "What part of the current plan needs a clearer operating decision?"
    ],
    examplePost:
      "I am weighing up [decision]. The constraint is [context]. The trade-off appears to be [trade-off], and I would value sharper thinking before I commit.",
    pinnedCtaLabel: "Start a strategy thread",
    tierContext:
      "This is an Inner Circle room for higher-intent discussion, not quick noise. Bring enough context for useful replies.",
    emptyState: {
      title: "This strategy room is ready for a clear decision thread",
      description:
        "Start with one strategic decision, one constraint, and the context members need to give useful perspective."
    }
  },
  "premium-discussions": {
    title: "Core Discussion",
    shortIntro: "The highest-trust room for bigger decisions and deeper founder-level thinking.",
    whatThisRoomIsFor:
      "Use this room for serious business conversations, bigger decisions, deeper collaboration and more direct founder-level thinking.",
    howToPost: [
      "Bigger strategic moves",
      "Hiring, scaling or systems questions",
      "Partnership discussions",
      "Premium offer decisions",
      "Growth architecture",
      "High-level accountability",
      "What needs solving before the next stage"
    ],
    suggestedPrompts: [
      "What constraint needs solving before the next stage?",
      "What higher-level decision would benefit from trusted outside context?",
      "Where would a more direct founder-level conversation help?"
    ],
    examplePost:
      "I am looking at the next stage of [business/offer/system]. The main constraint appears to be [constraint]. I would value input from anyone who has solved something similar.",
    pinnedCtaLabel: "Start a Core discussion",
    tierContext:
      "Core exists for the calmest, highest-signal layer of the community. Use it for conversations that need more trust, context and judgement.",
    emptyState: {
      title: "This Core room is ready for the first high-trust discussion",
      description:
        "Start with a bigger decision, a clear constraint, or a collaboration question that deserves the highest-signal room."
    }
  }
};

export function getCommunityRoomGuidance(
  slug: string | null | undefined
): CommunityRoomGuidance | null {
  if (!slug) {
    return null;
  }

  return COMMUNITY_ROOM_GUIDANCE[slug] ?? null;
}

export function listCommunityRoomGuidance() {
  return Object.entries(COMMUNITY_ROOM_GUIDANCE).map(([slug, guidance]) => ({
    slug,
    ...guidance
  }));
}
