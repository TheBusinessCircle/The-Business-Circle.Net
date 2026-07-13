"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function CircleCardInterestSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full gap-2" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
      {pending ? "Registering interest…" : "Register Pro Interest"}
    </Button>
  );
}
