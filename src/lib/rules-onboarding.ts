type RulesWelcomeInput = {
  isLoggedIn: boolean;
  rulesAccepted: boolean;
};

export function shouldShowRulesWelcomeOverlay({
  isLoggedIn,
  rulesAccepted
}: RulesWelcomeInput): boolean {
  return isLoggedIn && !rulesAccepted;
}
