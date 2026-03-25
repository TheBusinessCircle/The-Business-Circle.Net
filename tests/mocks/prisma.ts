import { vi } from "vitest";

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export function createPrismaMock() {
  const tx = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    subscription: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn()
    },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn()
    },
    session: {
      deleteMany: vi.fn()
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn()
    }
  };

  const mock = {
    ...tx,
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx))
  };

  return mock;
}
