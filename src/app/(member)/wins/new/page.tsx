import type { Metadata } from "next";
import { FilePenLine } from "lucide-react";
import { WinForm } from "@/components/wins";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { getWinEditorSeed } from "@/server/wins";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Create a win",
  description: "Draft or publish a structured member win inside The Business Circle Network.",
  path: "/wins/new",
  noIndex: true
});

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function NewWinPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const threadId = firstValue(params.threadId);
  const draftId = firstValue(params.draft);

  const seed = await getWinEditorSeed({
    userId: session.user.id,
    threadId: threadId || null,
    draftId: draftId || null
  });

  const availableMembers = seed.participants.map((participant) => participant.user);

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardContent className="py-6">
          <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
            <FilePenLine size={12} className="mr-1" />
            Structured win
          </Badge>
          <h1 className="mt-4 font-display text-4xl text-foreground">
            {seed.id ? "Refine shared success" : "Capture a win cleanly"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            This is for real movement that happened inside the environment: a referral, a collaboration, a breakthrough, a useful connection, or a clearer decision that turned into action.
          </p>
        </CardContent>
      </Card>

      <WinForm
        seed={seed}
        availableMembers={availableMembers}
        returnPath={seed.id ? `/wins/new?draft=${seed.id}` : threadId ? `/wins/new?threadId=${threadId}` : "/wins/new"}
      />
    </div>
  );
}
