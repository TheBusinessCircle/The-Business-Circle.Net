import { CircleCardAccountType } from "@prisma/client";

export type CircleCardUpgradePlanKey = "PRO" | "TEAMS";

export type CircleCardUpgradeUsageSnapshot = {
  activeFeaturedLinks: number;
  featuredLinkLimit?: number | null;
  walletContacts: number;
  cardViews: number;
  shares: number;
  profileCompletion: number;
  socialProfiles: number;
  referrals: number;
  introductions: number;
  opportunities: number;
  accountType?: CircleCardAccountType | string | null;
  businessName?: string | null;
  role?: string | null;
  tagline?: string | null;
  about?: string | null;
  identityTags?: string[] | null;
};

export type CircleCardUpgradeTrigger = {
  id: string;
  plan: CircleCardUpgradePlanKey;
  title: string;
  message: string;
  priority: number;
};

export type CircleCardUpgradeReadiness = {
  score: number;
  label: "Building" | "Warming" | "Ready" | "High intent";
  reasons: string[];
};

export const CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS = {
  featuredLinkUsage: 0.8,
  highProfileCompletion: 80,
  multipleSocialProfiles: 3,
  highCardViews: 100,
  highShares: 10,
  walletGrowth: 25,
  repeatedRelationshipFlow: 3,
  activeOpportunities: 2
} as const;

const TEAM_LANGUAGE_PATTERN =
  /\b(team|teams|staff|employee|employees|company|companies|organisation|organization|agency|firm|practice|studio|group|department|branch|workforce|office|hq|limited|ltd|llc|plc)\b/i;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cleanCount(value: number | null | undefined) {
  return Math.max(0, Math.floor(value ?? 0));
}

function featuredLinkUsage(snapshot: CircleCardUpgradeUsageSnapshot) {
  const limit = cleanCount(snapshot.featuredLinkLimit);

  if (!limit) {
    return 0;
  }

  return cleanCount(snapshot.activeFeaturedLinks) / limit;
}

export function hasCircleCardTeamsOrganisationSignal(snapshot: CircleCardUpgradeUsageSnapshot) {
  const text = [
    snapshot.businessName,
    snapshot.role,
    snapshot.tagline,
    snapshot.about,
    ...(snapshot.identityTags ?? [])
  ]
    .filter(Boolean)
    .join(" ");

  return TEAM_LANGUAGE_PATTERN.test(text);
}

export function buildCircleCardUpgradeTriggers(snapshot: CircleCardUpgradeUsageSnapshot) {
  const pro: CircleCardUpgradeTrigger[] = [];
  const teams: CircleCardUpgradeTrigger[] = [];
  const linkLimit = cleanCount(snapshot.featuredLinkLimit);
  const activeLinks = cleanCount(snapshot.activeFeaturedLinks);
  const linkUsage = featuredLinkUsage(snapshot);
  const profileCompletion = cleanCount(snapshot.profileCompletion);
  const cardViews = cleanCount(snapshot.cardViews);
  const shares = cleanCount(snapshot.shares);
  const walletContacts = cleanCount(snapshot.walletContacts);
  const referrals = cleanCount(snapshot.referrals);
  const introductions = cleanCount(snapshot.introductions);
  const opportunities = cleanCount(snapshot.opportunities);

  if (linkLimit > 0 && linkUsage >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.featuredLinkUsage) {
    pro.push({
      id: "featured-links-80",
      plan: "PRO",
      title: "Featured links nearly full",
      message: `You are using ${activeLinks}/${linkLimit} featured links. Pro prepares more room for stronger visibility.`,
      priority: 80
    });
  }

  if (profileCompletion >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.highProfileCompletion) {
    pro.push({
      id: "profile-completion-high",
      plan: "PRO",
      title: "Your profile looks ready",
      message: "Pro adds deeper analytics, lead capture and stronger profile control.",
      priority: 70
    });
  }

  if (cleanCount(snapshot.socialProfiles) >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.multipleSocialProfiles) {
    pro.push({
      id: "multiple-social-profiles",
      plan: "PRO",
      title: "Your identity spans channels",
      message: "Pro helps turn those channels into a stronger public profile.",
      priority: 65
    });
  }

  if (cardViews >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.highCardViews) {
    pro.push({
      id: "high-card-views",
      plan: "PRO",
      title: "Your card is gaining traction",
      message: "Unlock deeper visibility tools with Pro.",
      priority: 90
    });
  }

  if (shares >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.highShares) {
    pro.push({
      id: "high-card-shares",
      plan: "PRO",
      title: "Your card is being shared",
      message: "Pro fits cards that help you network, sell and get referred.",
      priority: 85
    });
  }

  if (snapshot.accountType === CircleCardAccountType.TEAM) {
    teams.push({
      id: "team-account-type",
      plan: "TEAMS",
      title: "Teams matches this account",
      message: "Shared contacts and staff cards work better with Teams.",
      priority: 95
    });
  }

  if (hasCircleCardTeamsOrganisationSignal(snapshot)) {
    teams.push({
      id: "organisation-language",
      plan: "TEAMS",
      title: "Company signals detected",
      message: "Teams keeps company identity, staff cards and shared contacts in one place.",
      priority: 78
    });
  }

  if (referrals + introductions >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.repeatedRelationshipFlow) {
    teams.push({
      id: "relationship-flow",
      plan: "TEAMS",
      title: "Relationship flow is becoming shared",
      message: "Teams gives owners and staff better control over referrals and introductions.",
      priority: 82
    });
  }

  if (
    walletContacts >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.walletGrowth &&
    opportunities >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.activeOpportunities
  ) {
    teams.push({
      id: "wallet-and-opportunities",
      plan: "TEAMS",
      title: "Your network is turning into pipeline",
      message: "Teams helps companies manage shared contacts, follow-ups and team analytics.",
      priority: 75
    });
  }

  return {
    pro: pro.sort((a, b) => b.priority - a.priority),
    teams: teams.sort((a, b) => b.priority - a.priority)
  };
}

export function calculateCircleCardUpgradeReadiness(
  snapshot: CircleCardUpgradeUsageSnapshot
): CircleCardUpgradeReadiness {
  const profileScore = clamp(cleanCount(snapshot.profileCompletion), 0, 100) * 0.25;
  const viewScore = clamp(cleanCount(snapshot.cardViews) / 200, 0, 1) * 20;
  const shareScore = clamp(cleanCount(snapshot.shares) / 25, 0, 1) * 15;
  const walletScore = clamp(cleanCount(snapshot.walletContacts) / 50, 0, 1) * 15;
  const referralScore = clamp(cleanCount(snapshot.referrals) / 5, 0, 1) * 10;
  const opportunityScore = clamp(cleanCount(snapshot.opportunities) / 5, 0, 1) * 15;
  const score = Math.round(
    profileScore + viewScore + shareScore + walletScore + referralScore + opportunityScore
  );
  const reasons: string[] = [];

  if (snapshot.profileCompletion >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.highProfileCompletion) {
    reasons.push("High profile completion");
  }

  if (snapshot.cardViews >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.highCardViews) {
    reasons.push("High public-card views");
  }

  if (snapshot.shares >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.highShares) {
    reasons.push("High sharing activity");
  }

  if (snapshot.walletContacts >= CIRCLE_CARD_UPGRADE_TRIGGER_THRESHOLDS.walletGrowth) {
    reasons.push("Growing wallet or save activity");
  }

  if (snapshot.referrals > 0) {
    reasons.push("Referral activity");
  }

  if (snapshot.opportunities > 0) {
    reasons.push("Opportunity activity");
  }

  const label =
    score >= 75 ? "High intent" : score >= 55 ? "Ready" : score >= 35 ? "Warming" : "Building";

  return {
    score,
    label,
    reasons
  };
}
