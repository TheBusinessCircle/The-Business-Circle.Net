import { auth } from "@/auth";
import { NavbarClient } from "@/components/public/navbar-client";

export async function Navbar() {
  const session = await auth();

  return <NavbarClient isAuthenticated={Boolean(session?.user)} />;
}
