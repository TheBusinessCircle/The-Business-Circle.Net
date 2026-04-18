import { describe, expect, it } from "vitest";
import { buildReplyThreadMeta } from "@/lib/community-reply-thread";

describe("community reply thread metadata", () => {
  it("does not treat a first direct reply as a reply-to-reply event", () => {
    expect(
      buildReplyThreadMeta({
        user: {
          id: "user_root"
        },
        replies: [
          {
            user: {
              id: "user_reply"
            },
            replies: []
          }
        ]
      })
    ).toEqual({
      participantCount: 2,
      hasReplyToReplyEvent: false,
      maxDepth: 1,
      nestedReplyCount: 0
    });
  });

  it("marks a nested reply branch as real reply-to-reply discussion", () => {
    expect(
      buildReplyThreadMeta({
        user: {
          id: "user_root"
        },
        replies: [
          {
            user: {
              id: "user_reply"
            },
            replies: [
              {
                user: {
                  id: "user_nested"
                },
                replies: []
              }
            ]
          }
        ]
      })
    ).toEqual({
      participantCount: 3,
      hasReplyToReplyEvent: true,
      maxDepth: 2,
      nestedReplyCount: 1
    });
  });

  it("counts distinct participants across nested back-and-forth", () => {
    expect(
      buildReplyThreadMeta({
        user: {
          id: "user_root"
        },
        replies: [
          {
            user: {
              id: "user_reply"
            },
            replies: [
              {
                user: {
                  id: "user_root"
                },
                replies: [
                  {
                    user: {
                      id: "user_reply"
                    },
                    replies: []
                  }
                ]
              }
            ]
          }
        ]
      })
    ).toEqual({
      participantCount: 2,
      hasReplyToReplyEvent: true,
      maxDepth: 3,
      nestedReplyCount: 2
    });
  });
});
