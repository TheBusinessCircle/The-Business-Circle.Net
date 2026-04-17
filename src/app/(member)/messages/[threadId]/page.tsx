import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Flag,
  FolderArchive,
  FolderOpen,
  MessageSquareLock,
  ShieldBan,
  Volume2,
  VolumeX
} from "lucide-react";
import {
  archiveDirectMessageThreadAction,
  blockDirectMessageUserAction,
  muteDirectMessageThreadAction,
  reportDirectMessageAction,
  updateDirectMessageCollaborationAction
} from "@/actions/messages/messages.actions";
import {
  DirectMessageAttachmentView,
  DirectMessageComposer,
  MessagesRealtimeRefresh
} from "@/components/messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import {
  getDirectMessageThreadDetail,
  markDirectMessageThreadRead
} from "@/server/messages";

type PageProps = {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Private chat",
  description: "A private member conversation inside The Business Circle Network.",
  path: "/messages/thread",
  noIndex: true
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "request-accepted": "Private chat is now open.",
    "chat-muted": "Notifications for this conversation are muted.",
    "chat-unmuted": "Notifications for this conversation are active again.",
    "collaboration-updated": "Collaboration state has been updated.",
    "user-blocked": "That member has been blocked from private chat.",
    "report-submitted": "Your report has been submitted."
  };

  const errorMap: Record<string, string> = {
    "thread-update-failed": "We could not update that conversation right now.",
    "block-failed": "We could not block that member right now.",
    "report-failed": "We could not submit that report."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function DirectMessageThreadPage({ params, searchParams }: PageProps) {
  const session = await requireUser();
  const { threadId } = await params;
  const resolvedSearchParams = await searchParams;

  await markDirectMessageThreadRead({
    threadId,
    userId: session.user.id
  }).catch(() => null);

  const thread = await getDirectMessageThreadDetail({
    threadId,
    userId: session.user.id
  });

  if (!thread) {
    redirect("/messages?error=thread-not-found");
  }

  const feedback = feedbackMessage({
    notice: firstValue(resolvedSearchParams.notice),
    error: firstValue(resolvedSearchParams.error)
  });

  const composerDisabled = thread.isBlockedByViewer || thread.hasBlockedViewer;
  const composerDisabledMessage = thread.isBlockedByViewer
    ? "You have blocked this member, so this private chat is read-only."
    : thread.hasBlockedViewer
      ? "This member is not available for further private replies."
      : null;

  return (
    <div className="space-y-6">
      <MessagesRealtimeRefresh userId={session.user.id} threadId={thread.id} />

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/35 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-100" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                    <MessageSquareLock size={12} className="mr-1" />
                    Private chat
                  </Badge>
                  <CardTitle className="mt-3 font-display text-3xl">
                    {thread.otherMember.name ?? thread.otherMember.email}
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-3xl text-base">
                    {thread.otherMember.companyName || thread.otherMember.headline || "Member conversation"}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={archiveDirectMessageThreadAction}>
                    <input type="hidden" name="threadId" value={thread.id} />
                    <input type="hidden" name="archived" value={thread.isArchived ? "false" : "true"} />
                    <input type="hidden" name="returnPath" value={`/messages/${thread.id}`} />
                    <Button type="submit" variant="outline" size="sm">
                      {thread.isArchived ? <FolderOpen size={14} className="mr-2" /> : <FolderArchive size={14} className="mr-2" />}
                      {thread.isArchived ? "Restore chat" : "Archive chat"}
                    </Button>
                  </form>

                  <form action={muteDirectMessageThreadAction}>
                    <input type="hidden" name="threadId" value={thread.id} />
                    <input type="hidden" name="muted" value={thread.isMuted ? "false" : "true"} />
                    <input type="hidden" name="returnPath" value={`/messages/${thread.id}`} />
                    <Button type="submit" variant="outline" size="sm">
                      {thread.isMuted ? <Volume2 size={14} className="mr-2" /> : <VolumeX size={14} className="mr-2" />}
                      {thread.isMuted ? "Unmute" : "Mute"}
                    </Button>
                  </form>
                </div>
              </div>

              {thread.origin?.href ? (
                <Link
                  href={thread.origin.href}
                  className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
                >
                  Jump back to the original community context
                  <ArrowUpRight size={14} />
                </Link>
              ) : null}
            </CardHeader>
          </Card>

          <Card className="border-silver/16 bg-card/72">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                Use this space for the practical next step, the working context, and the detail that did not belong in the public room.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {thread.messages.length ? (
                thread.messages.map((message) => {
                  const isOwn = message.senderId === session.user.id;
                  const isReportable = !isOwn && message.messageType !== "SYSTEM";

                  return (
                    <article key={message.id} id={`message-${message.id}`} className={`rounded-[24px] border px-4 py-4 ${isOwn ? "border-gold/24 bg-gold/10" : "border-silver/14 bg-background/18"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {message.sender.name ?? message.sender.email}
                          </p>
                          <p className="mt-1 text-xs text-muted">{formatDate(message.createdAt)}</p>
                        </div>
                        {isReportable ? (
                          <details className="text-right">
                            <summary className="cursor-pointer text-xs text-muted">Report message</summary>
                            <form action={reportDirectMessageAction} className="mt-3 w-72 space-y-2 rounded-2xl border border-silver/14 bg-background/18 p-3 text-left">
                              <input type="hidden" name="messageId" value={message.id} />
                              <input type="hidden" name="returnPath" value={`/messages/${thread.id}`} />
                              <div className="space-y-2">
                                <Label htmlFor={`message-reason-${message.id}`}>Reason</Label>
                                <Select id={`message-reason-${message.id}`} name="reason" defaultValue="OTHER">
                                  <option value="SPAM">Spam</option>
                                  <option value="ABUSE">Abuse</option>
                                  <option value="HARASSMENT">Harassment</option>
                                  <option value="INAPPROPRIATE_FILE">Inappropriate file</option>
                                  <option value="OTHER">Other</option>
                                </Select>
                              </div>
                              <Input name="detail" placeholder="Optional detail" />
                              <Button type="submit" variant="outline" size="sm">
                                <Flag size={13} className="mr-2" />
                                Submit
                              </Button>
                            </form>
                          </details>
                        ) : null}
                      </div>

                      {message.content ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/92">
                          {message.content}
                        </p>
                      ) : null}

                      {message.attachments.length ? (
                        <div className="mt-4 space-y-3">
                          {message.attachments.map((attachment) => (
                            <DirectMessageAttachmentView key={attachment.id} attachment={attachment} />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <EmptyState
                  icon={MessageSquareLock}
                  title="No replies yet"
                  description="This private thread has been opened, but the practical follow-through has not started yet."
                />
              )}
            </CardContent>
          </Card>

          <DirectMessageComposer
            threadId={thread.id}
            disabled={composerDisabled}
            disabledMessage={composerDisabledMessage}
          />
        </div>

        <aside className="space-y-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Collaboration</CardTitle>
              <CardDescription>
                Keep the thread lightweight. Mark the stage, note the important shift, and move the outcome into Wins when it is real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={updateDirectMessageCollaborationAction} className="space-y-3">
                <input type="hidden" name="threadId" value={thread.id} />
                <input type="hidden" name="returnPath" value={`/messages/${thread.id}`} />
                <div className="space-y-2">
                  <Label htmlFor="collaborationStatus">Stage</Label>
                  <Select id="collaborationStatus" name="collaborationStatus" defaultValue={thread.collaborationStatus}>
                    <option value="EXPLORING">Exploring</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="COMPLETED">Completed</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collaborationNotes">Notes</Label>
                  <Textarea
                    id="collaborationNotes"
                    name="collaborationNotes"
                    rows={4}
                    defaultValue={thread.collaborationNotes ?? ""}
                    placeholder="Keep a light note on what is moving here."
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full">
                  Mark as collaboration
                </Button>
              </form>

              <div className="space-y-2 border-t border-silver/12 pt-4">
                <Link href={thread.latestDraftWinId ? `/wins/new?draft=${thread.latestDraftWinId}` : `/wins/new?threadId=${thread.id}`}>
                  <Button variant="outline" className="w-full justify-center">
                    Create win draft
                  </Button>
                </Link>
                <Link href={thread.latestDraftWinId ? `/wins/new?draft=${thread.latestDraftWinId}` : `/wins/new?threadId=${thread.id}`}>
                  <Button className="w-full justify-center">
                    Post a win
                  </Button>
                </Link>
              </div>

              <div className="space-y-2 border-t border-silver/12 pt-4">
                <p className="text-sm font-medium text-foreground">
                  {thread.otherMember.name ?? thread.otherMember.email}
                </p>
                <p className="text-xs text-muted">
                  {thread.otherMember.companyName || thread.otherMember.headline || "Member profile"}
                </p>
                <Link href={`/members/${thread.otherMember.id}`}>
                  <Button variant="ghost" className="w-full justify-center">
                    View profile
                  </Button>
                </Link>
              </div>

              <div className="space-y-3 border-t border-silver/12 pt-4">
                <form action={blockDirectMessageUserAction} className="space-y-2">
                  <input type="hidden" name="blockedUserId" value={thread.otherMember.id} />
                  <input type="hidden" name="returnPath" value={`/messages/${thread.id}`} />
                  <Button type="submit" variant="ghost" className="w-full justify-center">
                    <ShieldBan size={14} className="mr-2" />
                    Block user
                  </Button>
                </form>

                <details className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Report conversation
                  </summary>
                  <form action={reportDirectMessageAction} className="mt-4 space-y-3">
                    <input type="hidden" name="threadId" value={thread.id} />
                    <input type="hidden" name="returnPath" value={`/messages/${thread.id}`} />
                    <div className="space-y-2">
                      <Label htmlFor="thread-reason">Reason</Label>
                      <Select id="thread-reason" name="reason" defaultValue="OTHER">
                        <option value="SPAM">Spam</option>
                        <option value="ABUSE">Abuse</option>
                        <option value="HARASSMENT">Harassment</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </div>
                    <Textarea name="detail" rows={3} placeholder="What should the team review?" />
                    <Button type="submit" variant="outline" className="w-full justify-center">
                      <Flag size={14} className="mr-2" />
                      Submit report
                    </Button>
                  </form>
                </details>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
