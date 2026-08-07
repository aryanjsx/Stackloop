export class InMemorySessionRepository {
    sessions = new Map();
    async create(session) {
        this.sessions.set(session.id, session);
        return session;
    }
    async findById(id) {
        return this.sessions.get(id) ?? null;
    }
    async findActiveByUserId(userId) {
        for (const session of this.sessions.values()) {
            if (session.userId === userId && !session.revokedAt && session.expiresAt > new Date()) {
                return session;
            }
        }
        return null;
    }
    async findByRefreshTokenHash(hash) {
        for (const session of this.sessions.values()) {
            if (session.refreshTokenHash === hash) {
                return session;
            }
        }
        return null;
    }
    async update(session) {
        this.sessions.set(session.id, session);
        return session;
    }
    async revoke(id) {
        const session = this.sessions.get(id);
        if (session) {
            session.revokedAt = new Date();
            this.sessions.set(id, session);
        }
    }
}
