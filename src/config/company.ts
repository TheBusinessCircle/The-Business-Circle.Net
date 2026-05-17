export const COMPANY_CONFIG = {
  legalName: "THE BUSINESS CIRCLE NETWORK LTD",
  displayLegalName: "The Business Circle Network LTD",
  companyNumber: "17135876",
  registration: "Registered in England and Wales"
} as const;

export function formatCompanyTrustLine() {
  return `${COMPANY_CONFIG.legalName} | Company number: ${COMPANY_CONFIG.companyNumber} | ${COMPANY_CONFIG.registration}`;
}
