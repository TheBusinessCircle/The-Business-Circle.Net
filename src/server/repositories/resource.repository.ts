import { db } from "@/lib/db";

export async function findResourceBySlug(slug: string) {
  return db.resource.findUnique({ where: { slug } });
}

export async function listResourceCategories() {
  return db.category.findMany({ orderBy: { name: "asc" } });
}