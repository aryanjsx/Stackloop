import type { PrismaClient } from '@prisma/client';
import type {
  CreateOAuthStateInput,
  OAuthStateRecord,
  OAuthStateRepository,
} from '../types.js';

export class PrismaOAuthStateRepository implements OAuthStateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateOAuthStateInput): Promise<void> {
    await this.prisma.oAuthState.create({
      data: {
        state: input.state,
        codeVerifier: input.codeVerifier,
        redirectUri: input.redirectUri,
        returnTo: input.returnTo,
        expiresAt: input.expiresAt,
      },
    });
  }

  /**
   * Consumes a state in a single conditional update. The `consumedAt: null` and `expiresAt`
   * predicates are part of the UPDATE, so two concurrent callbacks carrying the same state
   * cannot both succeed; the loser updates zero rows and gets null.
   */
  async consume(state: string, now: Date): Promise<OAuthStateRecord | null> {
    const result = await this.prisma.oAuthState.updateManyAndReturn({
      where: {
        state,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    const record = result[0];
    if (!record) {
      return null;
    }

    return {
      state: record.state,
      codeVerifier: record.codeVerifier,
      redirectUri: record.redirectUri,
      returnTo: record.returnTo,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
    };
  }

  /** Housekeeping for abandoned login attempts. */
  async deleteExpired(now: Date): Promise<number> {
    const { count } = await this.prisma.oAuthState.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return count;
  }
}
