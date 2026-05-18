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

type HistoricInsightPlan = {
  publishedAt: string;
  category: string;
  clusterSlug: string;
  minimumTier: ResourceTier;
  resourceType: ResourceType;
  title: string;
  idea: string;
  publicAngle: string;
  ownerMeaning: string;
  memberDepth: string;
  keywords: string[];
  internalLinks: PublicInsightInternalLink[];
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

function uniqueInternalLinks(links: PublicInsightInternalLink[]) {
  const seen = new Set<string>();

  return links.filter((link) => {
    if (seen.has(link.href)) {
      return false;
    }

    seen.add(link.href);
    return true;
  });
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

const HISTORIC_INSIGHT_PLANS: HistoricInsightPlan[] = [
  {
    publishedAt: "2026-04-10",
    category: "Business Networking",
    clusterSlug: "business-networking",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "Why business owner networking in the UK needs more context",
    idea:
      "Business owner networking works better when people understand the business behind the introduction, not only the name in front of them.",
    publicAngle:
      "The useful question is not how many owners are in the room. It is whether the room gives each owner enough context to recognise fit, timing and trust.",
    ownerMeaning:
      "If your current networking creates plenty of contact but little movement, the missing layer may be context rather than effort.",
    memberDepth:
      "a Foundation review of member profile context, room selection and the first useful conversation to start",
    keywords: ["business owner networking UK", "business owner network UK", "better networking"],
    internalLinks: [
      { label: "Explore the business owner network", href: "/business-owner-network-uk" },
      { label: "Review membership", href: "/membership" },
      { label: "Browse more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-11",
    category: "The Circle Philosophy",
    clusterSlug: "circle-philosophy",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    title: "What a founder community should protect before it grows",
    idea:
      "A founder community becomes more useful when it protects standards, context and the quality of conversation before it chases scale.",
    publicAngle:
      "Growth can make a room look more active while making it less useful. The standard has to be clear before more people arrive.",
    ownerMeaning:
      "Owners should look for communities that protect the room, not only communities that promise access.",
    memberDepth:
      "a clearer member standard, first-week path and founder-led room design note",
    keywords: ["founder community UK", "private founder community", "founder-led standards"],
    internalLinks: [
      { label: "Read the founder community page", href: "/founder-community-uk" },
      { label: "Read the founder story", href: "/founder" },
      { label: "Review membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-04-12",
    category: "The Circle Philosophy",
    clusterSlug: "circle-philosophy",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "A private business environment is different from another online group",
    idea:
      "A private business environment should change how owners think, connect and return, not simply give them another place to post.",
    publicAngle:
      "The difference shows up in structure. A feed asks people to keep appearing. An environment helps people make better use of the work already in front of them.",
    ownerMeaning:
      "If a platform only gives you more surface activity, it may not be the environment your business actually needs.",
    memberDepth:
      "a practical map of rooms, resources, profiles and return points inside the private environment",
    keywords: ["private business environment", "private business network", "business community"],
    internalLinks: [
      { label: "See the private business network", href: "/private-business-network" },
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  },
  {
    publishedAt: "2026-04-13",
    category: "Owner Reality",
    clusterSlug: "owner-reality",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "Business owner isolation is often a context problem",
    idea:
      "Many owners are not isolated because nobody is around them. They are isolated because too few people understand enough context to be genuinely useful.",
    publicAngle:
      "Advice becomes shallow when the room does not understand the stage, pressure, trade-off and commercial reality behind the question.",
    ownerMeaning:
      "If you keep explaining the same background before every serious conversation, you may need a better environment around the business.",
    memberDepth:
      "a member context review for turning owner pressure into clearer posts, better questions and more useful replies",
    keywords: ["business owner isolation", "small business support UK", "owner support"],
    internalLinks: [
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Read more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-14",
    category: "Decision Making",
    clusterSlug: "decision-making",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    title: "Founder decision-making improves when trade-offs are visible",
    idea:
      "A hard decision often stays hard because the founder is carrying the trade-off as a feeling instead of making it visible.",
    publicAngle:
      "Better decision-making starts by naming what each route costs, what it protects and what signal would prove the choice was working.",
    ownerMeaning:
      "When a decision is heavy, do not rush to choose. First make the real trade-off plain enough to review.",
    memberDepth:
      "an Inner Circle decision frame, trade-off prompts and a cleaner review rhythm for holding the choice",
    keywords: ["founder decision-making", "business decisions", "founder clarity"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Read the founder page", href: "/founder" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-04-15",
    category: "Trust and Visibility",
    clusterSlug: "trust-and-visibility",
    minimumTier: "INNER",
    resourceType: "CLARITY",
    title: "The trust signals buyers look for before they enquire",
    idea:
      "Buyers usually decide whether a business feels trustworthy before they ever make contact.",
    publicAngle:
      "Trust signals are not only testimonials. Clear positioning, proof, process, consistency and a low-friction next step all reduce hesitation.",
    ownerMeaning:
      "A website that looks professional can still leak demand if the buyer cannot see enough evidence to feel safe moving forward.",
    memberDepth:
      "a practical trust signal review for public pages, offers and enquiry routes",
    keywords: ["business trust signals", "website trust", "website conversion"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Read more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-16",
    category: "AI Search and Visibility",
    clusterSlug: "ai-search-and-visibility",
    minimumTier: "CORE",
    resourceType: "STRATEGY",
    title: "AI search visibility starts with clearer business pages",
    idea:
      "AI search systems can only understand and surface a business when the public information is specific, structured and easy to trust.",
    publicAngle:
      "The technical layer matters, but it cannot rescue vague pages. Clear answers, named audiences, proof and connected topics give AI systems better material to work with.",
    ownerMeaning:
      "If your public pages are hard for a buyer to understand, they will usually be hard for answer engines to understand as well.",
    memberDepth:
      "a Core-level AI visibility review across public answers, topic depth, internal links and trust evidence",
    keywords: ["AI search visibility", "GEO for businesses", "AEO for businesses"],
    internalLinks: [
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-17",
    category: "AI Search and Visibility",
    clusterSlug: "ai-search-and-visibility",
    minimumTier: "CORE",
    resourceType: "ACTION",
    title: "GEO and AEO for businesses is not only technical SEO",
    idea:
      "Generative and answer engine visibility depends on whether a business has clear public answers, credible structure and enough topical depth to be understood.",
    publicAngle:
      "Schema helps, but the substance still matters. A business needs pages that answer real questions with enough clarity to be cited, summarised and trusted.",
    ownerMeaning:
      "Do not start by chasing every new search acronym. Start by making the business easier to explain, verify and connect across topics.",
    memberDepth:
      "a Core implementation checklist for answer-led pages, cluster links, schema and public trust signals",
    keywords: ["GEO for businesses", "AEO for businesses", "AI search visibility"],
    internalLinks: [
      { label: "Explore membership", href: "/membership" },
      { label: "Read more insights", href: "/insights" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  },
  {
    publishedAt: "2026-04-18",
    category: "Strategic Visibility",
    clusterSlug: "strategic-visibility",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    title: "CRO for business websites begins before the button",
    idea:
      "Conversion improves before the call-to-action when the page has already helped the visitor decide whether the business fits.",
    publicAngle:
      "Buttons matter, but they only work well after the page has built relevance, trust and a clear reason to act.",
    ownerMeaning:
      "If visitors arrive and leave quietly, the issue may be decision support rather than button colour, layout preference or traffic quality.",
    memberDepth:
      "an Inner Circle conversion review for page sequence, trust proof, offer clarity and enquiry friction",
    keywords: ["CRO for business websites", "website trust and conversion", "business website conversion"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-19",
    category: "Local to National Growth",
    clusterSlug: "local-to-national-growth",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    title: "Local business growth needs stronger trust transfer",
    idea:
      "Local business growth often depends less on broad reach and more on whether trust can move from one relationship to the next.",
    publicAngle:
      "Referrals, search visibility, partnerships and community reputation all work better when the business is easy to understand and safe to recommend.",
    ownerMeaning:
      "A local business can grow faster when people know how to explain it, when to mention it and why it is credible.",
    memberDepth:
      "a local-to-national trust transfer map for relationships, proof, public pages and collaboration routes",
    keywords: ["local business growth", "business visibility", "business collaboration"],
    internalLinks: [
      { label: "Read about business networking in the UK", href: "/business-networking-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Read more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-20",
    category: "Better Conversations",
    clusterSlug: "better-conversations",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    title: "Better business conversations need enough context",
    idea:
      "A better business conversation starts when the room understands the background well enough to avoid surface advice.",
    publicAngle:
      "Context changes the quality of the reply. It turns a generic answer into a useful response that respects the owner, the stage and the real constraint.",
    ownerMeaning:
      "If every conversation begins with over-explaining, the issue may be the room rather than the question.",
    memberDepth:
      "a Foundation prompt set for asking better questions and giving members enough context to respond well",
    keywords: ["better business conversations", "founder community UK", "business owner support"],
    internalLinks: [
      { label: "Read the founder community page", href: "/founder-community-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-21",
    category: "Founder Clarity",
    clusterSlug: "founder-clarity",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    title: "Founder clarity reduces wasted work",
    idea:
      "When the founder is clearer, the business stops spending so much energy on work that was never the real priority.",
    publicAngle:
      "Clarity is not a motivational state. It is the operating signal that helps the week choose what matters and what can wait.",
    ownerMeaning:
      "If the business keeps spreading effort too widely, the first fix may be a clearer owner-level decision.",
    memberDepth:
      "a Foundation clarity review, priority filter and weekly question set for reducing wasted effort",
    keywords: ["founder clarity", "founder decision-making", "owner-led growth"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Read the founder page", href: "/founder" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-04-22",
    category: "Owner Reality",
    clusterSlug: "owner-reality",
    minimumTier: "FOUNDATION",
    resourceType: "ACTION",
    title: "Small business support in the UK should be structured, not noisy",
    idea:
      "Small business support becomes more useful when it gives owners a clear next step instead of more disconnected advice.",
    publicAngle:
      "Owners often have enough information. What they need is a better way to place the issue, test the next move and return to the work with less blur.",
    ownerMeaning:
      "If support leaves you with more tabs open but no clearer decision, it has not done enough.",
    memberDepth:
      "a practical support pathway from public insight to member resource, discussion prompt and next action",
    keywords: ["small business support UK", "business owner network UK", "business owner isolation"],
    internalLinks: [
      { label: "Explore the business owner network", href: "/business-owner-network-uk" },
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-04-23",
    category: "Business Networking",
    clusterSlug: "business-networking",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    title: "Business collaboration works when timing is visible",
    idea:
      "Collaboration becomes stronger when both businesses can see the right timing, context and reason to move together.",
    publicAngle:
      "A good collaboration is not only a positive relationship. It needs fit, capacity, clear expectations and enough trust to protect the work.",
    ownerMeaning:
      "If collaborations keep staying vague, the missing piece may be timing and scope rather than goodwill.",
    memberDepth:
      "an Inner Circle collaboration filter for fit, timing, contribution, risk and follow-through",
    keywords: ["business collaboration", "business networking UK", "business owner network UK"],
    internalLinks: [
      { label: "Read about business networking in the UK", href: "/business-networking-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-24",
    category: "Sustainable Growth",
    clusterSlug: "sustainable-growth",
    minimumTier: "FOUNDATION",
    resourceType: "STRATEGY",
    title: "Owner-led growth needs a calmer operating rhythm",
    idea:
      "Owner-led growth becomes easier to hold when the week has a rhythm for reviewing signal, pressure and the next decision.",
    publicAngle:
      "Momentum rarely comes from another burst of urgency. It comes from a repeatable way to notice what matters and act before the business scatters.",
    ownerMeaning:
      "If every week feels like a restart, the business may need rhythm before it needs another growth idea.",
    memberDepth:
      "a Foundation operating rhythm for weekly review, member prompts and one practical growth move",
    keywords: ["owner-led growth", "building business momentum", "founder clarity"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Read more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-25",
    category: "Founder Mindset",
    clusterSlug: "founder-mindset",
    minimumTier: "INNER",
    resourceType: "CLARITY",
    title: "Founder psychology changes how the business handles pressure",
    idea:
      "The way a founder interprets pressure shapes the decisions, pace and emotional load of the whole business.",
    publicAngle:
      "Pressure is not automatically a signal to do more. Sometimes it is a signal to slow the decision down and separate urgency from importance.",
    ownerMeaning:
      "A calmer interpretation can prevent the founder from turning a manageable issue into a noisy week.",
    memberDepth:
      "an Inner Circle pressure review for founder interpretation, decision quality and calmer action",
    keywords: ["founder psychology", "founder decision-making", "business owner pressure"],
    internalLinks: [
      { label: "Read the founder page", href: "/founder" },
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-04-26",
    category: "Trust and Visibility",
    clusterSlug: "trust-and-visibility",
    minimumTier: "INNER",
    resourceType: "ACTION",
    title: "Website trust and conversion need the same evidence",
    idea:
      "A website converts better when the same evidence that builds trust also helps the visitor decide what to do next.",
    publicAngle:
      "Proof should not sit as decoration. It should answer hesitation, support the offer and make the next step feel reasonable.",
    ownerMeaning:
      "If proof exists but enquiries are weak, the issue may be where that proof appears and which decision it supports.",
    memberDepth:
      "a practical website evidence review for trust, conversion, page sequence and enquiry confidence",
    keywords: ["website trust and conversion", "CRO for business websites", "business trust signals"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-27",
    category: "Strategic Visibility",
    clusterSlug: "strategic-visibility",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "Business visibility is weaker when the message is vague",
    idea:
      "Visibility only helps when the business is clear enough for the right person to understand why it matters.",
    publicAngle:
      "More reach can expose weak positioning faster. If the message is vague, attention arrives without enough reason to become trust.",
    ownerMeaning:
      "Before chasing more visibility, check whether the business is easy to describe, easy to trust and easy to act on.",
    memberDepth:
      "a Foundation visibility review across message clarity, proof and the next public page to improve",
    keywords: ["business visibility", "website trust and conversion", "business trust signals"],
    internalLinks: [
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Read more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-04-28",
    category: "The Circle Philosophy",
    clusterSlug: "circle-philosophy",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "The future of networking will be smaller and higher trust",
    idea:
      "The future of networking is less likely to be louder rooms and more likely to be smaller environments where trust and context compound.",
    publicAngle:
      "Owners are becoming more selective with attention. A better network has to justify the time it asks for by making conversations more useful.",
    ownerMeaning:
      "The right room should save interpretive effort, not add another place to perform.",
    memberDepth:
      "a member ecosystem note on standards, visibility, contribution and trust over time",
    keywords: ["future of networking", "business networking UK", "private business environment"],
    internalLinks: [
      { label: "See the private business network", href: "/private-business-network" },
      { label: "Read about business networking in the UK", href: "/business-networking-uk" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-04-29",
    category: "Better Conversations",
    clusterSlug: "better-conversations",
    minimumTier: "INNER",
    resourceType: "STRATEGY",
    title: "Private rooms help owners talk about real decisions",
    idea:
      "Owners are more likely to discuss real decisions when the room is private, standards-led and clear about what kind of conversation belongs there.",
    publicAngle:
      "Privacy changes the level of honesty available. It gives owners a better chance to bring nuance without turning the issue into public content.",
    ownerMeaning:
      "Some decisions need a protected room before they can be properly understood.",
    memberDepth:
      "an Inner Circle room-use guide for sensitive decisions, context and useful member replies",
    keywords: ["private business environment", "better business conversations", "founder community UK"],
    internalLinks: [
      { label: "Read the founder community page", href: "/founder-community-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  },
  {
    publishedAt: "2026-04-30",
    category: "Member Value",
    clusterSlug: "member-value",
    minimumTier: "FOUNDATION",
    resourceType: "ACTION",
    title: "How founders can use public insight before membership",
    idea:
      "A public insight should be useful enough to change how an owner thinks before asking them to step into the deeper member layer.",
    publicAngle:
      "The public layer should clarify the problem. Membership should then give the fuller framework, prompts and implementation path.",
    ownerMeaning:
      "If an insight helps you name the issue, the next step is deciding whether the deeper resource and room would help you act on it.",
    memberDepth:
      "a first-week member path for turning public insight into one resource, one prompt and one useful conversation",
    keywords: ["member value", "business insights", "private member resources"],
    internalLinks: [
      { label: "Browse insights", href: "/insights" },
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  },
  {
    publishedAt: "2026-05-01",
    category: "Business Networking",
    clusterSlug: "business-networking",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    title: "A business owner network works when standards are protected",
    idea:
      "A business owner network becomes more useful when standards protect the quality of contribution, not only the access to the room.",
    publicAngle:
      "The wrong standard creates noise quickly. The right standard makes it easier for members to contribute with clarity and trust.",
    ownerMeaning:
      "When the room has standards, good owners spend less time filtering and more time having useful conversations.",
    memberDepth:
      "a Foundation guide to member standards, profile context and the first useful contribution",
    keywords: ["business owner network UK", "business networking UK", "private business network"],
    internalLinks: [
      { label: "Explore the business owner network", href: "/business-owner-network-uk" },
      { label: "See the private business network", href: "/private-business-network" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-05-02",
    category: "AI Search and Visibility",
    clusterSlug: "ai-search-and-visibility",
    minimumTier: "CORE",
    resourceType: "STRATEGY",
    title: "AI answer engines need businesses that are easy to explain",
    idea:
      "Answer engines reward businesses that give clear, consistent information across public pages, topics and trusted signals.",
    publicAngle:
      "The business has to be easy to summarise without becoming simplistic. That means stronger structure, clearer pages and connected topical depth.",
    ownerMeaning:
      "If your business needs a long explanation every time, AI search may struggle with it for the same reason buyers do.",
    memberDepth:
      "a Core visibility map for business entity clarity, answer-led content and trust-building internal links",
    keywords: ["AI search visibility", "AEO for businesses", "business visibility"],
    internalLinks: [
      { label: "Browse insights", href: "/insights" },
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  },
  {
    publishedAt: "2026-05-03",
    category: "Founder Clarity",
    clusterSlug: "founder-clarity",
    minimumTier: "FOUNDATION",
    resourceType: "ACTION",
    title: "The Founder Audit helps owners choose the first move",
    idea:
      "A founder audit is useful when it helps the owner see the current pressure more clearly and choose a better starting point.",
    publicAngle:
      "The best first move is not always joining the deepest room. It is understanding the kind of support, conversation and structure the business needs now.",
    ownerMeaning:
      "Before making a membership decision, use a calmer checkpoint to see what kind of environment would actually help.",
    memberDepth:
      "a practical route from audit result to membership fit, first resource and first useful discussion",
    keywords: ["founder audit", "founder clarity", "small business support UK"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Read the founder page", href: "/founder" }
    ]
  },
  {
    publishedAt: "2026-05-04",
    category: "Business Growth",
    clusterSlug: "business-growth",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "Business momentum returns when the week has a signal",
    idea:
      "Momentum is easier to build when the owner knows which signal matters this week and what action should follow from it.",
    publicAngle:
      "Without a signal, the week fills with activity. With a signal, the business has a cleaner reason to choose, review and adjust.",
    ownerMeaning:
      "If your week feels active but unclear, start by naming the one signal that would show real movement.",
    memberDepth:
      "a Foundation weekly signal review and resource path for turning activity into calmer business momentum",
    keywords: ["building business momentum", "business growth", "owner-led growth"],
    internalLinks: [
      { label: "Browse insights", href: "/insights" },
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-05-05",
    category: "Strategic Visibility",
    clusterSlug: "strategic-visibility",
    minimumTier: "INNER",
    resourceType: "CLARITY",
    title: "Strategic visibility means being easier to understand",
    idea:
      "Strategic visibility is not only being seen more often. It is being understood more quickly by the people who matter.",
    publicAngle:
      "The business needs a clearer audience, problem, promise and proof before wider visibility can become useful demand.",
    ownerMeaning:
      "More attention will not help enough if the business still makes buyers work too hard to understand it.",
    memberDepth:
      "an Inner Circle visibility review for audience clarity, public proof and trust-led conversion paths",
    keywords: ["business visibility", "strategic visibility", "website trust and conversion"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-05-06",
    category: "Member Value",
    clusterSlug: "member-value",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "Why business owners return to a useful private environment",
    idea:
      "Owners return when the environment helps them re-enter the work with less friction and a clearer next move.",
    publicAngle:
      "Habit does not come from noise. It comes from a place that reliably gives the owner a useful signal, a relevant conversation or a practical resource.",
    ownerMeaning:
      "A private environment should earn repeat visits by making the next useful action easier to find.",
    memberDepth:
      "a member return path across dashboard signals, resources, discussions and profile visibility",
    keywords: ["private business environment", "member value", "business owner network UK"],
    internalLinks: [
      { label: "Explore membership", href: "/membership" },
      { label: "See the private business network", href: "/private-business-network" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-05-07",
    category: "The Circle Philosophy",
    clusterSlug: "circle-philosophy",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    title: "Founder-led does not mean founder-centred",
    idea:
      "A founder-led environment works best when the founder protects the standard rather than becoming the centre of the room.",
    publicAngle:
      "The role of the founder is to shape trust, clarity and usefulness so members can use the environment properly.",
    ownerMeaning:
      "A good private room should feel led with care, not dominated by one voice.",
    memberDepth:
      "a standards note on founder-led room design, member contribution and protected conversation quality",
    keywords: ["founder-led business environment", "founder community UK", "private business environment"],
    internalLinks: [
      { label: "Read the founder page", href: "/founder" },
      { label: "Read the founder community page", href: "/founder-community-uk" },
      { label: "Explore membership", href: "/membership" }
    ]
  },
  {
    publishedAt: "2026-05-08",
    category: "Trust and Visibility",
    clusterSlug: "trust-and-visibility",
    minimumTier: "INNER",
    resourceType: "OBSERVATION",
    title: "Website conversion falls when proof is hard to verify",
    idea:
      "Proof only helps conversion when the buyer can understand what happened, why it matters and whether it relates to their own decision.",
    publicAngle:
      "Vague proof can create the feeling of credibility without giving the visitor enough confidence to act.",
    ownerMeaning:
      "If proof is present but enquiries stay weak, make the evidence more specific, better placed and easier to connect to the offer.",
    memberDepth:
      "an Inner Circle proof review for outcomes, testimonials, process evidence and conversion support",
    keywords: ["website trust and conversion", "business trust signals", "CRO for business websites"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-05-09",
    category: "Local to National Growth",
    clusterSlug: "local-to-national-growth",
    minimumTier: "CORE",
    resourceType: "STRATEGY",
    title: "Local to national growth needs consistent public signals",
    idea:
      "A business moving beyond its local base needs public signals that can carry trust without relying only on personal familiarity.",
    publicAngle:
      "Local trust often travels through relationships. National visibility needs clearer pages, proof, positioning and repeatable language.",
    ownerMeaning:
      "If the business is ready for wider reach, make sure its public presence can carry trust for people who do not already know you.",
    memberDepth:
      "a Core public-signal map for local trust, national positioning, AI visibility and conversion support",
    keywords: ["local business growth", "business visibility", "owner-led growth"],
    internalLinks: [
      { label: "Read about business networking in the UK", href: "/business-networking-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  },
  {
    publishedAt: "2026-05-10",
    category: "Owner Reality",
    clusterSlug: "owner-reality",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "Owner isolation can hide inside busy weeks",
    idea:
      "A business owner can be surrounded by meetings, clients and messages while still lacking a place to think properly with context.",
    publicAngle:
      "Busyness can disguise isolation because contact is not the same as useful business support.",
    ownerMeaning:
      "If the week is full but the important decisions still feel solitary, the business may need a better room around it.",
    memberDepth:
      "a Foundation owner-reality review for pressure, context and the first conversation worth opening",
    keywords: ["business owner isolation", "small business support UK", "founder community UK"],
    internalLinks: [
      { label: "Read the founder community page", href: "/founder-community-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-05-11",
    category: "Decision Making",
    clusterSlug: "decision-making",
    minimumTier: "FOUNDATION",
    resourceType: "CLARITY",
    title: "Better questions improve business decisions before better answers arrive",
    idea:
      "The quality of a business decision often changes when the founder asks a sharper question before looking for advice.",
    publicAngle:
      "A better question narrows the issue, reveals the trade-off and stops the business from collecting answers to the wrong problem.",
    ownerMeaning:
      "Before asking for advice, make the question specific enough for the answer to become useful.",
    memberDepth:
      "a Foundation question set for framing decisions before posting inside the member rooms",
    keywords: ["founder decision-making", "better business conversations", "founder clarity"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Read more insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-05-12",
    category: "Trust and Visibility",
    clusterSlug: "trust-and-visibility",
    minimumTier: "CORE",
    resourceType: "STRATEGY",
    title: "Trust is a system, not a testimonial block",
    idea:
      "Trust is built across the whole public journey, not in one isolated proof section at the bottom of a page.",
    publicAngle:
      "Positioning, proof, page sequence, founder credibility, business details and clear next steps all work together to reduce hesitation.",
    ownerMeaning:
      "If trust is treated as decoration, the buyer still has to do too much work before acting.",
    memberDepth:
      "a Core trust-system review across website, offer, proof, AI visibility and conversion paths",
    keywords: ["business trust signals", "website trust and conversion", "CRO for business websites"],
    internalLinks: [
      { label: "Run the Founder Audit", href: "/audit" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-05-13",
    category: "AI Search and Visibility",
    clusterSlug: "ai-search-and-visibility",
    minimumTier: "INNER",
    resourceType: "ACTION",
    title: "GEO content should answer buyer questions cleanly",
    idea:
      "Generative engine optimisation works better when content answers real buyer questions with clarity, evidence and useful next steps.",
    publicAngle:
      "AEO and GEO content should not become thin question pages. It should help people and systems understand the business more accurately.",
    ownerMeaning:
      "If your content answers a search phrase but not the buyer's decision, it is not doing enough.",
    memberDepth:
      "an Inner Circle answer-page checklist for buyer questions, internal links, schema and conversion support",
    keywords: ["GEO for businesses", "AEO for businesses", "AI search visibility"],
    internalLinks: [
      { label: "Browse insights", href: "/insights" },
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  },
  {
    publishedAt: "2026-05-14",
    category: "Business Networking",
    clusterSlug: "business-networking",
    minimumTier: "INNER",
    resourceType: "CLARITY",
    title: "Collaboration needs boundaries as much as opportunity",
    idea:
      "Business collaboration works better when the opportunity is matched by clear boundaries, timing and expectations.",
    publicAngle:
      "Without boundaries, collaboration can become vague goodwill. With boundaries, it becomes easier to protect trust and make progress.",
    ownerMeaning:
      "Before saying yes to a collaboration, name the purpose, scope and review point clearly enough to keep the relationship healthy.",
    memberDepth:
      "an Inner Circle collaboration boundary guide for fit, scope, risk and follow-through",
    keywords: ["business collaboration", "better business conversations", "business owner network UK"],
    internalLinks: [
      { label: "Explore the business owner network", href: "/business-owner-network-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Browse insights", href: "/insights" }
    ]
  },
  {
    publishedAt: "2026-05-15",
    category: "The Circle Philosophy",
    clusterSlug: "circle-philosophy",
    minimumTier: "FOUNDATION",
    resourceType: "OBSERVATION",
    title: "A serious business community should feel calmer after the first visit",
    idea:
      "A serious business community should leave an owner with a clearer sense of fit, standards and next step, not more noise to process.",
    publicAngle:
      "The first visit matters because it tells the owner whether the environment respects their attention.",
    ownerMeaning:
      "If a community feels confusing before you join, it may not become calmer once you are inside.",
    memberDepth:
      "a Foundation orientation path for using the private environment without scattering attention",
    keywords: ["founder community UK", "private business environment", "small business support UK"],
    internalLinks: [
      { label: "Read the founder community page", href: "/founder-community-uk" },
      { label: "Explore membership", href: "/membership" },
      { label: "Run the Founder Audit", href: "/audit" }
    ]
  }
];

const historicInsights = HISTORIC_INSIGHT_PLANS.map((plan) => {
  const slug = slugify(plan.title);
  const lowerTitle = lowerFirst(plan.title);
  const tierLabel = tierDepthLabel(plan.minimumTier);

  return {
    slug,
    title: plan.title,
    excerpt: `${plan.idea} This public note gives the signal. The deeper member version turns it into prompts, review structure and a clearer next move.`,
    category: plan.category,
    clusterSlug: plan.clusterSlug,
    publishedAt: plan.publishedAt,
    readingTime: 5,
    seoTitle: `${plan.title} | BCN Insights`,
    seoDescription: `${plan.idea} Read a public BCN insight for UK business owners, with the deeper member resource kept inside The Business Circle Network.`,
    aeoSummary: `${plan.title} matters because ${plan.ownerMeaning} The useful starting point is to make the signal visible, reduce noise around it and choose one practical next step.`,
    publicIntro: [
      plan.idea,
      plan.publicAngle
    ],
    publicPreviewSections: [
      {
        heading: `What ${lowerTitle} means in practice`,
        body: [
          plan.ownerMeaning,
          "For an owner, the practical value is not another idea to collect. It is a clearer way to read what the business is asking for before the next decision is made."
        ]
      },
      {
        heading: "What to notice before you act",
        body: [
          "Notice where the issue repeats, where trust or context is weaker than it should be, and where the next step is harder to explain than it ought to be.",
          "That observation is enough for the public layer. The deeper member resource turns it into questions, implementation order and a more useful conversation inside the protected environment."
        ]
      }
    ],
    publicTakeaways: [
      "Name the business signal before adding another tactic.",
      "Look for the context, trust or decision point that keeps repeating.",
      "Use the public insight to clarify the issue, then take the fuller framework inside membership when the work matters."
    ],
    relatedIntentKeywords: plan.keywords,
    fadeCtaTitle: "Continue the full breakdown inside The Business Circle Network.",
    fadeCtaText: `Step inside for ${plan.memberDepth}. The public page gives the useful signal. The member resource gives the deeper action path.`,
    ctaLabel: "Explore Membership",
    ctaHref: "/membership",
    relatedInsightSlugs: [] as string[],
    internalLinks: uniqueInternalLinks([
      ...plan.internalLinks,
      ...defaultInternalLinks(plan.category),
      { label: "Browse the full insights hub", href: "/insights" }
    ]),
    memberResourceSlug: `insight-resource-${slug}`,
    minimumTier: plan.minimumTier,
    resourceType: plan.resourceType,
    memberDepthLabel: tierLabel
  } satisfies PublicInsight;
});

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

const allInsightDrafts = [...historicInsights, ...baseInsights];

export const PUBLIC_INSIGHTS: PublicInsight[] = allInsightDrafts.map((insight, index, all) => {
  const sameCategory = all.filter(
    (candidate) => candidate.category === insight.category && candidate.slug !== insight.slug
  );
  const related = [
    sameCategory[index % Math.max(1, sameCategory.length)]?.slug,
    all[index - 1]?.slug,
    all[index + 1]?.slug,
    all[(index + 19) % all.length]?.slug
  ].filter((slug): slug is string => Boolean(slug && slug !== insight.slug));
  const historicArticleLinks =
    insight.publishedAt < PUBLISHING_START_DATE
      ? [all[index - 1], all[index + 1]]
          .filter(
            (candidate): candidate is PublicInsight =>
              Boolean(candidate && candidate.publishedAt < PUBLISHING_START_DATE)
          )
          .map((candidate) => ({
            label: `Read next: ${candidate.title}`,
            href: `/insights/${candidate.slug}`
          }))
      : [];

  return {
    ...insight,
    relatedInsightSlugs: Array.from(new Set(related)).slice(0, 4),
    internalLinks: uniqueInternalLinks([...insight.internalLinks, ...historicArticleLinks])
  };
});

export const PUBLIC_INSIGHT_COUNT = PUBLIC_INSIGHTS.length;
