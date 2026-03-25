"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { roleToTier } from "@/lib/permissions";
import { requireAdmin, requireUser } from "@/lib/session";

const submitQuestionSchema = z.object({
  question: z.string().trim().min(10).max(1500)
});

const answerQuestionSchema = z.object({
  questionId: z.string().cuid(),
  answer: z.string().trim().min(4).max(3000)
});

export async function submitInnerCircleQuestionAction(formData: FormData) {
  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);

  if (effectiveTier !== "INNER_CIRCLE") {
    return;
  }

  const parsed = submitQuestionSchema.safeParse({
    question: String(formData.get("question") || "")
  });

  if (!parsed.success) {
    return;
  }

  await db.innerCircleQuestion.create({
    data: {
      userId: session.user.id,
      question: parsed.data.question
    }
  });

  revalidatePath("/inner-circle");
  revalidatePath("/admin/founding");
}

export async function answerInnerCircleQuestionAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = answerQuestionSchema.safeParse({
    questionId: String(formData.get("questionId") || ""),
    answer: String(formData.get("answer") || "")
  });

  if (!parsed.success) {
    return;
  }

  await db.innerCircleQuestion.update({
    where: {
      id: parsed.data.questionId
    },
    data: {
      answer: parsed.data.answer,
      isAnswered: true,
      answeredAt: new Date(),
      answeredById: session.user.id
    }
  });

  revalidatePath("/inner-circle");
  revalidatePath("/admin/founding");
}
