"use client";

import { useRef } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { canBypassDeleteConfirmation } from "@/actions/admin/member-account-removal.shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminMemberDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  memberId: string;
  email: string;
  returnPath: string;
  className?: string;
};

function DeleteSubmitButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant="danger"
      disabled={pending}
      className={cn("w-full justify-start", className)}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          Removing...
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          <Trash2 size={12} />
          Remove Account
        </span>
      )}
    </Button>
  );
}

export function AdminMemberDeleteForm({
  action,
  memberId,
  email,
  returnPath,
  className
}: AdminMemberDeleteFormProps) {
  const confirmationRef = useRef<HTMLInputElement>(null);
  const bypassConfirmation = canBypassDeleteConfirmation(email);

  return (
    <form
      className={className}
      action={action}
      onSubmit={(event) => {
        if (bypassConfirmation) {
          if (confirmationRef.current) {
            confirmationRef.current.value = email.trim().toLowerCase();
          }

          return;
        }

        const confirmation = window.prompt(
          `Type ${email} to permanently delete this account.`
        );

        if (!confirmation) {
          event.preventDefault();
          return;
        }

        const normalizedConfirmation = confirmation.trim().toLowerCase();
        if (confirmationRef.current) {
          confirmationRef.current.value = normalizedConfirmation;
        }

        if (normalizedConfirmation !== email.trim().toLowerCase()) {
          event.preventDefault();
          window.alert("The email did not match, so the account was not deleted.");
        }
      }}
    >
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input
        ref={confirmationRef}
        type="hidden"
        name="confirmationEmail"
        defaultValue={bypassConfirmation ? email : ""}
      />
      <DeleteSubmitButton />
    </form>
  );
}
