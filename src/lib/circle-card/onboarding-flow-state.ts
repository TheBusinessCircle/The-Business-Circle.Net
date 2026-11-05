export function stepAfterFirstCircleCardSave(currentStep: number, saveSucceeded: boolean) {
  if (!saveSucceeded) return currentStep;
  return Math.min(2, Math.max(0, currentStep) + 1);
}


/** Business selection enables discovery unless the owner has already chosen. */
export function discoverAfterFirstCardTypeSelection(
  nextCardType: "PERSONAL" | "CREATOR" | "BUSINESS",
  currentShowInDiscover: boolean,
  preserveDiscoverChoice: boolean
) {
  return preserveDiscoverChoice ? currentShowInDiscover : nextCardType === "BUSINESS";
}
