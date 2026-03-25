import type { InsightTopicCluster } from "@/types/insights";

export type InsightTopicPillarSection = {
  title: string;
  description: string;
  paragraphs: string[];
  supportingArticleSlugs: string[];
};

export type InsightTopicPillar = {
  headline: string;
  introduction: string[];
  sections: InsightTopicPillarSection[];
  ctaTitle: string;
  ctaDescription: string;
};

type InsightTopicClusterSlug = InsightTopicCluster["slug"];

export const INSIGHT_TOPIC_PILLARS: Record<InsightTopicClusterSlug, InsightTopicPillar> = {
  "business-growth-strategy": {
    headline: "Business growth strategy for owners who need clearer momentum",
    introduction: [
      "Growth strategy only becomes useful when it helps an owner see what is actually creating movement. Many businesses call something strategy when it is really just a large list of activities, channels, and hopes competing for attention.",
      "A better growth strategy makes the business easier to read. It clarifies what matters now, what signal should be tracked, and what part of the business needs tightening before more effort gets added on top."
    ],
    sections: [
      {
        title: "Why growth strategy often feels vague in practice",
        description: "The issue is rarely ambition. It is usually lack of signal.",
        paragraphs: [
          "When the business is not producing clear commercial signal, owners keep broadening the plan in search of certainty. More channels, more offers, and more initiatives create activity but also more blur.",
          "That is why many growth strategies feel intelligent on paper and confusing in the week. The business still cannot see what is actually moving and what is only creating motion."
        ],
        supportingArticleSlugs: [
          "why-your-business-is-not-growing-even-though-you-are-working-hard",
          "what-to-track-in-a-small-business-each-week"
        ]
      },
      {
        title: "What a useful growth strategy usually includes",
        description: "Clear strategy reduces spread and improves review quality.",
        paragraphs: [
          "A useful strategy names the current growth constraint, the smaller set of numbers that reveal truth, and the route by which attention should turn into commercial movement.",
          "That makes growth easier to review because the business is no longer trying to interpret twenty disconnected signals. It knows what should be working and what deserves scrutiny if momentum stays weak."
        ],
        supportingArticleSlugs: [
          "what-to-track-in-a-small-business-each-week",
          "how-to-create-a-weekly-operating-rhythm-for-a-small-business"
        ]
      },
      {
        title: "How strategy becomes momentum inside the week",
        description: "The week is where growth strategy proves itself.",
        paragraphs: [
          "A growth strategy only becomes real when it shapes the operating rhythm. What gets reviewed, what gets protected, and what the next decision is supposed to come from all matter more than a large plan no one can hold.",
          "That is why small weekly structure often creates more growth than another burst of disconnected activity. Better rhythm helps better strategy hold."
        ],
        supportingArticleSlugs: [
          "how-to-create-a-weekly-operating-rhythm-for-a-small-business",
          "why-your-business-is-not-growing-even-though-you-are-working-hard"
        ]
      }
    ],
    ctaTitle: "Clarity in public. Review structure inside membership.",
    ctaDescription:
      "The public layer helps owners understand growth pressure more clearly. Membership adds the frameworks, scorecards, and review sequence that turn that understanding into steadier momentum."
  },
  "why-businesses-feel-stuck": {
    headline: "Why businesses feel stuck and how owners find the real bottleneck",
    introduction: [
      "A business can look active and still feel stuck. That contradiction usually means demand, effort, or movement is being interrupted by a constraint the owner has not named cleanly enough yet.",
      "The aim of this topic is to help owners read that feeling properly. A stuck business often needs diagnosis before it needs another tactic."
    ],
    sections: [
      {
        title: "Why a business can feel stuck without looking dead",
        description: "Activity can disguise the real problem.",
        paragraphs: [
          "Many stuck businesses still have enquiries, projects, meetings, and movement. That makes the constraint harder to identify because there are enough signs of life to create false reassurance.",
          "The question is not whether the business is active. It is whether activity is turning into momentum cleanly enough to trust."
        ],
        supportingArticleSlugs: [
          "why-a-business-can-feel-stuck-even-when-there-is-demand",
          "why-your-business-is-not-growing-even-though-you-are-working-hard"
        ]
      },
      {
        title: "How owners usually misread the bottleneck",
        description: "Symptoms often arrive before causes become obvious.",
        paragraphs: [
          "The loudest frustration in a business is not always the limiting factor. Owners often react to what is nearest, most visible, or most emotionally costly, which can leave the real constraint untouched.",
          "A cleaner bottleneck review creates leverage because it narrows the focus. Instead of trying to improve everything, the business can test one more precise change."
        ],
        supportingArticleSlugs: [
          "how-to-find-the-real-bottleneck-in-a-business",
          "how-to-fix-a-business-that-feels-messy"
        ]
      },
      {
        title: "What movement usually looks like after the bottleneck is named",
        description: "Better diagnosis makes the next move smaller and stronger.",
        paragraphs: [
          "Once the real constraint is clearer, businesses often stop trying to solve five problems at once. They tighten one route, one handoff, or one weekly review pattern and start getting cleaner feedback almost immediately.",
          "That is why precision matters here. A named bottleneck gives the business a calmer place to work from."
        ],
        supportingArticleSlugs: [
          "why-a-business-can-feel-stuck-even-when-there-is-demand",
          "how-to-find-the-real-bottleneck-in-a-business"
        ]
      }
    ],
    ctaTitle: "Use the public insight to diagnose the pressure.",
    ctaDescription:
      "Inside membership, this topic turns into a practical bottleneck review with member prompts, decision order, and the deeper structure that helps momentum return without panic."
  },
  "business-structure": {
    headline: "How to structure a business so it feels clearer, lighter, and easier to run",
    introduction: [
      "Business structure matters long before a company is large. In smaller businesses, structure is what makes work easier to see, easier to trust, and less dependent on rescue from the founder.",
      "A well-structured business is not a heavy business. It is a business with clearer priorities, clearer ownership, and a calmer weekly rhythm."
    ],
    sections: [
      {
        title: "Why structure usually breaks before owners call it a structure problem",
        description: "Mess appears first. The cause sits underneath.",
        paragraphs: [
          "Owners usually feel structure problems as noise: repeated questions, uneven delivery, unclear handoffs, and too many decisions still living in memory.",
          "Those symptoms matter because they reveal where the business is relying on improvisation when it should be relying on clearer operating design."
        ],
        supportingArticleSlugs: [
          "how-to-fix-a-business-that-feels-messy",
          "how-to-create-a-simple-business-operating-structure"
        ]
      },
      {
        title: "What simple structure makes visible",
        description: "Clarity improves when the important work is easier to read.",
        paragraphs: [
          "A simple structure helps the business see the current priority, who owns what, and how the week is being reviewed. That alone removes a surprising amount of hidden drag.",
          "The goal is not to formalise everything. It is to make the work less dependent on memory, rescue, and constant reinterpretation."
        ],
        supportingArticleSlugs: [
          "how-to-create-a-simple-business-operating-structure",
          "how-to-create-a-weekly-operating-rhythm-for-a-small-business"
        ]
      },
      {
        title: "Why better structure usually feels calmer, not heavier",
        description: "Strong structure should reduce ambiguity, not add theatre.",
        paragraphs: [
          "When structure is working, owners tend to feel lighter rather than more managed. The business becomes easier to review, easier to direct, and easier to trust under pressure.",
          "That is why structure is often a simplification exercise before it is anything else. Businesses rarely need more weight first. They usually need less ambiguity."
        ],
        supportingArticleSlugs: [
          "how-to-fix-a-business-that-feels-messy",
          "how-to-create-a-simple-business-operating-structure"
        ]
      }
    ],
    ctaTitle: "Public structure insight first. Member execution next.",
    ctaDescription:
      "Membership takes these structural ideas deeper into operating routines, review points, and the practical changes that make the business easier to run week after week."
  },
  "visibility-and-trust": {
    headline: "How visibility and trust turn attention into real business conversations",
    introduction: [
      "Visibility on its own does not create momentum. Trust is what helps a buyer move from noticing a business to feeling safe enough to act on it.",
      "This topic cluster looks at the public-facing layer of that problem: positioning, conversion, and the decision signals that make a business easier to understand and easier to choose."
    ],
    sections: [
      {
        title: "Why visibility without trust still leaks demand",
        description: "Attention is only useful when it can turn into confidence.",
        paragraphs: [
          "A business can attract visitors, enquiries, or interest and still convert weakly if the buyer cannot understand what makes the offer right for them.",
          "That is why trust signals matter so much. The market is not only asking whether the business exists. It is asking whether this is the right move now."
        ],
        supportingArticleSlugs: [
          "why-your-website-is-not-converting-visitors-into-enquiries",
          "how-business-ecosystems-create-trust-and-referrals"
        ]
      },
      {
        title: "How positioning sharpens trust before a conversation begins",
        description: "Clearer positioning changes what the buyer feels immediately.",
        paragraphs: [
          "Positioning is not a branding exercise in the abstract. It is the process of making the right buyer feel why this business matters in one cleaner pass.",
          "When that difference is easier to feel, conversion improves because the buyer is no longer comparing a broadly competent option with several similar alternatives."
        ],
        supportingArticleSlugs: [
          "how-to-position-your-offer-when-competitors-all-sound-the-same",
          "why-your-website-is-not-converting-visitors-into-enquiries"
        ]
      },
      {
        title: "What better trust signals usually look like on the page",
        description: "Trust is built through sequence, proof, and decision support.",
        paragraphs: [
          "Stronger trust often means clearer next steps, better evidence, and fewer moments where the page asks the buyer to do interpretive work on behalf of the business.",
          "A good page reduces hesitation by answering the real decision questions quickly. It helps the visitor see fit, result, and next move without friction."
        ],
        supportingArticleSlugs: [
          "why-your-website-is-not-converting-visitors-into-enquiries",
          "how-to-position-your-offer-when-competitors-all-sound-the-same"
        ]
      }
    ],
    ctaTitle: "Use the public layer for message clarity and trust.",
    ctaDescription:
      "Inside membership, these topics go deeper into offer structure, page reviews, and the practical conversion improvements that create stronger commercial signal."
  },
  "scaling-without-burnout": {
    headline: "How to scale without burnout by strengthening structure before pressure rises",
    introduction: [
      "Scaling becomes dangerous when growth arrives faster than structure. The founder ends up carrying more decisions, more rescue work, and more operational load than the business can sustain for long.",
      "Healthy scale asks a different question. What needs to become clearer, steadier, and less founder-dependent before the next level of pressure arrives?"
    ],
    sections: [
      {
        title: "Why growth exposes weak structure quickly",
        description: "Scale amplifies what the business was already depending on.",
        paragraphs: [
          "If delivery, communication, or decision-making still rely too heavily on the founder, growth rarely fixes that. It magnifies it. More demand creates more strain on the same weak points.",
          "That is why many businesses mistake growth pain for a capacity problem when it is actually a structure problem."
        ],
        supportingArticleSlugs: [
          "how-to-scale-without-burning-out-the-founder",
          "when-a-growing-business-needs-better-systems-not-more-hours"
        ]
      },
      {
        title: "Why better systems matter before the founder burns out",
        description: "Systems protect quality and thinking space.",
        paragraphs: [
          "Longer hours can temporarily hide operational weakness, but they do not create reliable capacity. Systems are what make repeated work easier to hold and easier to trust.",
          "That matters because founder burnout is often the result of becoming the informal system that the business never properly built."
        ],
        supportingArticleSlugs: [
          "when-a-growing-business-needs-better-systems-not-more-hours",
          "how-to-create-a-simple-business-operating-structure"
        ]
      },
      {
        title: "What healthier scale protects",
        description: "The next stage should preserve judgement, not consume it.",
        paragraphs: [
          "A stronger scale path protects strategic thinking. The founder should still have room to decide, review, and direct rather than spending every better hour on coordination.",
          "That is why scaling well is not only about systems. It is also about deciding what the founder must stop carrying directly."
        ],
        supportingArticleSlugs: [
          "how-to-scale-without-burning-out-the-founder",
          "how-founders-make-better-decisions-when-the-business-feels-noisy"
        ]
      }
    ],
    ctaTitle: "Public scale thinking first. Member operating design next.",
    ctaDescription:
      "Membership takes these ideas into the deeper founder-dependency review, system design choices, and operating changes that let growth become more holdable."
  },
  "business-networking-and-ecosystems": {
    headline: "Why business networking works better inside a real ecosystem",
    introduction: [
      "Most business owners do not need more contacts. They need a stronger environment for trust, timing, and relevance to build around the right relationships.",
      "That is what separates an ecosystem from random networking. An ecosystem creates repeated context, visible contribution, and more useful reasons for introductions to happen."
    ],
    sections: [
      {
        title: "Why networking alone often feels shallow",
        description: "Contact without context rarely compounds.",
        paragraphs: [
          "Traditional networking can produce names and surface-level awareness, but it often fails to create the repeated context that lets one business describe another with real confidence.",
          "Without that context, relationships stay polite rather than useful. Opportunities appear, but they stay weaker than they should be."
        ],
        supportingArticleSlugs: [
          "why-the-right-business-network-creates-better-opportunities",
          "how-business-ecosystems-create-trust-and-referrals"
        ]
      },
      {
        title: "How ecosystems create trust more quickly",
        description: "People trust what they can see in motion.",
        paragraphs: [
          "An ecosystem helps members see each other in several useful contexts. They see contribution, clarity, follow-through, and relevance rather than a single self-description delivered in isolation.",
          "That is why ecosystems can produce better referrals and better collaborations. Trust is being built through evidence over time."
        ],
        supportingArticleSlugs: [
          "how-business-ecosystems-create-trust-and-referrals",
          "how-to-position-your-offer-when-competitors-all-sound-the-same"
        ]
      },
      {
        title: "What makes a network commercially useful",
        description: "Better rooms create better timing and better introductions.",
        paragraphs: [
          "A commercially useful network helps the right people understand when your business is relevant, not only what it does. Timing and fit improve when the room has more context.",
          "That is why the best environments feel quieter but more valuable. They create fewer random interactions and more conversations with real potential behind them."
        ],
        supportingArticleSlugs: [
          "why-the-right-business-network-creates-better-opportunities",
          "how-business-ecosystems-create-trust-and-referrals"
        ]
      }
    ],
    ctaTitle: "Public ecosystem thinking first. Member relationship depth next.",
    ctaDescription:
      "Inside membership, these ideas become the practical collaboration layer, the trust signals that matter, and the network design that makes relationships more commercially useful."
  },
  "founder-clarity-and-decision-making": {
    headline: "Founder clarity and decision making when the business feels noisy",
    introduction: [
      "Founder clarity is not a vague mindset topic. It changes how the business reads itself. The clearer the founder becomes, the easier it is for priorities, messaging, and decisions to hold under pressure.",
      "This topic cluster is designed to help founders reduce blur. Better decisions often begin with clearer framing rather than more effort."
    ],
    sections: [
      {
        title: "Why noise makes decision-making heavier than it needs to be",
        description: "The issue is usually blur, not lack of intelligence.",
        paragraphs: [
          "Founders often carry several decisions inside one unresolved feeling. That makes the business feel noisy because the real trade-off has not been named clearly enough.",
          "Once the actual decision is framed properly, the path forward often becomes much simpler than it first appeared."
        ],
        supportingArticleSlugs: [
          "how-founders-make-better-decisions-when-the-business-feels-noisy",
          "how-to-find-the-real-bottleneck-in-a-business"
        ]
      },
      {
        title: "What founder clarity changes in the rest of the business",
        description: "The founder's signal shapes the whole operating environment.",
        paragraphs: [
          "A clearer founder usually produces a clearer week, clearer priorities, and clearer messaging. The business gets better at holding direction because it is no longer being reoriented every few days.",
          "That creates trust as well as momentum. Teams, clients, and the wider ecosystem all find it easier to understand where the business is really going."
        ],
        supportingArticleSlugs: [
          "what-founder-clarity-actually-changes-in-a-business",
          "how-to-create-a-weekly-operating-rhythm-for-a-small-business"
        ]
      },
      {
        title: "How better judgement becomes more repeatable",
        description: "Clarity holds better when it has a rhythm around it.",
        paragraphs: [
          "Good judgement should not depend on rare moments of calm. It becomes more repeatable when the founder has a way to review, frame, and revisit decisions with more intent.",
          "That is why clearer thinking and better operating rhythm often belong together. One improves the other."
        ],
        supportingArticleSlugs: [
          "how-founders-make-better-decisions-when-the-business-feels-noisy",
          "what-founder-clarity-actually-changes-in-a-business"
        ]
      }
    ],
    ctaTitle: "Use the public layer to reduce blur first.",
    ctaDescription:
      "Membership takes these ideas deeper into review prompts, decision rhythms, and the structured founder environment that helps better judgement hold over time."
  }
};
