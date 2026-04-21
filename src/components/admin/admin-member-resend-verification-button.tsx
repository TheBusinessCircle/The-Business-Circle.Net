"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type AdminMemberResendVerificationButtonProps = {
  memberId: string;
  className?: string;
};

export function AdminMemberResendVerificationButton({
  memberId,
  className
}: AdminMemberResendVerificationButtonProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResend() {
    setNotice(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/members/${memberId}/resend-verification`, {
          method: "POST"
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          setError(payload.error || "Unable to resend the confirmation email.");
          return;
        }

        setNotice(payload.message || "Confirmation email sent.");
        router.refresh();
      } catch {
        setError("Unable to resend the confirmation email.");
      }
    });
  }

  return (
    <div className={className ? `${className} space-y-2` : "space-y-2"}>
      <Button type="button" variant="outline" size="sm" onClick={handleResend} disabled={isPending}>
        {isPending ? "Sending..." : "Resend confirmation email"}
      </Button>
      {notice ? <p className="text-xs text-gold">{notice}</p> : null}
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
