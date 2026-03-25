"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithCredentialsAction(email: string, password: string) {
  return signIn("credentials", {
    email,
    password,
    redirect: false
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}