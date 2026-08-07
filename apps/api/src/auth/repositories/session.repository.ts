import { AuthSession, SessionRepository } from '../types.js';

export class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, AuthSession>();

  async create(session: AuthSession): Promise<AuthSession> {
    this.sessions.set(session.id, session);
    return session;
  }

  async findById(id: string): Promise<AuthSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findActiveByUserId(userId: string): Promise<AuthSession | null> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt && session.expiresAt > new Date()) {
        return session;
      }
    }
    return null;
  }

  async findByRefreshTokenHash(hash: string): Promise<AuthSession | null> {
    for (const session of this.sessions.values()) {
      if (session.refreshTokenHash === hash) {
        return session;
      }
    }
    return null;
  }

  async update(session: AuthSession): Promise<AuthSession> {
    this.sessions.set(session.id, session);
    return session;
  }

  async revoke(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.revokedAt = new Date();
      this.sessions.set(id, session);
    }
  }
}
