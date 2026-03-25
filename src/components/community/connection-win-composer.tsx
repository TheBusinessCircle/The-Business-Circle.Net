import { ArrowRight, CheckCircle2 } from "lucide-react";
import { createConnectionWinAction } from "@/actions/community/feed.actions";
import { FeedSubmitButton } from "@/components/community/feed-submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ConnectionWinComposerProps = {
  returnPath?: string;
};

export function ConnectionWinComposer({
  returnPath = "/dashboard"
}: ConnectionWinComposerProps) {
  return (
    <Card className="border-silver/16 bg-card/62">
      <CardHeader className="space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-silver/18 bg-silver/10 text-silver">
          <CheckCircle2 size={16} />
        </div>
        <div className="space-y-2">
          <CardTitle>Share a connection win</CardTitle>
          <CardDescription>
            Keep it short, real, and useful. Small shifts are worth naming when they came from a good conversation or a better connection inside the Circle.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <details className="group rounded-2xl border border-silver/14 bg-background/18 px-4 py-4 open:bg-background/24">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground marker:hidden">
            <span>Open the structured win prompt</span>
            <span className="inline-flex items-center gap-2 text-xs text-silver transition-transform group-open:translate-x-0.5">
              Add a win
              <ArrowRight size={12} />
            </span>
          </summary>

          <form action={createConnectionWinAction} className="mt-4 space-y-3 border-t border-silver/12 pt-4">
            <input type="hidden" name="returnPath" value={returnPath} />

            <div className="space-y-2">
              <label htmlFor="connection-win-happened" className="text-xs font-medium uppercase tracking-[0.08em] text-silver">
                What happened?
              </label>
              <Textarea
                id="connection-win-happened"
                name="whatHappened"
                rows={3}
                placeholder="A conversation led to something useful, clearer, or more actionable."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="connection-win-who" className="text-xs font-medium uppercase tracking-[0.08em] text-silver">
                Who did you connect with?
              </label>
              <Input
                id="connection-win-who"
                name="whoConnectedWith"
                placeholder="A member name, business type, or a useful kind of connection"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="connection-win-changed" className="text-xs font-medium uppercase tracking-[0.08em] text-silver">
                  What changed?
                </label>
                <Textarea
                  id="connection-win-changed"
                  name="whatChanged"
                  rows={3}
                  placeholder="The decision, direction, or action that moved because of it."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="connection-win-result" className="text-xs font-medium uppercase tracking-[0.08em] text-silver">
                  What is the result so far?
                </label>
                <Textarea
                  id="connection-win-result"
                  name="resultSoFar"
                  rows={3}
                  placeholder="An outcome, early result, or what feels different now."
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-silver/12 pt-4">
              <p className="text-xs text-muted">
                This stays clean on purpose. Share the shift, not the whole backstory.
              </p>
              <FeedSubmitButton type="submit" variant="outline" pendingLabel="Sharing...">
                Share win
              </FeedSubmitButton>
            </div>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
