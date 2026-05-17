import type { ResourceTier, ResourceType } from "@prisma/client";

export type PublicInsightPreviewSection = {
  heading: string;
  body: string[];
};

export type PublicInsightInternalLink = {
  label: string;
  href: string;
};

export type PublicInsight = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  clusterSlug: string;
  publishedAt: string;
  readingTime: number;
  seoTitle: string;
  seoDescription: string;
  aeoSummary: string;
  publicIntro: string[];
  publicPreviewSections: PublicInsightPreviewSection[];
  publicTakeaways: string[];
  relatedIntentKeywords: string[];
  fadeCtaTitle: string;
  fadeCtaText: string;
  ctaLabel: string;
  ctaHref: string;
  relatedInsightSlugs: string[];
  internalLinks: PublicInsightInternalLink[];
  memberResourceSlug: string;
  minimumTier: ResourceTier;
  resourceType: ResourceType;
  memberDepthLabel: string;
};

type InsightTopic = {
  title: string;
  idea: string;
};

type InsightCategoryPlan = {
  category: string;
  clusterSlug: string;
  minimumTier: ResourceTier;
  resourceType: ResourceType;
  lens: string;
  memberDepth: string;
  keywords: string[];
  topics: InsightTopic[];
};

const PUBLISHING_START_DATE = "2026-05-16";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function addDaysIso(startDate: string, days: number) {
  const date = new Date(`${startDate}T12:00:00.000Z`);
  return new Date(date.getTime() + days * DAY_IN_MS).toISOString().slice(0, 10);
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function tierDepthLabel(tier: ResourceTier) {
  if (tier === "CORE") {
    return "Core depth inside membership";
  }

  if (tier === "INNER") {
    return "Inner Circle depth inside membership";
  }

  return "Foundation depth inside membership";
}

function defaultInternalLinks(category: string): PublicInsightInternalLink[] {
  const strategicCategories = new Set([
    "AI Search and Visibility",
    "Strategic Visibility",
    "Growth Architecture",
    "Local to National Growth"
  ]);
  const relationshipCategories = new Set([
    "Better Conversations",
    "Business Networking",
    "The Circle Philosophy",
    "Member Value"
  ]);

  if (strategicCategories.has(category)) {
    return [
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Read about business networking in the UK", href: "/business-networking-uk" }
    ];
  }

  if (relationshipCategories.has(category)) {
    return [
      { label: "Explore membership", href: "/membership" },
      { label: "See the private business network", href: "/private-business-network" },
      { label: "Read the founder community page", href: "/founder-community-uk" }
    ];
  }

  return [
    { label: "Explore membership", href: "/membership" },
    { label: "Run the Founder Audit", href: "/audit" },
    { label: "Read more insights", href: "/insights" }
  ];
}

const INSIGHT_CATEGORY_PLANS: InsightCategoryPlan[] = [
  {
    category: "Owner Reality",
    clusterSlug: "owner-reality",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    lens:
      "the real pressure on an owner is often quieter than the visible work around it",
    memberDepth:
      "a clearer owner reality review, practical pressure points and the first decision to clean up",
    keywords: ["owner reality", "business owner pressure", "founder reality"],
    topics: [
      {
        title: "Most owners are not short of effort, they are short of useful signal",
        idea: "Effort becomes easier to waste when the business has no clean way to read what is working."
      },
      {
        title: "A full calendar can hide a business that is not moving cleanly",
        idea: "Busyness feels reassuring until the week produces activity without a stronger commercial signal."
      },
      {
        title: "The owner usually feels the drag before the numbers explain it",
        idea: "There is often a period where the business feels heavier before the dashboard proves why."
      },
      {
        title: "A serious owner needs space to think before space to do more",
        idea: "More action is not always the mature response when the real issue is poor diagnosis."
      },
      {
        title: "The business gets noisier when every decision returns to the owner",
        idea: "Founder dependency can look like control, but it often creates drag through repeated interruption."
      },
      {
        title: "Growth pressure exposes what the owner has been carrying alone",
        idea: "When demand rises, hidden responsibilities become visible because the owner can no longer absorb them quietly."
      },
      {
        title: "The hardest business problems often start as tolerable friction",
        idea: "Small unresolved points of drag compound until they become part of how the business operates."
      },
      {
        title: "Owners need honest rooms, not constant reassurance",
        idea: "The most useful environment is not the one that praises every move, but the one that helps the owner see clearly."
      },
      {
        title: "A business can look successful and still feel hard to hold",
        idea: "External progress does not always mean the operating environment feels calm, clear or sustainable."
      },
      {
        title: "The owner cannot keep being the operating system",
        idea: "A business becomes fragile when too much context, judgement and follow-through still live in one person."
      }
    ]
  },
  {
    category: "Founder Clarity",
    clusterSlug: "founder-clarity",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    lens:
      "clearer founder thinking gives the whole business a steadier signal to follow",
    memberDepth:
      "a founder clarity framework, review prompts and a simple weekly rhythm for holding direction",
    keywords: ["founder clarity", "clearer business thinking", "founder decision clarity"],
    topics: [
      {
        title: "Founder clarity is not a mood, it is an operating advantage",
        idea: "When the founder can name what matters, the business stops treating everything as equally urgent."
      },
      {
        title: "A confused founder creates a confused week",
        idea: "Unclear thinking at the top usually shows up as scattered action across the business."
      },
      {
        title: "Clarity improves when the founder names the real trade-off",
        idea: "Many decisions stay heavy because the cost of each path has not been made visible enough."
      },
      {
        title: "The business needs a clearer yes before it needs more options",
        idea: "Too many possibilities can make movement feel intelligent while the actual direction keeps drifting."
      },
      {
        title: "A better question can change the whole week",
        idea: "The quality of the founder question often determines the quality of the decision that follows."
      },
      {
        title: "Founder clarity gets tested when demand increases",
        idea: "More opportunity makes weak priorities louder, so clarity has to hold under pressure."
      },
      {
        title: "A clearer founder makes the business easier to trust",
        idea: "People trust a business more quickly when its direction, promise and next step feel consistent."
      },
      {
        title: "Clarity is often a reduction exercise",
        idea: "The founder usually does not need a longer plan, but a cleaner view of what no longer deserves attention."
      },
      {
        title: "The founder's first job is to make the work easier to read",
        idea: "Teams, partners and buyers all move better when the business is easier to understand."
      },
      {
        title: "Strong founders protect the thinking before the sprint",
        idea: "The work moves better when the owner has taken enough time to frame it properly."
      }
    ]
  },
  {
    category: "Business Growth",
    clusterSlug: "business-growth",
    minimumTier: "FOUNDATION",
    resourceType: "STRATEGY",
    lens:
      "healthy growth comes from clearer sequence, better signal and less scattered effort",
    memberDepth:
      "a practical growth review, action sequence and member prompts for finding the next constraint",
    keywords: ["business growth", "business growth strategy", "growth constraints"],
    topics: [
      {
        title: "Growth slows when the business cannot see what is working",
        idea: "Momentum is harder to build when useful signal is buried under too many disconnected activities."
      },
      {
        title: "More leads will not fix a business that cannot convert trust",
        idea: "Demand only helps when the business is ready to turn attention into confidence and next steps."
      },
      {
        title: "Growth improves when the business stops restarting every month",
        idea: "Consistent progress often needs a stable rhythm more than a new initiative."
      },
      {
        title: "The next stage of growth usually needs a cleaner operating base",
        idea: "A business can outgrow the informal habits that helped it survive the early stage."
      },
      {
        title: "Commercial momentum needs fewer priorities than most owners expect",
        idea: "Too many priorities make the week look ambitious while weakening the work that should compound."
      },
      {
        title: "Growth is easier when the offer is easier to repeat",
        idea: "A business with a clearer offer can learn faster because each conversation produces cleaner feedback."
      },
      {
        title: "The business may need a constraint, not another opportunity",
        idea: "Saying yes to every possibility can stop the business from building strength in one direction."
      },
      {
        title: "Good growth has a review rhythm behind it",
        idea: "Owners make better growth decisions when they keep returning to the same few commercial signals."
      },
      {
        title: "A stronger growth plan begins with what the owner will stop doing",
        idea: "Removing low-value work often creates more growth room than adding another channel."
      },
      {
        title: "The business grows better when the next step is obvious",
        idea: "Clear next steps reduce hesitation for buyers, teams and the owner."
      }
    ]
  },
  {
    category: "Trust and Visibility",
    clusterSlug: "trust-and-visibility",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    lens:
      "trust is created by clear, consistent signals that make the business easier to understand",
    memberDepth:
      "a trust signal review, visibility checklist and practical fixes for stronger public confidence",
    keywords: ["trust and visibility", "business visibility", "trust signals"],
    topics: [
      {
        title: "Trust is becoming easier to measure and harder to fake",
        idea: "Buyers and search systems both reward businesses that show clear, consistent evidence."
      },
      {
        title: "Visibility only helps when people can understand what they are seeing",
        idea: "Being seen is not enough if the business is still difficult to explain, compare or trust."
      },
      {
        title: "Weak trust signals make good businesses work too hard",
        idea: "When the public evidence is thin, every enquiry has to rebuild confidence from the beginning."
      },
      {
        title: "A clear business is more visible before it spends more on reach",
        idea: "Search, referrals and buyers all respond better when the business is structured clearly."
      },
      {
        title: "Trust grows when the same promise appears in more than one place",
        idea: "Consistency across pages, profiles, conversations and proof makes the business easier to believe."
      },
      {
        title: "Visibility without standards can attract the wrong attention",
        idea: "More attention is not useful if the signal does not guide the right people closer."
      },
      {
        title: "A buyer needs context before they need persuasion",
        idea: "People decide faster when the business gives them enough context to recognise fit."
      },
      {
        title: "The strongest visibility starts with being easier to describe",
        idea: "If other people cannot repeat what you do clearly, opportunities become weaker than they should be."
      },
      {
        title: "Proof works best when it answers a real decision question",
        idea: "Evidence should reduce uncertainty, not decorate a page with vague confidence."
      },
      {
        title: "Your public presence should make the private conversation easier",
        idea: "Good visibility prepares the buyer or collaborator before a deeper conversation begins."
      }
    ]
  },
  {
    category: "Better Conversations",
    clusterSlug: "better-conversations",
    minimumTier: "FOUNDATION",
    resourceType: "ACTION",
    lens:
      "better conversations help owners test judgement, reduce noise and make more useful decisions",
    memberDepth:
      "conversation prompts, room guidance and practical ways to turn discussion into better next steps",
    keywords: ["better business conversations", "business owner conversations", "decision conversations"],
    topics: [
      {
        title: "Better business decisions usually come from better conversations",
        idea: "A useful conversation can reveal what the owner has been carrying alone."
      },
      {
        title: "Louder advice is not the same as better context",
        idea: "Advice only helps when the person giving it understands the real shape of the decision."
      },
      {
        title: "A good room helps the owner say the honest thing sooner",
        idea: "Owners often need a place where the real pressure can be named without performance."
      },
      {
        title: "The right question is more useful than another opinion",
        idea: "Questions create movement when opinions only add more noise around the decision."
      },
      {
        title: "Business conversations need enough context to matter",
        idea: "Surface-level networking struggles because people do not know enough to be genuinely useful."
      },
      {
        title: "The best conversations reduce the number of false choices",
        idea: "A serious discussion helps the owner see which options are real and which are distraction."
      },
      {
        title: "Useful rooms change the quality of follow-through",
        idea: "A good conversation should leave the owner with a cleaner next move, not just a better feeling."
      },
      {
        title: "Owners need conversations that can hold complexity calmly",
        idea: "Serious business decisions rarely fit inside shallow advice or quick motivational replies."
      },
      {
        title: "A calmer room makes hard subjects easier to discuss",
        idea: "The environment matters because some decisions need steadiness before they need speed."
      },
      {
        title: "The conversation before the decision is part of the decision",
        idea: "How the owner frames the issue with others often shapes the quality of the final choice."
      }
    ]
  },
  {
    category: "Decision Making",
    clusterSlug: "decision-making",
    minimumTier: "FOUNDATION",
    resourceType: "STRATEGY",
    lens:
      "decision quality improves when the owner reduces blur before choosing the next move",
    memberDepth:
      "decision frameworks, review points and practical prompts for choosing with more intent",
    keywords: ["business decision making", "founder decisions", "decision quality"],
    topics: [
      {
        title: "A hard decision gets easier when the real choice is named",
        idea: "Many decisions feel heavy because several different choices have been bundled together."
      },
      {
        title: "Slow decisions usually have a hidden cost",
        idea: "Delay can feel safe while the business quietly pays through drift, uncertainty and repeated discussion."
      },
      {
        title: "The owner does not need certainty before every decision",
        idea: "Useful decisions often need enough signal to move, not perfect proof."
      },
      {
        title: "Decision fatigue grows when the business has no rules of thumb",
        idea: "Repeated choices become heavier when the owner has to rebuild the logic every time."
      },
      {
        title: "Better decisions start with better framing",
        idea: "The quality of the answer depends on whether the question has been framed clearly enough."
      },
      {
        title: "Some decisions need a review point more than a debate",
        idea: "The business can move sooner when the owner knows when the choice will be checked again."
      },
      {
        title: "A founder should know which signal would change their mind",
        idea: "Decision-making improves when the owner can say what evidence matters before it arrives."
      },
      {
        title: "The wrong room can make a decision noisier",
        idea: "Too many low-context opinions can make the owner less clear than when they started."
      },
      {
        title: "Good judgement needs room to breathe",
        idea: "A business that fills every gap with urgency makes considered judgement harder to access."
      },
      {
        title: "Strong decisions become stronger when they are communicated simply",
        idea: "The business can follow a decision better when the reasoning is clean enough to repeat."
      }
    ]
  },
  {
    category: "Founder Mindset",
    clusterSlug: "founder-mindset",
    minimumTier: "FOUNDATION",
    resourceType: "MINDSET",
    lens:
      "the founder's mindset shapes how pressure is interpreted and how calmly the business moves",
    memberDepth:
      "reflection prompts, mindset checks and practical ways to keep pressure from distorting judgement",
    keywords: ["founder mindset", "owner mindset", "business pressure mindset"],
    topics: [
      {
        title: "Pressure should inform the founder, not run the business",
        idea: "Pressure is useful data until it starts making every decision feel urgent."
      },
      {
        title: "Confidence gets stronger when the founder reviews reality properly",
        idea: "Real confidence grows from better evidence, not from forcing a positive mood."
      },
      {
        title: "The founder needs standards for their own attention",
        idea: "Where the owner places attention becomes a quiet strategy for the business."
      },
      {
        title: "Impatience can make good strategy look too slow",
        idea: "Some strong moves need repetition before the signal becomes visible."
      },
      {
        title: "The owner has to separate discomfort from danger",
        idea: "Not every uncomfortable decision is a warning sign, and not every familiar path is safe."
      },
      {
        title: "Founders need ambition that can still think clearly",
        idea: "Ambition works better when it is disciplined enough to notice trade-offs."
      },
      {
        title: "A resilient founder does not pretend everything is fine",
        idea: "Resilience is often the ability to face what is true without losing the next useful move."
      },
      {
        title: "The founder's self-talk becomes part of the operating system",
        idea: "The way an owner narrates pressure affects pace, standards and the decisions they tolerate."
      },
      {
        title: "Calm is not passive when the stakes are high",
        idea: "Calm gives the founder a better chance of seeing the real move rather than the loudest one."
      },
      {
        title: "A serious founder learns to pause without drifting",
        idea: "The pause is useful when it creates clearer movement, not when it becomes avoidance."
      }
    ]
  },
  {
    category: "AI Search and Visibility",
    clusterSlug: "ai-search-and-visibility",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    lens:
      "AI search rewards businesses that are clear, structured and easy for people and systems to understand",
    memberDepth:
      "AI visibility guidance, entity clarity, structured content checks and practical GEO next steps",
    keywords: ["AI search visibility", "GEO for business", "AI search for business owners"],
    topics: [
      {
        title: "AI search will reward businesses that are clear and structured",
        idea: "Search systems need clean signals about who the business serves, what it does and why it can be trusted."
      },
      {
        title: "GEO starts with being easier to understand",
        idea: "Generative search visibility depends on clarity before it depends on clever optimisation."
      },
      {
        title: "A business needs entity clarity before it chases AI traffic",
        idea: "If the business identity is scattered, AI systems have less reliable context to work from."
      },
      {
        title: "AI search makes vague positioning more expensive",
        idea: "Unclear language becomes harder to surface when systems are looking for precise relevance."
      },
      {
        title: "Structured answers help both buyers and AI systems",
        idea: "Useful answer-first pages make it easier for humans and machines to understand the business."
      },
      {
        title: "AI visibility depends on trust signals that match the claim",
        idea: "Claims need supporting evidence across the site, profiles and public business context."
      },
      {
        title: "The business should be easy to summarise without losing meaning",
        idea: "If the business cannot be summarised cleanly, AI search may flatten it into something generic."
      },
      {
        title: "AI search does not remove the need for human trust",
        idea: "AI may surface the business, but people still decide based on confidence, fit and context."
      },
      {
        title: "AEO rewards direct answers that still sound human",
        idea: "Answer-first content works best when it is clear without becoming thin or robotic."
      },
      {
        title: "Visibility in AI search needs a stronger public knowledge layer",
        idea: "The business benefits from content that explains the thinking without exposing private member value."
      }
    ]
  },
  {
    category: "Business Networking",
    clusterSlug: "business-networking",
    minimumTier: "INNER",
    resourceType: "ACTION",
    lens:
      "useful networking depends on context, relevance and trust rather than random contact collection",
    memberDepth:
      "networking prompts, strategic relationship mapping and better ways to use the BCN environment",
    keywords: ["business networking", "business owner network", "private business network"],
    topics: [
      {
        title: "The best network is not the biggest one, it is the most useful one",
        idea: "A smaller room with stronger context can create better opportunities than a larger room with weak relevance."
      },
      {
        title: "Networking works better when people know when to mention you",
        idea: "Relevance improves when others understand the exact moment your business becomes useful."
      },
      {
        title: "A private business network should protect attention",
        idea: "The room becomes more valuable when it does not reward constant pitching."
      },
      {
        title: "Useful introductions need trust before speed",
        idea: "An introduction gets stronger when the person making it understands the business properly."
      },
      {
        title: "Context is what turns a contact into a relationship",
        idea: "Business relationships become useful when people have enough repeated evidence to act with confidence."
      },
      {
        title: "A good network gives owners somewhere to test thinking",
        idea: "Networking should not only produce contacts, it should improve the owner's judgement."
      },
      {
        title: "Business networking fails when the room is built around performance",
        idea: "Owners need an environment where useful conversation matters more than looking busy."
      },
      {
        title: "The right room makes quieter value easier to see",
        idea: "Not every strong operator is loud, so the environment has to make useful contribution visible."
      },
      {
        title: "Trust compounds when members see each other in motion",
        idea: "Repeated useful contribution creates confidence faster than a single polished introduction."
      },
      {
        title: "Strategic networking starts with knowing what you are building",
        idea: "The clearer the business direction, the easier it is to form relationships that fit."
      }
    ]
  },
  {
    category: "Platform Updates",
    clusterSlug: "platform-updates",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    lens:
      "platform progress should be explained honestly, without pretending the network is bigger than it is",
    memberDepth:
      "member context on what is being shaped, why it matters and how to use the new layer well",
    keywords: ["Business Circle updates", "platform updates", "member environment updates"],
    topics: [
      {
        title: "BCN is being built carefully, not loudly",
        idea: "The platform should earn trust through standards, usefulness and steady progress rather than noise."
      },
      {
        title: "A private environment needs stronger boundaries than a public feed",
        idea: "The value of the member space depends on what stays protected as much as what is visible."
      },
      {
        title: "The public site should explain the room without exposing the room",
        idea: "Visitors need enough context to decide fit while member content remains protected."
      },
      {
        title: "A soft launch should be honest about what is still being shaped",
        idea: "Early-stage platform building is more trustworthy when it is clear about progress and limits."
      },
      {
        title: "Member resources should feel practical, not decorative",
        idea: "The resource library is valuable when it helps owners make cleaner decisions after reading."
      },
      {
        title: "The public layer and private layer have different jobs",
        idea: "Public insight builds trust, while the member environment carries the deeper action."
      },
      {
        title: "A premium business room is built through small standards repeated often",
        idea: "Quality is shaped through expectations, boundaries and consistent care in the everyday experience."
      },
      {
        title: "Platform growth should not come at the cost of room quality",
        idea: "BCN needs to keep the environment useful before it tries to become louder."
      },
      {
        title: "The member journey should feel guided from the first week",
        idea: "A new member should understand where to start, what to read and how to contribute."
      },
      {
        title: "Public updates should create clarity, not noise",
        idea: "Updates matter when they explain how the platform is becoming more useful for serious owners."
      }
    ]
  },
  {
    category: "The Circle Philosophy",
    clusterSlug: "circle-philosophy",
    minimumTier: "FOUNDATION",
    resourceType: "MINDSET",
    lens:
      "the quality of the room shapes the quality of the thinking, conversations and opportunities inside it",
    memberDepth:
      "a deeper explanation of BCN standards, contribution and how members create value inside the room",
    keywords: ["Business Circle philosophy", "private business environment", "business owner room"],
    topics: [
      {
        title: "The room matters because the owner carries more than the task",
        idea: "Business owners need environments that understand pressure, judgement and context."
      },
      {
        title: "A calmer room can create sharper business thinking",
        idea: "Lower noise makes it easier for owners to notice what actually deserves attention."
      },
      {
        title: "The Circle is built around contribution before promotion",
        idea: "A better business environment works when members bring useful context rather than constant pitches."
      },
      {
        title: "Private does not mean closed, it means protected",
        idea: "The point of privacy is to protect standards, trust and useful conversation."
      },
      {
        title: "A serious room should make business feel less isolated",
        idea: "Owners can make better decisions when they are not carrying every question alone."
      },
      {
        title: "The value of a network is shaped by what it refuses to reward",
        idea: "The room becomes stronger when noise, hype and low-context selling are not treated as success."
      },
      {
        title: "Better rooms help owners become more useful to each other",
        idea: "The environment should make it easier for members to see where they can genuinely help."
      },
      {
        title: "A business circle should hold both thinking and movement",
        idea: "Useful community does not stop at discussion, it supports the next grounded action."
      },
      {
        title: "The right room should feel calm without feeling passive",
        idea: "Calm is valuable when it creates better judgement and steadier progress."
      },
      {
        title: "Standards make the room kinder, not colder",
        idea: "Clear expectations protect the people who came for serious, useful conversation."
      }
    ]
  },
  {
    category: "Local to National Growth",
    clusterSlug: "local-to-national-growth",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    lens:
      "local reputation can become wider visibility when the business turns trust into clearer public signals",
    memberDepth:
      "positioning guidance, visibility routes and a practical path from local trust to wider opportunity",
    keywords: ["local to national growth", "UK business growth", "business visibility UK"],
    topics: [
      {
        title: "Local trust can become national visibility when the signal is clearer",
        idea: "A business with strong local reputation still needs structure if it wants wider recognition."
      },
      {
        title: "A strong local business should not sound generic online",
        idea: "The qualities that make a business trusted locally need to be translated into public positioning."
      },
      {
        title: "Growing beyond local reach starts with a clearer category",
        idea: "Wider markets need to understand where the business fits before they can trust it."
      },
      {
        title: "Local proof needs to travel with the business",
        idea: "Reputation has to become visible evidence when the buyer does not already know the owner."
      },
      {
        title: "National growth needs more than a broader audience",
        idea: "The offer, proof and message must be strong enough for people with less context."
      },
      {
        title: "A business should widen reach without losing its standards",
        idea: "Scaling visibility should not flatten the qualities that made the business trusted in the first place."
      },
      {
        title: "Local authority becomes stronger when it is documented clearly",
        idea: "A business needs pages, profiles and insights that preserve the trust already earned."
      },
      {
        title: "The jump from local to national exposes vague positioning",
        idea: "People outside the local context need a sharper reason to understand and remember the business."
      },
      {
        title: "Regional strength can become strategic advantage",
        idea: "Local understanding can differentiate the business when it is framed as expertise, not limitation."
      },
      {
        title: "The business needs wider visibility before wider complexity",
        idea: "Growth beyond a local base works better when the public signal is clear before operations expand."
      }
    ]
  },
  {
    category: "Startup Pressure",
    clusterSlug: "startup-pressure",
    minimumTier: "FOUNDATION",
    resourceType: "MINDSET",
    lens:
      "early-stage pressure becomes easier to manage when the founder separates signal from panic",
    memberDepth:
      "startup pressure prompts, stabilising actions and simple routines for early business owners",
    keywords: ["startup pressure", "early founder pressure", "new business owner"],
    topics: [
      {
        title: "Early pressure makes every decision feel bigger than it is",
        idea: "New founders often need help separating important choices from the pressure of starting."
      },
      {
        title: "The first year needs fewer moving parts than founders expect",
        idea: "Too much complexity can make a young business harder to read before it has learned enough."
      },
      {
        title: "Startup confidence should come from evidence, not noise",
        idea: "The founder needs small signals that show what is working, not constant comparison."
      },
      {
        title: "A new business needs a clearer promise before a bigger plan",
        idea: "Early growth becomes easier when the offer is simple enough to test properly."
      },
      {
        title: "Founders should protect energy before the business gets heavier",
        idea: "Early habits become operating patterns, so the founder has to build carefully."
      },
      {
        title: "Startup pressure gets worse when every problem feels personal",
        idea: "A young business will have friction, but the founder needs to diagnose it without collapsing into it."
      },
      {
        title: "A calm first rhythm beats a frantic first sprint",
        idea: "Consistent review creates more learning than bursts of scattered effort."
      },
      {
        title: "The founder needs a place to test the idea out loud",
        idea: "Clearer conversations help early founders find the weak parts of a plan sooner."
      },
      {
        title: "Early traction should be understood before it is chased",
        idea: "When something starts working, the founder needs to know why before scaling it."
      },
      {
        title: "The business does not need to look bigger than it is",
        idea: "Trust grows when a young business is clear, honest and useful rather than inflated."
      }
    ]
  },
  {
    category: "Sustainable Growth",
    clusterSlug: "sustainable-growth",
    minimumTier: "FOUNDATION",
    resourceType: "STRATEGY",
    lens:
      "sustainable growth protects capacity, standards and decision quality as the business expands",
    memberDepth:
      "a sustainable growth checklist, capacity review and practical steps for growing without avoidable strain",
    keywords: ["sustainable growth", "business capacity", "growth without burnout"],
    topics: [
      {
        title: "Sustainable growth starts with capacity, not ambition",
        idea: "Ambition is important, but the business has to be able to hold the work it wins."
      },
      {
        title: "Growth becomes risky when the founder becomes the safety net",
        idea: "A business cannot keep scaling if every weak point depends on the owner to rescue it."
      },
      {
        title: "A sustainable business knows what it can say no to",
        idea: "Healthy growth needs boundaries around the work, clients and opportunities that do not fit."
      },
      {
        title: "The next growth move should not break delivery",
        idea: "More demand only helps when the business can serve it without damaging trust."
      },
      {
        title: "Sustainable growth needs a calmer review rhythm",
        idea: "Owners need regular space to notice pressure before it becomes operational damage."
      },
      {
        title: "The business should grow in a way the owner can still live with",
        idea: "Growth is not healthy if it quietly removes all room for judgement, recovery and life outside the work."
      },
      {
        title: "Standards are easier to protect before the rush arrives",
        idea: "The business should define what good looks like before volume makes every fix harder."
      },
      {
        title: "The healthiest growth often looks less dramatic from the outside",
        idea: "Steady compounding can be more valuable than visible bursts that leave the business weaker."
      },
      {
        title: "A business grows better when the owner stops absorbing every wobble",
        idea: "Sustainable scale needs systems, standards and people around the pressure."
      },
      {
        title: "Growth should create more room, not only more demand",
        idea: "The best growth improves the business's ability to think, serve and decide."
      }
    ]
  },
  {
    category: "Strategic Visibility",
    clusterSlug: "strategic-visibility",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    lens:
      "visibility becomes strategic when it supports positioning, trust and the right next conversation",
    memberDepth:
      "visibility systems, content structure and practical positioning moves for stronger public authority",
    keywords: ["strategic visibility", "business positioning", "visibility strategy"],
    topics: [
      {
        title: "Strategic visibility is not being everywhere",
        idea: "A business becomes more visible when it shows up in the right places with a clear reason."
      },
      {
        title: "The market should understand the business before it remembers the brand",
        idea: "Recognition is more useful when people can also explain the value."
      },
      {
        title: "Visibility should make the next conversation warmer",
        idea: "Public content works when it gives people enough confidence to take a serious next step."
      },
      {
        title: "Strong visibility gives people language for your value",
        idea: "A useful public signal helps others repeat what the business does and why it matters."
      },
      {
        title: "The business needs a visibility system, not visibility bursts",
        idea: "Sporadic attention is harder to trust than a consistent signal built over time."
      },
      {
        title: "Positioning should decide what visibility is for",
        idea: "Without positioning, visibility can become activity with no clear commercial direction."
      },
      {
        title: "A public insight can build trust without giving the full method away",
        idea: "The public layer should prove thinking quality while keeping deeper implementation inside membership."
      },
      {
        title: "Visibility becomes stronger when it is easier to verify",
        idea: "People trust businesses faster when claims, proof and structure point in the same direction."
      },
      {
        title: "The right visibility attracts better conversations",
        idea: "Clear public positioning helps serious people arrive with better context."
      },
      {
        title: "A quieter visibility strategy can still be commercially strong",
        idea: "Strategic signal does not need to be loud if it is clear, repeated and trusted."
      }
    ]
  },
  {
    category: "Business Clarity",
    clusterSlug: "business-clarity",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    lens:
      "business clarity makes the offer, operations and next decision easier to understand",
    memberDepth:
      "clarity exercises, business review questions and practical steps for reducing confusion",
    keywords: ["business clarity", "clear business offer", "business direction"],
    topics: [
      {
        title: "A clear business is easier to buy from and easier to run",
        idea: "Clarity supports both the external buyer and the internal operating rhythm."
      },
      {
        title: "Confusion costs more when the business is growing",
        idea: "Small points of blur become larger problems when more people, clients and decisions are involved."
      },
      {
        title: "The offer should be simple enough for someone else to repeat",
        idea: "If others cannot explain what you do, referrals and trust become weaker."
      },
      {
        title: "Business clarity starts with deciding what the work is really for",
        idea: "The owner needs a clean answer to what the business changes for the people it serves."
      },
      {
        title: "A messy business usually has unclear decisions underneath it",
        idea: "Mess often appears in operations after it has already appeared in priorities."
      },
      {
        title: "Clear businesses can still be sophisticated",
        idea: "Clarity does not mean dumbing down, it means making the value easier to grasp."
      },
      {
        title: "The next step should not need explaining twice",
        idea: "A business feels more trustworthy when the route forward is clear."
      },
      {
        title: "Clarity makes standards easier to protect",
        idea: "People can uphold standards more reliably when the expectations are specific."
      },
      {
        title: "The business should know what it is not trying to be",
        idea: "Clear boundaries help protect the offer from becoming broad, vague and hard to sell."
      },
      {
        title: "A clearer business creates calmer growth conversations",
        idea: "When the basics are easier to understand, strategic conversations can go deeper."
      }
    ]
  },
  {
    category: "Member Value",
    clusterSlug: "member-value",
    minimumTier: "FOUNDATION",
    resourceType: "ACTION",
    lens:
      "membership should create practical value through better context, resources and protected conversations",
    memberDepth:
      "guidance on using resources, rooms and conversations to turn membership into useful business movement",
    keywords: ["member value", "business membership value", "private member resources"],
    topics: [
      {
        title: "Membership should give owners a better place to think",
        idea: "The value is not only access, it is the quality of the environment around decisions."
      },
      {
        title: "A member resource should lead to a clearer next move",
        idea: "Reading should create practical movement, not sit as another piece of unused content."
      },
      {
        title: "The private layer should feel more useful than the public preview",
        idea: "Public insight creates trust, while membership gives the fuller breakdown and action path."
      },
      {
        title: "The first member week should reduce uncertainty",
        idea: "New members need a clear route into profile, resources, rooms and the right first conversation."
      },
      {
        title: "Member value grows when the owner brings real context",
        idea: "The environment becomes more useful when the owner shares enough signal for others to understand the work."
      },
      {
        title: "A private resource library should be practical before it is large",
        idea: "Depth matters more than volume when owners are looking for better decisions."
      },
      {
        title: "The right tier should match the owner's next level of pressure",
        idea: "Membership is more useful when the room fits the stage and seriousness of the decision."
      },
      {
        title: "Member-only does not mean hidden for the sake of it",
        idea: "The full resource belongs inside because deeper context, prompts and implementation need a protected environment."
      },
      {
        title: "A good member experience helps owners return to what matters",
        idea: "The best private environments make useful next steps easier to find again."
      },
      {
        title: "Membership should make serious business feel less solitary",
        idea: "Value grows when owners have clearer resources and better conversations around the work."
      }
    ]
  },
  {
    category: "Growth Architecture",
    clusterSlug: "growth-architecture",
    minimumTier: "CORE",
    resourceType: "STRATEGY",
    lens:
      "advanced growth needs connected architecture across positioning, systems, visibility and decision flow",
    memberDepth:
      "Core-level architecture, implementation roadmaps, advanced prompts and deeper growth system design",
    keywords: ["growth architecture", "advanced business strategy", "business architecture"],
    topics: [
      {
        title: "Growth architecture connects the work that usually gets treated separately",
        idea: "Positioning, operations, visibility and decision-making need to support each other."
      },
      {
        title: "Advanced strategy starts by seeing the system around the constraint",
        idea: "The real bottleneck is often connected to several parts of the business, not one isolated issue."
      },
      {
        title: "A premium growth framework should reduce complexity, not decorate it",
        idea: "The strongest frameworks help an owner choose cleaner action from a more complex view."
      },
      {
        title: "High-level positioning needs operational support behind it",
        idea: "A stronger market position has to be matched by delivery, proof and capacity."
      },
      {
        title: "Core-level visibility should connect search, trust and conversion",
        idea: "Advanced visibility is not only ranking, it is building a public knowledge layer that supports decisions."
      },
      {
        title: "The growth roadmap should protect the owner's best judgement",
        idea: "A serious roadmap creates space for strategic decisions instead of filling every week with activity."
      },
      {
        title: "Advanced AI visibility needs stronger business structure first",
        idea: "GEO and AI search work better when the business is already clear, evidenced and easy to map."
      },
      {
        title: "A business architecture review should expose hidden dependencies",
        idea: "The owner needs to see where growth still depends on informal workarounds."
      },
      {
        title: "The best growth systems create cleaner decisions at higher speed",
        idea: "Systems should improve judgement and pace without making the business heavy."
      },
      {
        title: "Core strategy is about sequence as much as ambition",
        idea: "The order of moves often decides whether advanced growth becomes leverage or strain."
      }
    ]
  },
  {
    category: "Calm Business Thinking",
    clusterSlug: "calm-business-thinking",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    lens:
      "calm thinking helps owners see the real issue before adding more activity",
    memberDepth:
      "calm review prompts, practical reflection questions and simple next actions for clearer movement",
    keywords: ["calm business thinking", "clear business decisions", "business owner clarity"],
    topics: [
      {
        title: "Calm thinking is a commercial asset",
        idea: "A calmer owner can notice the real signal before reacting to the loudest issue."
      },
      {
        title: "The business improves when the owner stops confusing urgency with importance",
        idea: "Urgency can distort priorities when the business has no calmer review rhythm."
      },
      {
        title: "A quiet hour can save a noisy month",
        idea: "Protected thinking time can prevent scattered decisions that create avoidable work later."
      },
      {
        title: "The clearest next move is often smaller than the owner expects",
        idea: "A focused action can be more valuable than a dramatic shift."
      },
      {
        title: "Business calm comes from structure, not wishful thinking",
        idea: "The owner feels steadier when priorities, signals and next steps are easier to see."
      },
      {
        title: "A noisy business needs a calmer way to read itself",
        idea: "The problem is often not the amount of work, but the lack of a clean interpretation layer."
      },
      {
        title: "Good thinking reduces the need for rescue work",
        idea: "Better framing earlier in the week can stop avoidable problems later in the week."
      },
      {
        title: "The owner should not need a crisis to review the business properly",
        idea: "Regular calm review keeps important issues visible before they become urgent."
      },
      {
        title: "A calmer business can still move quickly",
        idea: "Speed becomes more useful when it is guided by a clearer view of what matters."
      },
      {
        title: "The room around the owner affects the rhythm inside the business",
        idea: "A steadier environment can help the owner return to better judgement more often."
      }
    ]
  }
];

const baseInsights = INSIGHT_CATEGORY_PLANS.flatMap((plan) =>
  plan.topics.map((topic, topicIndex) => ({
    plan,
    topic,
    topicIndex
  }))
).map(({ plan, topic, topicIndex }, index) => {
  const slug = slugify(topic.title);
  const publishedAt = addDaysIso(PUBLISHING_START_DATE, index);
  const lowerTitle = lowerFirst(topic.title);
  const tierLabel = tierDepthLabel(plan.minimumTier);

  return {
    slug,
    title: topic.title,
    excerpt: `${topic.idea} This public note gives the signal. The full member version turns it into the breakdown, questions and next action.`,
    category: plan.category,
    clusterSlug: plan.clusterSlug,
    publishedAt,
    readingTime: 3 + (topicIndex % 3),
    seoTitle: `${topic.title} | BCN Insights`,
    seoDescription: `${topic.idea} Read a public BCN insight for serious business owners, with the deeper member resource kept inside The Business Circle Network.`,
    aeoSummary: `${topic.title} matters because ${plan.lens}. The practical starting point is to notice the signal, reduce the noise around it and choose one cleaner next step.`,
    publicIntro: [
      topic.idea,
      `For a business owner, this is not abstract. It usually shows up in the quality of the week, the quality of the conversations and the confidence behind the next decision.`
    ],
    publicPreviewSections: [
      {
        heading: `What ${lowerTitle} is really pointing to`,
        body: [
          `When ${lowerTitle}, the issue is rarely only the surface event. It is usually a sign that the business needs a clearer way to read pressure, trust, timing or priority.`,
          `The public lesson is simple enough to use now. Before adding more activity, look at what the current pattern is telling you about the business environment around the decision.`
        ]
      },
      {
        heading: "What to notice before you act",
        body: [
          `Notice where the same question keeps returning, where the owner is carrying too much context and where the next step is less clear than it should be.`,
          `That observation will not solve the whole issue, but it can stop the business from mistaking motion for progress. The deeper work belongs inside the protected member resource.`
        ]
      }
    ],
    publicTakeaways: [
      `Name the signal behind the pressure before deciding what to do next.`,
      `Look for the repeated pattern, not only the latest visible symptom.`,
      `Use the public insight as a starting point, then take the fuller framework inside membership when the issue matters.`
    ],
    relatedIntentKeywords: plan.keywords,
    fadeCtaTitle: "Unlock the full insight inside The Business Circle Network.",
    fadeCtaText: `Step inside for ${plan.memberDepth}. The public version gives the thinking. The member resource gives the fuller action path.`,
    ctaLabel: "Explore Membership",
    ctaHref: "/membership",
    relatedInsightSlugs: [] as string[],
    internalLinks: defaultInternalLinks(plan.category),
    memberResourceSlug: `insight-resource-${slug}`,
    minimumTier: plan.minimumTier,
    resourceType: plan.resourceType,
    memberDepthLabel: tierLabel
  } satisfies PublicInsight;
});

export const PUBLIC_INSIGHTS: PublicInsight[] = baseInsights.map((insight, index, all) => {
  const sameCategory = all.filter(
    (candidate) => candidate.category === insight.category && candidate.slug !== insight.slug
  );
  const related = [
    sameCategory[index % Math.max(1, sameCategory.length)]?.slug,
    all[index - 1]?.slug,
    all[index + 1]?.slug,
    all[(index + 19) % all.length]?.slug
  ].filter((slug): slug is string => Boolean(slug && slug !== insight.slug));

  return {
    ...insight,
    relatedInsightSlugs: Array.from(new Set(related)).slice(0, 4)
  };
});

export const PUBLIC_INSIGHT_COUNT = PUBLIC_INSIGHTS.length;
