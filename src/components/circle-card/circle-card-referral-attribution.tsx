"use client";

import { useEffect } from "react";

type CircleCardReferralAttributionProps = {
  referralCode?: string | null;
  sourceType: "public_card_ref" | "spin_to_connect";
  sourceCardSlug?: string | null;
  sourceEvent: string;
};

export function CircleCardReferralAttribution({
  referralCode,
  sourceType,
  sourceCardSlug,
  sourceEvent
}: CircleCardReferralAttributionProps) {
  useEffect(() => {
    if (!referralCode && !sourceCardSlug) {
      return;
    }

    const storageKey = [
      "circle-card:referral-attribution",
      referralCode || "",
      sourceType,
      sourceCardSlug || "",
      sourceEvent
    ].join(":");

    try {
      if (sessionStorage.getItem(storageKey) === "true") {
        return;
      }

      sessionStorage.setItem(storageKey, "true");
    } catch {
      // Session storage only prevents duplicate capture attempts.
    }

    void fetch("/api/circle-card/referral-attribution", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        referralCode,
        sourceType,
        sourceCardSlug,
        sourceEvent
      }),
      keepalive: true
    }).catch(() => undefined);
  }, [referralCode, sourceCardSlug, sourceEvent, sourceType]);

  return null;
}
