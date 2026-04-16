const BLOCKED_SINGLE_WORDS = [
  "arsehole",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "crap",
  "cunt",
  "damn",
  "dickhead",
  "fucker",
  "fucking",
  "fuck",
  "motherfucker",
  "pissed",
  "prick",
  "shit",
  "shitty",
  "twat",
  "wanker"
] as const;

const BLOCKED_PHRASES = ["piece of shit", "son of a bitch"] as const;

function normaliseModerationText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsBlockedProfanity(value: string) {
  const normalised = normaliseModerationText(value);

  if (!normalised) {
    return false;
  }

  const tokens = new Set(normalised.split(" "));

  if (BLOCKED_SINGLE_WORDS.some((word) => tokens.has(word))) {
    return true;
  }

  return BLOCKED_PHRASES.some((phrase) => normalised.includes(phrase));
}

export function assertNoBlockedProfanity(value: string) {
  if (!containsBlockedProfanity(value)) {
    return;
  }

  throw new Error("community-content-blocked");
}
