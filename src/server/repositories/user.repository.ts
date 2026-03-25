import { db } from "@/lib/db";

export async function findUserById(userId: string) {
  return db.user.findUnique({ where: { id: userId } });
}

export async function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email: email.toLowerCase() } });
}