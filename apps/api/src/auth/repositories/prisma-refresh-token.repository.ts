import type { PrismaClient } from '@prisma/client';
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../types.js';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const record = await this.prisma.refreshToken.create({
      data: {
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        jti: input.jti,
        expiresAt: input.expiresAt,
      },
    });

    return toRecord(record);
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return record ? toRecord(record) : null;
  }

  /**
   * Compare-and-set on `usedAt`. Two concurrent refreshes with the same token both reach this
   * point, but only one updates a row; the other sees zero and is treated as reuse. Doing the
   * check in the UPDATE predicate rather than a prior SELECT is what closes that race.
   */
  async markUsedIfUnused(id: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: at },
    });
    return count === 1;
  }

  async revokeAllForSession(sessionId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}

function toRecord(record: {
  id: string;
  sessionId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}): RefreshTokenRecord {
  return {
    id: record.id,
    sessionId: record.sessionId,
    tokenHash: record.tokenHash,
    jti: record.jti,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt,
    revokedAt: record.revokedAt,
  };
}
