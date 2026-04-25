import "server-only";

import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const BCN_RULES_REQUIRED_CODE = "bcn-rules-required";
export const BCN_RULES_REQUIRED_MESSAGE =
  "Before accessing conversations, you need to accept the BCN Rules to help maintain the standard of the environment.";
export const BCN_RULES_ACCEPTANCE_PATH = "/profile#bcn-rules";

export class BcnRulesAcceptanceRequiredError extends Error {
  code = BCN_RULES_REQUIRED_CODE;

  constructor() {
    super(BCN_RULES_REQUIRED_MESSAGE);
  }
}

export async function hasAcceptedBcnRules(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      acceptedRulesAt: true
    }
  });

  if (!user) {
    return false;
  }

  return user.role === Role.ADMIN || Boolean(user.acceptedRulesAt);
}

export async function requireBcnRulesAcceptance(userId: string): Promise<void> {
  if (!(await hasAcceptedBcnRules(userId))) {
    throw new BcnRulesAcceptanceRequiredError();
  }
}

export function bcnRulesRequiredResponse(headers?: HeadersInit) {
  return NextResponse.json(
    {
      error: BCN_RULES_REQUIRED_MESSAGE,
      code: BCN_RULES_REQUIRED_CODE,
      actionHref: BCN_RULES_ACCEPTANCE_PATH
    },
    { status: 403, headers }
  );
}

