"use client";

import { useMemo } from "react";
import type { MembershipTier } from "@prisma/client";
import { MEMBERSHIP_PLANS } from "@/config/membership";

export function useMembershipPlan(tier: MembershipTier) {
  return useMemo(() => MEMBERSHIP_PLANS[tier], [tier]);
}
