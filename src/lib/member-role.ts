import type { MemberRoleTag } from "@prisma/client";

export function getMemberRoleLabel(roleTag: MemberRoleTag) {
  switch (roleTag) {
    case "ADVISOR":
      return "Advisor";
    case "OPERATOR":
      return "Operator";
    default:
      return "Founder";
  }
}

export function getMemberRoleDescription(roleTag: MemberRoleTag) {
  switch (roleTag) {
    case "ADVISOR":
      return "Visible on your profile and community activity as an advisor.";
    case "OPERATOR":
      return "Visible on your profile and community activity as an operator.";
    default:
      return "Visible on your profile and community activity as a founder.";
  }
}
