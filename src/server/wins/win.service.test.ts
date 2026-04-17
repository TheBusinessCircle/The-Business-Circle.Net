import { WinCategory, WinParticipantStatus, WinStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  directMessageParticipant: {
    findUnique: vi.fn()
  },
  win: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  winParticipant: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  moderationAuditLog: {
    create: vi.fn()
  },
  $transaction: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

import { respondToWinCredit, saveWinDraft } from "@/server/wins/win.service";

describe("win service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes immediately when a win is posted without credited members", async () => {
    dbMock.win.findUnique.mockResolvedValue(null);

    const tx = {
      win: {
        create: vi.fn().mockResolvedValue({ id: "win_1", slug: "shared-success" }),
        update: vi.fn()
      },
      winParticipant: {
        upsert: vi.fn(),
        deleteMany: vi.fn()
      }
    };

    dbMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    await saveWinDraft({
      authorId: "user_1",
      title: "Shared success",
      summary: "A useful private conversation turned into a real outcome.",
      category: WinCategory.COLLABORATION,
      tagsInput: "collaboration, clarity",
      creditedUserIds: [],
      intent: "publish"
    });

    expect(tx.win.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WinStatus.PUBLISHED
        })
      })
    );
  });

  it("publishes a pending win once the final credited member approves", async () => {
    dbMock.winParticipant.findUnique.mockResolvedValue({
      id: "participant_1",
      role: "CREDITED",
      status: WinParticipantStatus.PENDING
    });

    const tx = {
      winParticipant: {
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([
          { role: "AUTHOR", status: WinParticipantStatus.APPROVED },
          { role: "CREDITED", status: WinParticipantStatus.APPROVED }
        ])
      },
      win: {
        update: vi.fn().mockResolvedValue({})
      }
    };

    dbMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    await respondToWinCredit({
      winId: "win_1",
      userId: "user_2",
      decision: "approve"
    });

    expect(tx.win.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WinStatus.PUBLISHED
        })
      })
    );
  });
});
