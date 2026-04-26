import {
  ResourceApprovalStatus,
  ResourceImageStatus,
  ResourceMediaType,
  ResourceTier,
  ResourceType
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { resolveResourceImage } from "@/lib/resources/resource-media";
import { buildResourceContentPrompt } from "@/server/resources/resource-content-prompt-builder";
import {
  ResourceGenerationError,
  buildDailyResourcePlan,
  validateGeneratedDailySet,
  validateResourceForApproval,
  type GeneratedResourceCandidate
} from "@/server/resources/resource-generation-guards";

const REFERENCE_DATE = new Date("2026-04-26T00:00:00.000Z");

function candidate(input: Partial<GeneratedResourceCandidate> = {}): GeneratedResourceCandidate {
  const tier = input.tier ?? ResourceTier.FOUNDATION;
  const category = input.category ?? "Offer Clarity";
  const type = input.type ?? ResourceType.CLARITY;

  return {
    title: input.title ?? `A specific resource for ${tier} ${category} ${type}`,
    slug: input.slug ?? `specific-resource-${tier.toLowerCase()}-${type.toLowerCase()}`,
    tier,
    category,
    type,
    excerpt:
      input.excerpt ??
      "A practical resource for seeing the issue clearly and taking a better next step.",
    content:
      input.content ??
      [
        "This is a clear opener that names the business issue in plain English.",
        "## Reality",
        "The business is carrying more confusion than it needs to carry. ".repeat(30),
        "## Breakdown",
        "### What people usually miss",
        "The visible issue is rarely the full issue. ".repeat(25),
        "### Why it keeps happening",
        "The same weak condition keeps being carried into the next decision. ".repeat(25),
        "### What it costs",
        "The cost is lost signal, slower decisions, and avoidable owner drag. ".repeat(25),
        "## Shift",
        "The better move is to make the commercial truth easier to see. ".repeat(25),
        "## Next step",
        "1. Name the issue.\n2. Remove one source of confusion.\n3. Review what changed."
      ].join("\n\n"),
    imageDirection:
      input.imageDirection ??
      "Premium editorial resource cover with a calm business-owner atmosphere.",
    imagePrompt:
      input.imagePrompt ??
      "Premium editorial business image in a dark royal blue atmosphere with subtle gold and silver accents, clean business-owner workspace, no text, no logos, no cartoon, no stock-photo cliche.",
    estimatedReadMinutes: input.estimatedReadMinutes ?? 5
  };
}

describe("daily resource generation guards", () => {
  it("plans exactly one resource per tier with unique categories and types", () => {
    const plan = buildDailyResourcePlan([], REFERENCE_DATE);

    expect(plan.items).toHaveLength(3);
    expect(plan.items.map((item) => item.tier)).toEqual([
      ResourceTier.FOUNDATION,
      ResourceTier.INNER,
      ResourceTier.CORE
    ]);
    expect(new Set(plan.items.map((item) => item.category)).size).toBe(3);
    expect(new Set(plan.items.map((item) => item.type)).size).toBe(3);
    expect(new Set(plan.items.map((item) => item.angle)).size).toBe(3);
  });

  it("tells generated resources to account for higher-tier access to lower-tier resources", () => {
    const plan = buildDailyResourcePlan([], REFERENCE_DATE);
    const coreItem = plan.items.find((item) => item.tier === ResourceTier.CORE);

    expect(coreItem).toBeDefined();

    const prompt = buildResourceContentPrompt({
      planItem: coreItem!,
      generationDateKey: plan.dateKey,
      sameDayExclusions: plan.items
        .filter((item) => item.tier !== coreItem!.tier)
        .map((item) => ({
          tier: item.tier,
          category: item.category,
          type: item.type,
          angle: item.angle
        })),
      recentHistory: []
    });

    expect(prompt).toContain("Higher-tier members can read lower-tier resources");
    expect(prompt).toContain("Core members can also read Inner Circle");
  });

  it("rejects same-day duplicate categories and types", () => {
    const items = [
      candidate(),
      candidate({
        tier: ResourceTier.INNER,
        title: "A different title for inner",
        slug: "different-title-inner",
        category: "Offer Clarity",
        type: ResourceType.STRATEGY
      }),
      candidate({
        tier: ResourceTier.CORE,
        title: "A different title for core",
        slug: "different-title-core",
        category: "Decision Making",
        type: ResourceType.ACTION
      })
    ];

    expect(() => validateGeneratedDailySet(items)).toThrow(ResourceGenerationError);
  });

  it("catches generated resources with missing content", () => {
    expect(() =>
      validateGeneratedDailySet([
        candidate({ content: "Too short" }),
        candidate({
          tier: ResourceTier.INNER,
          category: "Customer Journey",
          type: ResourceType.STRATEGY
        }),
        candidate({
          tier: ResourceTier.CORE,
          category: "Decision Making",
          type: ResourceType.ACTION
        })
      ])
    ).toThrow(ResourceGenerationError);
  });

  it("does not approve incomplete generated resources", () => {
    expect(() =>
      validateResourceForApproval({
        title: "Incomplete generated resource",
        excerpt: "This resource is not ready for approval yet.",
        content: "Too short",
        tier: ResourceTier.FOUNDATION,
        category: "Offer Clarity",
        type: ResourceType.CLARITY,
        imagePrompt: null,
        approvalStatus: ResourceApprovalStatus.PENDING_APPROVAL,
        imageStatus: ResourceImageStatus.PROMPT_READY
      })
    ).toThrow(ResourceGenerationError);
  });

  it("returns a valid premium fallback image when no cover is present", () => {
    const resolved = resolveResourceImage({
      title: "Offer clarity without over-explaining",
      category: "Offer Clarity",
      type: ResourceType.CLARITY,
      tier: ResourceTier.FOUNDATION,
      coverImage: null,
      generatedImageUrl: null,
      mediaType: ResourceMediaType.NONE,
      mediaUrl: null
    });

    expect(resolved.isFallback).toBe(true);
    expect(resolved.url).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(resolved.url)).not.toContain(
      "Offer clarity without over-explaining"
    );
  });
});
