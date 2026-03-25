import { db } from "@/lib/db";

export async function findChannelBySlug(slug: string) {
  return db.channel.findUnique({ where: { slug } });
}