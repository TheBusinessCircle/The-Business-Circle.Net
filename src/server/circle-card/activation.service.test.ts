import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadSource } from "@prisma/client";

const leadFindManyMock = vi.hoisted(() => vi.fn());
const leadFindFirstMock = vi.hoisted(() => vi.fn());
const leadUpdateMock = vi.hoisted(() => vi.fn());
const eventGroupByMock = vi.hoisted(() => vi.fn());
const eventCountMock = vi.hoisted(() => vi.fn());
const userFindUniqueMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const calculateCompletionMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findMany: leadFindManyMock,
      findFirst: leadFindFirstMock,
      update: leadUpdateMock
    },
    circleCardEvent: {
      groupBy: eventGroupByMock,
      count: eventCountMock
    },
    user: {
      findUnique: userFindUniqueMock
    }
  }
}));
vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: sendEmailMock
}));
vi.mock("@/emails/render", () => ({
  renderEmailHtml: vi.fn().mockResolvedValue("<p>Circle Card</p>")
}));
vi.mock("@/lib/circle-card/completion", () => ({
  calculateCircleCardCompletion: calculateCompletionMock
}));

import {
  sendDueCircleCardActivationReminders,
  sendDueCircleCardWeeklySummaries
} from "@/server/circle-card/activation.service";

const baseCard = {
  id: "card_circle_1",
  slug: "circle-owner",
  profileImageUrl: null,
  businessName: null,
  about: null,
  location: null,
  email: null,
  phone: null,
  websiteUrl: null,
  socialLinks: {},
  viewCount: 0,
  customLinks: []
};

const baseUser = {
  id: "user_circle_1",
  name: "Circle Owner",
  email: "owner@example.test",
  image: null,
  profile: null,
  circleCards: [baseCard],
  circleWalletContacts: []
};

describe("Circle Card scheduled email services", () => {
  beforeEach(() => {
    leadFindManyMock.mockReset();
    leadFindFirstMock.mockReset().mockResolvedValue(null);
    leadUpdateMock.mockReset();
    eventGroupByMock.mockReset().mockResolvedValue([]);
    eventCountMock.mockReset().mockResolvedValue(0);
    userFindUniqueMock.mockReset();
    sendEmailMock.mockReset().mockResolvedValue({ sent: true, skipped: false, id: "email_1" });
    calculateCompletionMock.mockReset().mockReturnValue({
      score: 45,
      activationLeadScore: 45,
      activationComplete: false,
      missingItems: [{ id: "profile", label: "Add profile details" }]
    });
  });

  it("sends an activation reminder once with Circle identity and canonical URLs", async () => {
    let metadata: Record<string, unknown> = {};
    leadFindManyMock.mockImplementation(async () => [
      {
        id: "lead_circle_1",
        name: baseUser.name,
        email: baseUser.email,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata,
        tags: [],
        user: baseUser
      }
    ]);
    leadUpdateMock.mockImplementation(async ({ data }) => {
      metadata = data.metadata;
      return { id: "lead_circle_1" };
    });

    const first = await sendDueCircleCardActivationReminders();
    const second = await sendDueCircleCardActivationReminders();

    expect(first).toMatchObject({ checked: 1, sent: 1 });
    expect(second).toMatchObject({ checked: 1, sent: 0, skipped: 1 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "circle-card",
        to: baseUser.email,
        subject: "Complete your Circle Card",
        text: expect.stringContaining("https://circlecard.co.uk/app")
      })
    );
    expect(sendEmailMock.mock.calls[0][0].text).not.toContain("thebusinesscircle.net");
    expect(leadFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: LeadSource.CIRCLE_CARD_SIGNUP,
          essentialConsent: true,
          userId: { not: null }
        })
      })
    );
  });

  it("does not mark an activation reminder sent when email delivery fails", async () => {
    leadFindManyMock.mockResolvedValue([
      {
        id: "lead_circle_1",
        name: baseUser.name,
        email: baseUser.email,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata: {},
        tags: [],
        user: baseUser
      }
    ]);
    sendEmailMock.mockResolvedValue({ sent: false, skipped: false, reason: "test failure" });

    const result = await sendDueCircleCardActivationReminders();

    expect(result).toMatchObject({ checked: 1, sent: 0, skipped: 1, failed: 1 });
    expect(leadUpdateMock).not.toHaveBeenCalled();
  });

  it("does not email a Circle user whose card is already activated", async () => {
    leadFindManyMock.mockResolvedValue([
      {
        id: "lead_circle_1",
        name: baseUser.name,
        email: baseUser.email,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata: {},
        tags: [],
        user: baseUser
      }
    ]);
    calculateCompletionMock.mockReturnValue({
      score: 90,
      activationLeadScore: 90,
      activationComplete: true,
      missingItems: []
    });

    const result = await sendDueCircleCardActivationReminders();

    expect(result).toMatchObject({ checked: 1, sent: 0, completed: 1 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends a weekly summary once per week with Circle identity and Circle data", async () => {
    let metadata: Record<string, unknown> = {};
    leadFindManyMock.mockImplementation(async () => [
      {
        id: "lead_circle_1",
        userId: baseUser.id,
        metadata,
        tags: []
      }
    ]);
    leadUpdateMock.mockImplementation(async ({ data }) => {
      metadata = data.metadata;
      return { id: "lead_circle_1" };
    });
    userFindUniqueMock.mockResolvedValue(baseUser);

    const first = await sendDueCircleCardWeeklySummaries();
    const second = await sendDueCircleCardWeeklySummaries();

    expect(first).toMatchObject({ checked: 1, sent: 1, skipped: 0 });
    expect(second).toMatchObject({ checked: 1, sent: 0, skipped: 1 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "circle-card",
        to: baseUser.email,
        subject: "Your Circle Card weekly summary",
        text: expect.stringContaining("https://circlecard.co.uk/card/circle-owner")
      })
    );
    expect(sendEmailMock.mock.calls[0][0].text).toContain("https://circlecard.co.uk/app");
    expect(sendEmailMock.mock.calls[0][0].text).not.toContain("thebusinesscircle.net");
    expect(leadFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: LeadSource.CIRCLE_CARD_SIGNUP,
          essentialConsent: true,
          userId: { not: null }
        })
      })
    );
  });

  it("does not persist weekly sent-state after an email transport failure", async () => {
    leadFindManyMock.mockResolvedValue([
      { id: "lead_circle_1", userId: baseUser.id, metadata: {}, tags: [] }
    ]);
    userFindUniqueMock.mockResolvedValue(baseUser);
    sendEmailMock.mockResolvedValue({ sent: false, skipped: false, reason: "test failure" });

    const result = await sendDueCircleCardWeeklySummaries();

    expect(result).toMatchObject({ checked: 1, sent: 0, skipped: 1, failed: 1 });
    expect(leadUpdateMock).not.toHaveBeenCalled();
  });
});
