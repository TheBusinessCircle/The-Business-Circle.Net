import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export function toPagination(options: PaginationOptions = {}): PaginationResult {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize
  };
}

export async function withDbTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction((tx) => operation(tx));
}

export function containsFilter(value: string | undefined): Prisma.StringFilter | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }

  return {
    contains: value.trim(),
    mode: "insensitive"
  };
}