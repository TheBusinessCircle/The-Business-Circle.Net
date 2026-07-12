"use server";

import { logServerError } from "@/lib/security/logging";
import {
  saveFirstCard,
  type FirstCardDraftInput
} from "@/server/circle-card/onboarding.service";

export async function saveFirstCircleCardStepAction(input: FirstCardDraftInput) {
  try {
    return await saveFirstCard(input, false);
  } catch (error) {
    logServerError("circle-card-onboarding-action-failed", error, { publish: false });
    return {
      ok: false as const,
      message: "We could not save that yet. Your details are still here—try again."
    };
  }
}

export async function publishFirstCircleCardAction(input: FirstCardDraftInput) {
  try {
    return await saveFirstCard(input, true);
  } catch (error) {
    logServerError("circle-card-onboarding-action-failed", error, { publish: true });
    return {
      ok: false as const,
      message: "We could not publish that yet. Your details are still here—try again."
    };
  }
}
