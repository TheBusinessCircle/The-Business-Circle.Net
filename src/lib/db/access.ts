import { MembershipTier, ResourceTier } from "@prisma/client";

export function allowedResourceTiers(tier: MembershipTier) {
  if (tier === MembershipTier.CORE) {
    return [
      MembershipTier.FOUNDATION,
      MembershipTier.INNER_CIRCLE,
      MembershipTier.CORE
    ];
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return [MembershipTier.FOUNDATION, MembershipTier.INNER_CIRCLE];
  }

  return [MembershipTier.FOUNDATION];
}

export function allowedEditorialResourceTiers(tier: MembershipTier): ResourceTier[] {
  if (tier === MembershipTier.CORE) {
    return [ResourceTier.FOUNDATION, ResourceTier.INNER, ResourceTier.CORE];
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return [ResourceTier.FOUNDATION, ResourceTier.INNER];
  }

  return [ResourceTier.FOUNDATION];
}

export function membershipTierForResourceTier(tier: ResourceTier): MembershipTier {
  if (tier === ResourceTier.CORE) {
    return MembershipTier.CORE;
  }

  if (tier === ResourceTier.INNER) {
    return MembershipTier.INNER_CIRCLE;
  }

  return MembershipTier.FOUNDATION;
}
