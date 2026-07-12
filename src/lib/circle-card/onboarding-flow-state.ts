export function stepAfterFirstCircleCardSave(currentStep: number, saveSucceeded: boolean) {
  if (!saveSucceeded) return currentStep;
  return Math.min(2, Math.max(0, currentStep) + 1);
}
