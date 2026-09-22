import { randomUUID } from 'node:crypto';
import type {
  AuthUser,
  AuthUserRepository,
  CreateOAuthStateInput,
  CreateRefreshTokenInput,
  CreateSessionInput,
  GithubProfile,
  OAuthStateRecord,
  OAuthStateRepository,
  RefreshTokenRecord,
  RefreshTokenRepository,
  SessionRecord,
  SessionRepository,
} from '../../src/auth/types.js';

/**
 * In-memory implementations of the persistence ports, used only by tests.
 *
 * Production wires the Prisma-backed classes in `src/auth/repositories/`. These doubles exist so
 * HTTP behaviour can be exercised without a PostgreSQL instance; they mirror the conditional
 * update semantics that the Prisma implementations rely on for single-use state and
 * refresh-token reuse detection.
 */

export class InMemoryOAuthStateRepository implements OAuthStateRepository {
  private readonly records = new Map<string, OAuthStateRecord>();

  async create(input: CreateOAuthStateInput): Promise<void> {
    this.records.set(input.state, {
      state: input.state,
      codeVerifier: input.codeVerifier,
      redirectUri: input.redirectUri,
      returnTo: input.returnTo,
      expiresAt: input.expiresAt,
      consumedAt: null,
    });
  }

  async consume(state: string, now: Date): Promise<OAuthStateRecord | null> {
    const record = this.records.get(state);
    if (!record || record.consumedAt !== null || record.expiresAt <= now) {
      return null;
    }

    record.consumedAt = now;
    return { ...record };
  }

  async deleteExpired(now: Date): Promise<number> {
    let count = 0;
    for (const [key, record] of this.records) {
      if (record.expiresAt <= now) {
        this.records.delete(key);
        count += 1;
      }
    }
    return count;
  }
}

export class InMemorySessionRepository implements SessionRepository {
  readonly records = new Map<string, SessionRecord & { revokedReason: string | null }>();

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const record = {
      id: randomUUID(),
      userId: input.userId,
      provider: input.provider,
      expiresAt: input.expiresAt,
      revokedAt: null,
      revokedReason: null,
      lastActivityAt: new Date(),
    };
    this.records.set(record.id, record);
    return { ...record };
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const record = this.records.get(id);
    return record ? { ...record } : null;
  }

  async touch(id: string, at: Date): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.lastActivityAt = at;
    }
  }

  async revoke(id: string, reason: string, at: Date): Promise<void> {
    const record = this.records.get(id);
    if (record && record.revokedAt === null) {
      record.revokedAt = at;
      record.revokedReason = reason;
    }
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly records = new Map<string, RefreshTokenRecord>();

  async create(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: randomUUID(),
      sessionId: input.sessionId,
      tokenHash: input.tokenHash,
      jti: input.jti,
      expiresAt: input.expiresAt,
      usedAt: null,
      revokedAt: null,
    };
    this.records.set(record.id, record);
    return { ...record };
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    for (const record of this.records.values()) {
      if (record.tokenHash === tokenHash) {
        return { ...record };
      }
    }
    return null;
  }

  async markUsedIfUnused(id: string, at: Date): Promise<boolean> {
    const record = this.records.get(id);
    if (!record || record.usedAt !== null) {
      return false;
    }
    record.usedAt = at;
    return true;
  }

  async revokeAllForSession(sessionId: string, at: Date): Promise<void> {
    for (const record of this.records.values()) {
      if (record.sessionId === sessionId && record.revokedAt === null) {
        record.revokedAt = at;
      }
    }
  }
}

export class InMemoryAuthUserRepository implements AuthUserRepository {
  readonly users = new Map<string, AuthUser>();

  async findById(id: string): Promise<AuthUser | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async upsertFromGithub(profile: GithubProfile): Promise<AuthUser> {
    for (const user of this.users.values()) {
      if (user.githubId === profile.id) {
        // Mirrors the Prisma upsert: profile fields refresh, role is never taken from the
        // provider.
        const updated: AuthUser = {
          ...user,
          username: profile.login,
          displayName: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
        };
        this.users.set(user.id, updated);
        return { ...updated };
      }
    }

    const created: AuthUser = {
      id: randomUUID(),
      githubId: profile.id,
      username: profile.login,
      displayName: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      role: 'user',
      isActive: true,
      isVerified: true,
    };
    this.users.set(created.id, created);
    return { ...created };
  }

  /** Test affordance for exercising role and account-status branches. */
  setUser(user: AuthUser): void {
    this.users.set(user.id, user);
  }
}
