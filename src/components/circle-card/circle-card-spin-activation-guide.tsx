import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CircleCardSpinActivationGuideProps = {
  hasInteracted: boolean;
};

export function CircleCardSpinActivationGuide({
  hasInteracted
}: CircleCardSpinActivationGuideProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-20 transition-opacity duration-500",
        hasInteracted ? "opacity-55" : "opacity-100"
      )}
      data-circle-card-spin-guide="true"
      data-interacted={hasInteracted ? "true" : "false"}
    >
      <span className="circle-card-spin-guide-arrow circle-card-spin-guide-arrow-left">
        <ArrowLeft size={18} strokeWidth={1.8} />
      </span>
      <span className="circle-card-spin-guide-arrow circle-card-spin-guide-arrow-right">
        <ArrowRight size={18} strokeWidth={1.8} />
      </span>
    </span>
  );
}
