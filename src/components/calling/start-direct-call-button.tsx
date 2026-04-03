"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PhoneCall } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type StartDirectCallButtonProps = {
  targetUserId: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
};

export function StartDirectCallButton({
  targetUserId,
  label = "Start 1 to 1 Call",
  size = "default",
  variant = "outline",
  className
}: StartDirectCallButtonProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={isPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setNotice(null);

          startTransition(async () => {
            const response = await fetch("/api/calls/one-to-one", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                targetUserId
              })
            });

            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
              roomPath?: string;
            };

            if (!response.ok || !data.roomPath) {
              setNotice(data.error ?? "Unable to start the call right now.");
              return;
            }

            router.push(data.roomPath);
          });
        }}
      >
        {isPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : <PhoneCall size={15} className="mr-2" />}
        {isPending ? "Opening Call..." : label}
      </Button>

      {notice ? <p className="text-xs text-destructive">{notice}</p> : null}
    </div>
  );
}
