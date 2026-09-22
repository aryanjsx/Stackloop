import type { PrismaClient } from '@prisma/client';
import type { CreateSessionInput, SessionRecord, SessionRepository } from '../types.js';

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const session = await this.prisma.session.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
    });

    return toRecord(session);
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    return session ? toRecord(session) : null;
  }

  async touch(id: string, at: Date): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { lastActivityAt: at },
    });
  }

  async revoke(id: string, reason: string, at: Date): Promise<void> {
    // updateMany rather than update so revoking an already-revoked or absent session is a
    // no-op instead of throwing.
    await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at, revokedReason: reason },
    });
  }
}

function toRecord(session: {
  id: string;
  userId: string;
  provider: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastActivityAt: Date;
}): SessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    provider: session.provider,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    lastActivityAt: session.lastActivityAt,
  };
}
