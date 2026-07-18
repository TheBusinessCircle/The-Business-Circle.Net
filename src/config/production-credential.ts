const CONTROL_OR_WHITESPACE = /[\u0000-\u0020\u007f]/;
const PLACEHOLDER_SUFFIX = /^(?:test|example|placeholder|your|change|synthetic|smoke)(?:_|-|$)/i;

export function isProductionCredential(
  value: string,
  expectedPrefix: string,
  minimumLength = expectedPrefix.length + 20
) {
  if (
    value.length < minimumLength ||
    !value.startsWith(expectedPrefix) ||
    CONTROL_OR_WHITESPACE.test(value) ||
    value.includes("...")
  ) {
    return false;
  }

  return !PLACEHOLDER_SUFFIX.test(value.slice(expectedPrefix.length));
}
