import { safeRedirectPath } from "@/lib/auth/utils";
import { isBcnHiddenProductPath } from "@/lib/bcn-v2/flags";
import { LoginFormV2, RegisterForm } from "./forms";
export async function BcnLogin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  return (
    <LoginFormV2
      returnTo={(() => {
        const path = safeRedirectPath(
          typeof p.from === "string" ? p.from : null,
        );
        return isBcnHiddenProductPath(path) ? "/dashboard" : path;
      })()}
      notice={
        p.error === "suspended"
          ? "This account is unavailable. Please contact BCN support."
          : undefined
      }
    />
  );
}
export function BcnRegister() {
  return <RegisterForm />;
}
