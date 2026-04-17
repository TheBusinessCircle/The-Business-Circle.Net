import { WinCategory } from "@prisma/client";
import type { DirectMessageMemberSummary, WinEditorSeedModel } from "@/types";
import { saveWinAction } from "@/actions/wins/wins.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type WinFormProps = {
  seed: WinEditorSeedModel;
  availableMembers: DirectMessageMemberSummary[];
  returnPath?: string;
};

export function WinForm({ seed, availableMembers, returnPath = "/wins" }: WinFormProps) {
  return (
    <Card className="border-silver/16 bg-card/72">
      <CardHeader>
        <CardTitle>{seed.id ? "Refine shared success" : "Create a win"}</CardTitle>
        <CardDescription>
          Keep this structured, specific, and commercially useful. The strongest wins are clear enough for another member to understand in one read.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveWinAction} className="space-y-5">
          <input type="hidden" name="winId" value={seed.id ?? ""} />
          <input type="hidden" name="threadId" value={seed.threadId ?? ""} />
          <input type="hidden" name="returnPath" value={returnPath} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="win-title">Title</Label>
              <Input
                id="win-title"
                name="title"
                defaultValue={seed.title}
                placeholder="A useful outcome worth naming clearly"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="win-category">Category</Label>
              <Select id="win-category" name="category" defaultValue={seed.category}>
                {Object.values(WinCategory).map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="win-summary">Short summary</Label>
            <Textarea
              id="win-summary"
              name="summary"
              rows={6}
              defaultValue={seed.summary}
              placeholder="What happened, what changed, and why it mattered."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="win-tags">Tags</Label>
              <Input
                id="win-tags"
                name="tagsInput"
                defaultValue={seed.tags.join(", ")}
                placeholder="referral, partnership, clarity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="win-quote">Quote or testimonial</Label>
              <Input
                id="win-quote"
                name="quote"
                defaultValue={seed.quote}
                placeholder="An optional line that captures the result"
              />
            </div>
          </div>

          {availableMembers.length ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Credit members involved</p>
              <div className="grid gap-3 md:grid-cols-2">
                {availableMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-start gap-3 rounded-2xl border border-silver/14 bg-background/20 px-4 py-3 text-sm text-muted"
                  >
                    <input
                      type="checkbox"
                      name="creditedUserIds"
                      value={member.id}
                      defaultChecked={seed.creditedUserIds.includes(member.id)}
                      className="mt-1 h-4 w-4 rounded border-border bg-background"
                    />
                    <span>
                      <span className="block font-medium text-foreground">
                        {member.name ?? member.email}
                      </span>
                      <span className="block text-xs text-muted">
                        {member.companyName || member.headline || "Member credit"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted">
                Credited members are asked to confirm their attribution before the win is fully published.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="win-attachments">Image or proof asset</Label>
            <Input
              id="win-attachments"
              name="attachments"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-silver/12 pt-4">
            <p className="text-xs text-muted">
              Drafts stay private until you choose to publish them.
            </p>
            <div className="flex gap-2">
              <Button type="submit" name="intent" value="save_draft" variant="outline">
                Save draft
              </Button>
              <Button type="submit" name="intent" value="publish">
                Post a win
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
