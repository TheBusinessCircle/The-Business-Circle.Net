import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, MessageSquarePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  buildFirstThreeMovesActivation,
  type FirstThreeMovesInput
} from "@/lib/community/first-three-moves";
import { cn } from "@/lib/utils";

type FirstThreeMovesCardProps = FirstThreeMovesInput & {
  className?: string;
};

export function FirstThreeMovesCard({
  className,
  ...input
}: FirstThreeMovesCardProps) {
  const activation = buildFirstThreeMovesActivation(input);
  const nextStep = activation.steps.find((step) => !step.complete) ?? activation.steps[2];

  return (
    <Card
      className={cn(
        "overflow-hidden border-gold/24 bg-gradient-to-br from-gold/12 via-card/80 to-card/68 shadow-gold-soft",
        className
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
              First moves
            </p>
            <CardTitle className="mt-2 font-display text-2xl leading-tight sm:text-3xl">
              {activation.title}
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-sm leading-relaxed">
              {activation.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-gold/24 bg-gold/10 text-gold">
            {activation.completedCount}/3 complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          {activation.steps.map((step, index) => {
            const StatusIcon = step.complete ? CheckCircle2 : Circle;

            return (
              <Link
                key={step.title}
                href={step.href}
                className={cn(
                  "group flex min-h-[13rem] flex-col justify-between rounded-2xl border p-4 transition-colors",
                  step.complete
                    ? "border-gold/24 bg-gold/10"
                    : "border-silver/16 bg-background/20 hover:border-silver/30 hover:bg-background/30"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-silver/14 bg-background/24 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                      Step {index + 1}
                    </span>
                    <StatusIcon
                      size={17}
                      className={step.complete ? "text-gold" : "text-muted"}
                    />
                  </div>
                  <p className="mt-4 text-base font-semibold text-foreground">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-silver transition-colors group-hover:text-foreground">
                  {step.label}
                  <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              {"This week's conversation starter"}
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed text-foreground">
              {activation.weeklyPrompt}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Use it as a simple post if you want a clear way into the room.
            </p>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-gold/20 bg-gold/10 px-4 py-4">
            <p className="text-sm leading-relaxed text-muted">
              The next useful move is small and specific.
            </p>
            <Link
              href={nextStep.href}
              className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full justify-center sm:w-auto")}
            >
              {nextStep.label}
              <MessageSquarePlus size={15} className="ml-2" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
