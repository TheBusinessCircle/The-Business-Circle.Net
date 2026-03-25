import type { Metadata } from "next";
import { MembershipTier } from "@prisma/client";
import { ArrowDown, ArrowUp, Crown, Hash, MessageSquare, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  createChannelAction,
  deleteChannelAction,
  reorderChannelAction,
  updateChannelAction
} from "@/actions/admin/channel.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Channels",
  description:
    "Manage community channels, edit access tier and descriptions, and reorder channel priority.",
  path: "/admin/channels"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "channel-created": "Channel created successfully.",
    "channel-updated": "Channel updated successfully.",
    "channel-deleted": "Channel deleted successfully.",
    "channel-reordered": "Channel order updated."
  };

  const errorMap: Record<string, string> = {
    invalid: "The submitted channel payload was invalid.",
    "invalid-slug": "Please provide a valid channel name or slug.",
    "slug-exists": "That slug already exists for another channel.",
    "not-found": "The selected channel no longer exists."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function tierBadge(tier: MembershipTier) {
  if (tier === MembershipTier.CORE) {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldCheck size={12} />
        Core
      </Badge>
    );
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return (
      <Badge variant="outline" className="border-gold/45 bg-gold/15 text-gold">
        <Crown size={12} className="mr-1" />
        Inner Circle
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-emerald-200">
      Foundation
    </Badge>
  );
}

export default async function AdminChannelsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const returnPath = "/admin/channels";

  const channels = await db.channel.findMany({
    where: {
      isArchived: false
    },
    include: {
      _count: {
        select: {
          messages: true
        }
      }
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }]
  });

  const foundationCount = channels.filter(
    (channel) => channel.accessTier === MembershipTier.FOUNDATION
  ).length;
  const innerCircleCount = channels.filter(
    (channel) => channel.accessTier === MembershipTier.INNER_CIRCLE
  ).length;
  const coreCount = channels.filter(
    (channel) => channel.accessTier === MembershipTier.CORE
  ).length;
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <Hash size={12} className="mr-1" />
                Community Channel Operations
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">
                Channel Manager
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Create, edit, delete, and reorder channels with clear tier gating
                for Foundation, Inner Circle, and Core members.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-silver/35 bg-silver/10 text-silver">
                {channels.length} total channels
              </Badge>
              <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-emerald-200">
                {foundationCount} foundation
              </Badge>
              <Badge variant="outline" className="border-gold/45 bg-gold/15 text-gold">
                {innerCircleCount} inner circle
              </Badge>
              <Badge variant="secondary">
                {coreCount} core
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card
          className={
            feedback.type === "error"
              ? "border-red-500/40 bg-red-500/10"
              : "border-gold/30 bg-gold/10"
          }
        >
          <CardContent className="py-3">
            <p
              className={
                feedback.type === "error"
                  ? "text-sm text-red-200"
                  : "text-sm text-gold"
              }
            >
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Plus size={16} />
            Create Channel
          </CardTitle>
        <CardDescription>
            Add a new category and choose whether it belongs to Foundation,
            Inner Circle, or Core members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createChannelAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="returnPath" value={returnPath} />

            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input id="name" name="name" required placeholder="founder-strategy" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input id="slug" name="slug" placeholder="auto-from-name" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="What this channel is for and how members should use it."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessTier">Access Tier</Label>
              <Select
                id="accessTier"
                name="accessTier"
                defaultValue={MembershipTier.FOUNDATION}
              >
                <option value={MembershipTier.FOUNDATION}>
                  Foundation
                </option>
                <option value={MembershipTier.INNER_CIRCLE}>
                  Inner Circle
                </option>
                <option value={MembershipTier.CORE}>
                  Core
                </option>
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="submit">
                <Plus size={14} className="mr-1" />
                Create Channel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Channels</CardTitle>
          <CardDescription>
            Update names, descriptions, and tier access. Use move controls to
            reorder how channels appear in the member community sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {channels.length ? (
            channels.map((channel, index) => {
              const formId = `update-channel-${channel.id}`;
              const isFirst = index === 0;
              const isLast = index === channels.length - 1;

              return (
                <div
                  key={channel.id}
                  className="space-y-3 rounded-xl border border-border/80 bg-background/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        #{index + 1} {channel.name}
                      </p>
                      <p className="text-xs text-muted">/{channel.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tierBadge(channel.accessTier)}
                      <Badge
                        variant="outline"
                        className="border-border text-muted"
                      >
                        <MessageSquare size={12} className="mr-1" />
                        {channel._count.messages} messages
                      </Badge>
                    </div>
                  </div>

                  <form
                    id={formId}
                    action={updateChannelAction}
                    className="grid gap-3 md:grid-cols-2"
                  >
                    <input type="hidden" name="channelId" value={channel.id} />
                    <input type="hidden" name="returnPath" value={returnPath} />

                    <div className="space-y-2">
                      <Label htmlFor={`${channel.id}-name`}>Channel Name</Label>
                      <Input
                        id={`${channel.id}-name`}
                        name="name"
                        defaultValue={channel.name}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${channel.id}-slug`}>Slug</Label>
                      <Input
                        id={`${channel.id}-slug`}
                        name="slug"
                        defaultValue={channel.slug}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`${channel.id}-description`}>
                        Description
                      </Label>
                      <Textarea
                        id={`${channel.id}-description`}
                        name="description"
                        rows={2}
                        defaultValue={channel.description ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${channel.id}-accessTier`}>
                        Access Tier
                      </Label>
                      <Select
                        id={`${channel.id}-accessTier`}
                        name="accessTier"
                        defaultValue={channel.accessTier}
                      >
                        <option value={MembershipTier.FOUNDATION}>
                          Foundation
                        </option>
                        <option value={MembershipTier.INNER_CIRCLE}>
                          Inner Circle
                        </option>
                        <option value={MembershipTier.CORE}>
                          Core
                        </option>
                      </Select>
                    </div>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" form={formId} variant="outline" size="sm">
                      Save Changes
                    </Button>

                    <form action={reorderChannelAction}>
                      <input type="hidden" name="channelId" value={channel.id} />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={isFirst}
                      >
                        <ArrowUp size={13} className="mr-1" />
                        Move Up
                      </Button>
                    </form>

                    <form action={reorderChannelAction}>
                      <input type="hidden" name="channelId" value={channel.id} />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={isLast}
                      >
                        <ArrowDown size={13} className="mr-1" />
                        Move Down
                      </Button>
                    </form>

                    <form action={deleteChannelAction}>
                      <input type="hidden" name="channelId" value={channel.id} />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <Button type="submit" variant="danger" size="sm">
                        <Trash2 size={13} className="mr-1" />
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted">
              No channels yet. Create your first channel to open community
              discussion spaces.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

