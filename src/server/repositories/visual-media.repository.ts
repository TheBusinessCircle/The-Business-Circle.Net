import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const visualMediaPlacementSelect = {
  id: true,
  key: true,
  label: true,
  page: true,
  section: true,
  variant: true,
  imageUrl: true,
  mobileImageUrl: true,
  desktopStorageKey: true,
  mobileStorageKey: true,
  storageProvider: true,
  altText: true,
  isActive: true,
  sortOrder: true,
  overlayStyle: true,
  objectPosition: true,
  focalPointX: true,
  focalPointY: true,
  adminHelperText: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.VisualMediaPlacementSelect;

export type VisualMediaPlacementRow = Prisma.VisualMediaPlacementGetPayload<{
  select: typeof visualMediaPlacementSelect;
}>;

export async function findVisualMediaPlacementByKey(
  key: string,
  client: DbClient = db
) {
  return client.visualMediaPlacement.findUnique({
    where: { key },
    select: visualMediaPlacementSelect
  });
}

export async function listVisualMediaPlacements(client: DbClient = db) {
  return client.visualMediaPlacement.findMany({
    orderBy: [{ page: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    select: visualMediaPlacementSelect
  });
}

export async function updateVisualMediaPlacementByKey(
  key: string,
  data: Prisma.VisualMediaPlacementUncheckedUpdateInput,
  client: DbClient = db
) {
  return client.visualMediaPlacement.update({
    where: { key },
    data,
    select: visualMediaPlacementSelect
  });
}

export async function deleteVisualMediaPlacementByKey(
  key: string,
  client: DbClient = db
) {
  return client.visualMediaPlacement.delete({
    where: { key },
    select: visualMediaPlacementSelect
  });
}

export async function upsertVisualMediaPlacement(
  input: Prisma.VisualMediaPlacementUncheckedCreateInput,
  update: Prisma.VisualMediaPlacementUncheckedUpdateInput,
  client: DbClient = db
) {
  return client.visualMediaPlacement.upsert({
    where: { key: input.key },
    create: input,
    update,
    select: visualMediaPlacementSelect
  });
}
