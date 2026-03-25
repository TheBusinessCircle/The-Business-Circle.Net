"use server";

import { revalidatePath } from "next/cache";

export async function revalidateResourceSurfaces() {
  revalidatePath("/dashboard/resources");
  revalidatePath("/dashboard");
}
