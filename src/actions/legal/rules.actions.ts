"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { BCN_RULES_VERSION } from "@/config/legal";
import { prisma } from "@/lib/prisma";

export async function acceptBcnRulesAndContinueAction() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?from=%2Frules");
  }

  await prisma.user.update({
    where: {
      id: session.user.id
    },
    data: {
      acceptedRulesAt: new Date(),
      acceptedRulesVersion: BCN_RULES_VERSION
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/rules");
  redirect("/dashboard");
}

