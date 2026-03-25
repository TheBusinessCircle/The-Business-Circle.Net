import { ResourceStatus, ResourceTier, ResourceType } from "@prisma/client";
import { RESOURCE_TIER_ORDER } from "@/config/resources";
import { generateResourceDraft, type GeneratedResourceDraft } from "@/lib/resources/content-generator";
import {
  generateFutureTierScheduleSlots,
  generatePastTierScheduleSlots
} from "@/lib/resources/schedule";
import { slugify } from "@/lib/utils";

type ResourceCatalogEntry = {
  title: string;
  type: ResourceType;
  focus: string;
};

type ResourceCatalogGroup = {
  category: string;
  entries: ResourceCatalogEntry[];
};

export type PlannedResourceSeed = GeneratedResourceDraft & {
  status: ResourceStatus;
  publishedAt: Date | null;
  scheduledFor: Date | null;
  summary: string;
};

const PUBLISHED_COUNT_BY_TIER: Record<ResourceTier, number> = {
  FOUNDATION: 20,
  INNER: 15,
  CORE: 10
};

function entry(title: string, type: ResourceType, focus: string): ResourceCatalogEntry {
  return { title, type, focus };
}

const FOUNDATION_CATALOG: ResourceCatalogGroup[] = [
  {
    category: "Getting Started",
    entries: [
      entry(
        "How to start a business without wasting your first year",
        ResourceType.STRATEGY,
        "starting with too many moving parts"
      ),
      entry(
        "What to do first when your business idea feels messy",
        ResourceType.ACTION,
        "finding the first real priority"
      ),
      entry(
        "How to know if your business idea is clear enough",
        ResourceType.CLARITY,
        "testing idea clarity before you build too much"
      ),
      entry(
        "Why your new business feels busy but not productive",
        ResourceType.OBSERVATION,
        "mistaking early activity for forward movement"
      ),
      entry(
        "How to choose the right first offer for your business",
        ResourceType.STRATEGY,
        "selecting a first offer that can actually sell"
      ),
      entry(
        "What a simple business plan actually needs",
        ResourceType.CLARITY,
        "keeping a business plan practical instead of inflated"
      ),
      entry(
        "How to stop second guessing every business decision",
        ResourceType.MINDSET,
        "building steadier judgement in the early stage"
      ),
      entry(
        "Why early businesses drift without noticing",
        ResourceType.OBSERVATION,
        "drift caused by weak priorities"
      ),
      entry(
        "How to build a business around one clear promise",
        ResourceType.ACTION,
        "centering the business on one clear promise"
      ),
      entry(
        "What most founders misunderstand about getting started in business",
        ResourceType.OBSERVATION,
        "misreading what matters in the first stage"
      )
    ]
  },
  {
    category: "Business Foundations",
    entries: [
      entry(
        "How to fix a business that feels messy",
        ResourceType.ACTION,
        "simplifying a business that has become messy"
      ),
      entry(
        "Why your business is not growing even though you are working hard",
        ResourceType.OBSERVATION,
        "effort that is not linked to real movement"
      ),
      entry(
        "How to create a simple business operating structure",
        ResourceType.STRATEGY,
        "building a simple operating structure"
      ),
      entry(
        "What to track in a small business each week",
        ResourceType.ACTION,
        "tracking the few numbers and signals that matter"
      ),
      entry(
        "How to know if your business model is too complicated",
        ResourceType.CLARITY,
        "spotting business model complexity early"
      ),
      entry(
        "Why unclear roles slow a small business down",
        ResourceType.OBSERVATION,
        "role confusion inside a small business"
      ),
      entry(
        "How to make better weekly decisions in business",
        ResourceType.STRATEGY,
        "using a weekly decision rhythm"
      ),
      entry(
        "What business owners should document first",
        ResourceType.ACTION,
        "documenting the first operating essentials"
      ),
      entry(
        "How to build momentum in a small business",
        ResourceType.ACTION,
        "creating repeatable momentum in a small business"
      ),
      entry(
        "Why businesses stall after early progress",
        ResourceType.OBSERVATION,
        "stalling because the foundations did not deepen"
      )
    ]
  },
  {
    category: "Offer Clarity",
    entries: [
      entry(
        "How to make your offer easier to understand",
        ResourceType.CLARITY,
        "making an offer easier to understand"
      ),
      entry(
        "Why customers do not understand what you sell",
        ResourceType.OBSERVATION,
        "buyers not understanding what is actually being sold"
      ),
      entry(
        "How to describe your service so people get it quickly",
        ResourceType.ACTION,
        "describing a service in simple language"
      ),
      entry(
        "How to know if your offer is too broad",
        ResourceType.CLARITY,
        "recognising an offer that is too broad"
      ),
      entry(
        "Why more services can make your business harder to sell",
        ResourceType.OBSERVATION,
        "too many services making the offer weaker"
      ),
      entry(
        "How to choose one core offer before you expand",
        ResourceType.STRATEGY,
        "choosing one core offer before expanding"
      ),
      entry(
        "How to stop writing confusing offer pages",
        ResourceType.ACTION,
        "rewriting offer pages that confuse buyers"
      ),
      entry(
        "What makes an offer feel obvious to the right customer",
        ResourceType.CLARITY,
        "creating an offer that feels obvious to the right buyer"
      ),
      entry(
        "Why your offer sounds fine to you but not to buyers",
        ResourceType.OBSERVATION,
        "owner language not landing with buyers"
      ),
      entry(
        "How to tighten the result your offer promises",
        ResourceType.STRATEGY,
        "tightening the result promised by the offer"
      )
    ]
  },
  {
    category: "Basic Marketing",
    entries: [
      entry(
        "Why your business is not getting enquiries",
        ResourceType.OBSERVATION,
        "weak enquiry flow from basic marketing"
      ),
      entry(
        "How to market a small business when you do not know where to start",
        ResourceType.ACTION,
        "starting marketing without scattering effort"
      ),
      entry(
        "What to say on your website when people are not converting",
        ResourceType.CLARITY,
        "website messaging that is not converting"
      ),
      entry(
        "How to choose one marketing channel and stick with it",
        ResourceType.STRATEGY,
        "choosing one marketing channel long enough to learn"
      ),
      entry(
        "Why posting every day is not the same as marketing",
        ResourceType.OBSERVATION,
        "confusing content activity with marketing progress"
      ),
      entry(
        "How to create a clear message for your business",
        ResourceType.CLARITY,
        "building a clear business message"
      ),
      entry(
        "What small businesses get wrong about social media marketing",
        ResourceType.OBSERVATION,
        "misreading the role of social media marketing"
      ),
      entry(
        "How to turn basic marketing into consistent enquiry flow",
        ResourceType.STRATEGY,
        "turning basic marketing into consistent enquiry flow"
      ),
      entry(
        "Why your marketing feels random week to week",
        ResourceType.OBSERVATION,
        "random weekly marketing with no compounding signal"
      ),
      entry(
        "How to build a simple marketing routine that compounds",
        ResourceType.ACTION,
        "building a simple marketing routine that compounds"
      )
    ]
  },
  {
    category: "Direction and Thinking",
    entries: [
      entry(
        "How to get clear on what your business actually needs next",
        ResourceType.STRATEGY,
        "identifying what the business actually needs next"
      ),
      entry(
        "Why doing more is not the same as moving forward in business",
        ResourceType.OBSERVATION,
        "doing more without actually moving forward"
      ),
      entry(
        "How to stop changing direction every week",
        ResourceType.MINDSET,
        "stopping weekly direction changes"
      ),
      entry(
        "What to do when your business feels stuck",
        ResourceType.ACTION,
        "getting a stuck business moving again"
      ),
      entry(
        "How to think clearly when your business is noisy",
        ResourceType.MINDSET,
        "thinking clearly when the business is noisy"
      ),
      entry(
        "Why business owners confuse activity with progress",
        ResourceType.OBSERVATION,
        "confusing activity with progress"
      ),
      entry(
        "How to make decisions when every option feels possible",
        ResourceType.STRATEGY,
        "making decisions when options feel endless"
      ),
      entry(
        "What clarity looks like in a growing business",
        ResourceType.CLARITY,
        "recognising real clarity in a growing business"
      ),
      entry(
        "How to spot the real problem in your business",
        ResourceType.CLARITY,
        "spotting the real problem instead of the loud one"
      ),
      entry(
        "Why businesses lose direction after early traction",
        ResourceType.OBSERVATION,
        "losing direction after early traction"
      )
    ]
  }
];

const INNER_CATALOG: ResourceCatalogGroup[] = [
  {
    category: "Offer Positioning",
    entries: [
      entry(
        "How to position your offer when competitors all sound the same",
        ResourceType.STRATEGY,
        "positioning an offer in a crowded market"
      ),
      entry(
        "Why your business sounds generic even when the work is good",
        ResourceType.OBSERVATION,
        "good work sounding generic in the market"
      ),
      entry(
        "How to make your offer feel more specific to the right buyer",
        ResourceType.CLARITY,
        "making the offer feel specific to the right buyer"
      ),
      entry(
        "What strong positioning actually does for a business",
        ResourceType.CLARITY,
        "understanding what strong positioning changes"
      ),
      entry(
        "How to stop blending in with cheaper competitors",
        ResourceType.STRATEGY,
        "stopping the slide into cheap comparison"
      ),
      entry(
        "Why broad positioning weakens conversion",
        ResourceType.OBSERVATION,
        "broad positioning weakening conversion"
      ),
      entry(
        "How to sharpen the commercial angle of your offer",
        ResourceType.ACTION,
        "sharpening the commercial angle of the offer"
      ),
      entry(
        "How to know if your positioning is too vague",
        ResourceType.CLARITY,
        "recognising vague positioning"
      ),
      entry(
        "What to change when your message attracts the wrong leads",
        ResourceType.ACTION,
        "changing a message that attracts the wrong leads"
      )
    ]
  },
  {
    category: "Website and Conversion",
    entries: [
      entry(
        "Why your website is not converting visitors into enquiries",
        ResourceType.OBSERVATION,
        "a website that is not converting visitors into enquiries"
      ),
      entry(
        "How to fix a website that looks fine but does not sell",
        ResourceType.ACTION,
        "fixing a website that looks fine but does not sell"
      ),
      entry(
        "What your homepage needs to do in the first ten seconds",
        ResourceType.CLARITY,
        "what the homepage must do in the first ten seconds"
      ),
      entry(
        "How to improve conversion without rebuilding your whole site",
        ResourceType.STRATEGY,
        "improving conversion without a full rebuild"
      ),
      entry(
        "Why more website pages do not always help",
        ResourceType.OBSERVATION,
        "adding more website pages without improving conversion"
      ),
      entry(
        "How to make service pages easier to act on",
        ResourceType.ACTION,
        "making service pages easier to act on"
      ),
      entry(
        "What weak calls to action do to conversion",
        ResourceType.OBSERVATION,
        "weak calls to action dragging conversion down"
      ),
      entry(
        "How to structure a website around buying decisions",
        ResourceType.STRATEGY,
        "structuring a website around buying decisions"
      ),
      entry(
        "How to tell if your website copy is slowing sales",
        ResourceType.CLARITY,
        "spotting website copy that slows sales"
      )
    ]
  },
  {
    category: "Customer Journey",
    entries: [
      entry(
        "How to map a customer journey that actually helps conversion",
        ResourceType.STRATEGY,
        "mapping a customer journey that actually helps conversion"
      ),
      entry(
        "Why leads drop off after the first enquiry",
        ResourceType.OBSERVATION,
        "lead drop off after the first enquiry"
      ),
      entry(
        "How to find the gaps in your customer journey",
        ResourceType.CLARITY,
        "finding the real gaps in the customer journey"
      ),
      entry(
        "What to fix when prospects go quiet after calls",
        ResourceType.ACTION,
        "fixing silence after sales calls"
      ),
      entry(
        "How to reduce friction between interest and sale",
        ResourceType.STRATEGY,
        "reducing friction between interest and sale"
      ),
      entry(
        "Why customer journeys break in ordinary places",
        ResourceType.OBSERVATION,
        "ordinary points where customer journeys break"
      ),
      entry(
        "How to make follow up feel useful instead of needy",
        ResourceType.ACTION,
        "making follow up feel useful instead of needy"
      ),
      entry(
        "What good onboarding changes in a service business",
        ResourceType.CLARITY,
        "what good onboarding changes in a service business"
      ),
      entry(
        "How to improve the handover from sale to delivery",
        ResourceType.ACTION,
        "improving the handover from sale to delivery"
      )
    ]
  },
  {
    category: "Pricing and Value",
    entries: [
      entry(
        "How to price your service when you keep doubting the number",
        ResourceType.STRATEGY,
        "pricing a service without second guessing the number"
      ),
      entry(
        "Why customers say your price is high",
        ResourceType.OBSERVATION,
        "customers saying the price is high"
      ),
      entry(
        "How to explain value without overexplaining",
        ResourceType.CLARITY,
        "explaining value without overexplaining"
      ),
      entry(
        "What weak pricing signals do to trust",
        ResourceType.OBSERVATION,
        "weak pricing signals lowering trust"
      ),
      entry(
        "How to raise prices without sounding awkward",
        ResourceType.ACTION,
        "raising prices without sounding awkward"
      ),
      entry(
        "How to know if you are underpricing your work",
        ResourceType.CLARITY,
        "recognising when the work is underpriced"
      ),
      entry(
        "Why discounting creates the wrong kind of pressure",
        ResourceType.OBSERVATION,
        "discounting that creates the wrong pressure"
      ),
      entry(
        "How to build pricing around value not fear",
        ResourceType.MINDSET,
        "building pricing around value instead of fear"
      ),
      entry(
        "What to change when pricing keeps stalling sales",
        ResourceType.ACTION,
        "changing pricing when it keeps stalling sales"
      )
    ]
  },
  {
    category: "Fixing Problems",
    entries: [
      entry(
        "How to fix a business problem without reacting to symptoms",
        ResourceType.STRATEGY,
        "fixing a business problem without reacting to symptoms"
      ),
      entry(
        "Why the obvious business problem is often not the real one",
        ResourceType.OBSERVATION,
        "the obvious business problem hiding the real one"
      ),
      entry(
        "How to diagnose a business issue properly before you change anything",
        ResourceType.CLARITY,
        "diagnosing a business issue before changing anything"
      ),
      entry(
        "What to do when part of the business keeps breaking",
        ResourceType.ACTION,
        "responding when one part of the business keeps breaking"
      ),
      entry(
        "How to tell the difference between a people problem and a system problem",
        ResourceType.CLARITY,
        "telling the difference between a people problem and a system problem"
      ),
      entry(
        "Why recurring problems usually point to one underlying weakness",
        ResourceType.OBSERVATION,
        "recurring problems pointing to one underlying weakness"
      ),
      entry(
        "How to run a simple problem review each week",
        ResourceType.ACTION,
        "running a simple weekly problem review"
      ),
      entry(
        "What to change first in a business that feels unstable",
        ResourceType.STRATEGY,
        "choosing the first change in an unstable business"
      ),
      entry(
        "How to stop solving the same business problem twice",
        ResourceType.ACTION,
        "stopping the same business problem from repeating"
      )
    ]
  }
];

const CORE_CATALOG: ResourceCatalogGroup[] = [
  {
    category: "Scaling and Structure",
    entries: [
      entry(
        "How to scale a business without creating more chaos",
        ResourceType.STRATEGY,
        "scaling a business without creating more chaos"
      ),
      entry(
        "Why growth exposes weak structure",
        ResourceType.OBSERVATION,
        "growth exposing weak structure"
      ),
      entry(
        "How to know when your business needs a new layer of management",
        ResourceType.CLARITY,
        "knowing when the business needs a new layer of management"
      ),
      entry(
        "What to standardise before you scale further",
        ResourceType.ACTION,
        "standardising the right things before scaling further"
      ),
      entry(
        "Why scaling breaks businesses that still depend on the founder",
        ResourceType.OBSERVATION,
        "scaling while the business still depends on the founder"
      ),
      entry(
        "How to build structure without slowing the business down",
        ResourceType.STRATEGY,
        "building structure without slowing the business down"
      ),
      entry(
        "What capacity problems are really telling you",
        ResourceType.CLARITY,
        "reading what capacity problems are actually telling you"
      ),
      entry(
        "How to prepare a business for the next stage of growth",
        ResourceType.STRATEGY,
        "preparing the business for the next stage of growth"
      )
    ]
  },
  {
    category: "Decision Making",
    entries: [
      entry(
        "How to make better decisions when the stakes are high",
        ResourceType.STRATEGY,
        "making better decisions when the stakes are high"
      ),
      entry(
        "Why leaders lose clarity when too much depends on them",
        ResourceType.OBSERVATION,
        "leaders losing clarity when too much depends on them"
      ),
      entry(
        "How to tell when a decision needs more thought and when it needs movement",
        ResourceType.CLARITY,
        "judging when a decision needs more thought and when it needs movement"
      ),
      entry(
        "What to do when you keep delaying an important decision",
        ResourceType.ACTION,
        "moving on an important decision you keep delaying"
      ),
      entry(
        "Why smart founders still make messy decisions",
        ResourceType.OBSERVATION,
        "smart founders still making messy decisions"
      ),
      entry(
        "How to build a decision process your team can trust",
        ResourceType.STRATEGY,
        "building a decision process the team can trust"
      ),
      entry(
        "What good commercial judgement looks like in practice",
        ResourceType.CLARITY,
        "recognising good commercial judgement in practice"
      ),
      entry(
        "How to reduce the cost of slow decisions",
        ResourceType.ACTION,
        "reducing the cost of slow decisions"
      )
    ]
  },
  {
    category: "Time and Energy",
    entries: [
      entry(
        "How to protect your time when the business keeps pulling at you",
        ResourceType.ACTION,
        "protecting your time when the business keeps pulling at you"
      ),
      entry(
        "Why founder exhaustion creates bad strategy",
        ResourceType.OBSERVATION,
        "founder exhaustion creating bad strategy"
      ),
      entry(
        "How to tell if your calendar is hurting the business",
        ResourceType.CLARITY,
        "seeing whether the calendar is hurting the business"
      ),
      entry(
        "What to stop doing when your energy is always low",
        ResourceType.ACTION,
        "stopping the work that keeps energy low"
      ),
      entry(
        "Why busy leaders lose leverage",
        ResourceType.OBSERVATION,
        "busy leaders losing leverage"
      ),
      entry(
        "How to design a week that leaves room for real thinking",
        ResourceType.STRATEGY,
        "designing a week that leaves room for real thinking"
      ),
      entry(
        "What energy management looks like for an owner operator",
        ResourceType.MINDSET,
        "energy management for an owner operator"
      ),
      entry(
        "How to stop spending your best hours on low value work",
        ResourceType.ACTION,
        "stopping low value work from taking your best hours"
      )
    ]
  },
  {
    category: "Systems",
    entries: [
      entry(
        "How to build systems that people actually follow",
        ResourceType.ACTION,
        "building systems that people actually follow"
      ),
      entry(
        "Why your systems are not being used",
        ResourceType.OBSERVATION,
        "systems not being used in practice"
      ),
      entry(
        "How to know when a business process needs to be documented",
        ResourceType.CLARITY,
        "knowing when a process needs to be documented"
      ),
      entry(
        "What to automate and what to keep human",
        ResourceType.STRATEGY,
        "deciding what to automate and what to keep human"
      ),
      entry(
        "Why bad systems create hidden costs",
        ResourceType.OBSERVATION,
        "bad systems creating hidden costs"
      ),
      entry(
        "How to simplify operations without lowering standards",
        ResourceType.ACTION,
        "simplifying operations without lowering standards"
      ),
      entry(
        "What a good operating system looks like in a growing business",
        ResourceType.CLARITY,
        "what a good operating system looks like in a growing business"
      ),
      entry(
        "How to keep systems useful as the business changes",
        ResourceType.STRATEGY,
        "keeping systems useful as the business changes"
      )
    ]
  },
  {
    category: "Long Term Growth",
    entries: [
      entry(
        "How to build long term growth without chasing every opportunity",
        ResourceType.STRATEGY,
        "building long term growth without chasing every opportunity"
      ),
      entry(
        "Why short term wins can weaken long term growth",
        ResourceType.OBSERVATION,
        "short term wins weakening long term growth"
      ),
      entry(
        "How to know which growth opportunities to ignore",
        ResourceType.CLARITY,
        "knowing which growth opportunities to ignore"
      ),
      entry(
        "What sustainable growth actually requires",
        ResourceType.CLARITY,
        "what sustainable growth actually requires"
      ),
      entry(
        "How to plan growth when the market feels uncertain",
        ResourceType.STRATEGY,
        "planning growth when the market feels uncertain"
      ),
      entry(
        "Why businesses outgrow the strategy that got them here",
        ResourceType.OBSERVATION,
        "outgrowing the strategy that got the business here"
      ),
      entry(
        "How to balance immediate revenue with long term direction",
        ResourceType.STRATEGY,
        "balancing immediate revenue with long term direction"
      ),
      entry(
        "What to strengthen now for better growth later",
        ResourceType.ACTION,
        "strengthening the business now for better growth later"
      )
    ]
  }
];

const CATALOG_BY_TIER: Record<ResourceTier, ResourceCatalogGroup[]> = {
  FOUNDATION: FOUNDATION_CATALOG,
  INNER: INNER_CATALOG,
  CORE: CORE_CATALOG
};

function flattenTierCatalog(tier: ResourceTier): GeneratedResourceDraft[] {
  return CATALOG_BY_TIER[tier].flatMap((group) =>
    group.entries.map((item) =>
      generateResourceDraft({
        title: item.title,
        slug: slugify(item.title),
        tier,
        category: group.category,
        type: item.type,
        focus: item.focus
      })
    )
  );
}

export function buildPlannedResourceSeeds(referenceDate = new Date()): PlannedResourceSeed[] {
  const allResources: PlannedResourceSeed[] = [];
  const seenSlugs = new Set<string>();

  for (const tier of RESOURCE_TIER_ORDER) {
    const items = flattenTierCatalog(tier);
    const publishedCount = PUBLISHED_COUNT_BY_TIER[tier];
    const publishedSlots = generatePastTierScheduleSlots(tier, publishedCount, referenceDate);
    const scheduledSlots = generateFutureTierScheduleSlots(
      tier,
      items.length - publishedCount,
      referenceDate
    );

    items.forEach((item, index) => {
      if (seenSlugs.has(item.slug)) {
        throw new Error(`Duplicate resource slug detected: ${item.slug}`);
      }

      seenSlugs.add(item.slug);

      const isPublished = index < publishedCount;
      allResources.push({
        ...item,
        status: isPublished ? ResourceStatus.PUBLISHED : ResourceStatus.SCHEDULED,
        publishedAt: isPublished ? publishedSlots[index] ?? null : null,
        scheduledFor: isPublished ? null : scheduledSlots[index - publishedCount] ?? null,
        summary: item.excerpt
      });
    });
  }

  return allResources;
}

export function getPlannedResourceSeedCounts(referenceDate = new Date()) {
  const items = buildPlannedResourceSeeds(referenceDate);

  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary.byTier[item.tier].total += 1;

      if (item.status === ResourceStatus.PUBLISHED) {
        summary.published += 1;
        summary.byTier[item.tier].published += 1;
      }

      if (item.status === ResourceStatus.SCHEDULED) {
        summary.scheduled += 1;
        summary.byTier[item.tier].scheduled += 1;
      }

      return summary;
    },
    {
      total: 0,
      published: 0,
      scheduled: 0,
      byTier: {
        FOUNDATION: { total: 0, published: 0, scheduled: 0 },
        INNER: { total: 0, published: 0, scheduled: 0 },
        CORE: { total: 0, published: 0, scheduled: 0 }
      }
    }
  );
}
