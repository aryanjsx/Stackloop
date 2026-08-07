import { PrismaClient } from '@prisma/client';

export async function runTransaction<T>(prisma: PrismaClient, handler: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx: any) => handler(tx as unknown as PrismaClient));
}
