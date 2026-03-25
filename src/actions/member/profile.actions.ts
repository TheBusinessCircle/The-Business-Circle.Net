"use server";

import { revalidatePath } from "next/cache";

export async function revalidateProfileSurfaces() {
  revalidatePath("/profile");
  revalidatePath("/directory");
}