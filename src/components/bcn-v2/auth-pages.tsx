import { LoginFormV2, RegisterForm } from "./forms";
export async function BcnLogin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  return (
    <LoginFormV2
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
