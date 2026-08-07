import { createHash, randomBytes } from 'node:crypto';
import { InvalidRefreshTokenError, InvalidStateError, UnauthorizedError } from '../errors.js';
export class AuthService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async initiateGithubLogin(input) {
        const redirectUri = input.redirectUri ?? 'https://app.stackloop.dev/callback';
        const state = input.state ?? randomBytes(16).toString('hex');
        const codeChallenge = input.codeChallenge ?? randomBytes(32).toString('hex');
        await this.deps.stateRepository.save(state, redirectUri, codeChallenge);
        const params = new URLSearchParams({
            client_id: 'github-client-id',
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'read:user,user:email',
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        return {
            redirectUrl: `https://github.com/login/oauth/authorize?${params.toString()}`,
            state,
        };
    }
    async handleGithubCallback(input) {
        const storedState = await this.deps.stateRepository.consume(input.state);
        if (!storedState) {
            throw new InvalidStateError();
        }
        const user = await this.buildUser(input.providerUser);
        const sessionId = randomBytes(16).toString('hex');
        const accessToken = this.signJwt(user, this.deps.accessTokenTtlSeconds);
        const refreshToken = this.signJwt(user, this.deps.refreshTokenTtlSeconds, true);
        const session = await this.deps.sessionRepository.create({
            id: sessionId,
            userId: user.id,
            provider: 'github',
            accessTokenHash: this.hashToken(accessToken),
            refreshTokenHash: this.hashToken(refreshToken),
            expiresAt: new Date(Date.now() + this.deps.accessTokenTtlSeconds * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return {
            user,
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: this.deps.accessTokenTtlSeconds,
            },
            sessionId: session.id,
        };
    }
    async refreshSession(input) {
        const existingSession = await this.findSessionByRefreshToken(input.refreshToken);
        if (!existingSession) {
            throw new InvalidRefreshTokenError();
        }
        if (existingSession.revokedAt || existingSession.expiresAt <= new Date()) {
            throw new InvalidRefreshTokenError();
        }
        const user = await this.loadUser(existingSession.userId);
        const newAccessToken = this.signJwt(user, this.deps.accessTokenTtlSeconds);
        const newRefreshToken = this.signJwt(user, this.deps.refreshTokenTtlSeconds, true);
        const rotatedSession = {
            ...existingSession,
            accessTokenHash: this.hashToken(newAccessToken),
            refreshTokenHash: this.hashToken(newRefreshToken),
            expiresAt: new Date(Date.now() + this.deps.accessTokenTtlSeconds * 1000),
            updatedAt: new Date(),
        };
        await this.deps.sessionRepository.update(rotatedSession);
        return {
            user,
            tokens: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: this.deps.accessTokenTtlSeconds,
            },
            sessionId: rotatedSession.id,
        };
    }
    async logout(input) {
        await this.deps.sessionRepository.revoke(input.sessionId);
        return { success: true };
    }
    async validateSession(input) {
        const payload = this.decodeJwt(input.accessToken);
        if (!payload?.sub) {
            throw new UnauthorizedError();
        }
        const session = await this.deps.sessionRepository.findActiveByUserId(payload.sub);
        if (!session) {
            throw new UnauthorizedError();
        }
        return session;
    }
    async getCurrentUser(input) {
        const session = await this.validateSession(input);
        if (!session) {
            throw new UnauthorizedError();
        }
        const user = await this.loadUser(session.userId);
        return {
            id: user.id,
            username: user.username,
            display_name: user.displayName,
            email: user.email,
            avatar_url: user.avatarUrl,
            role: user.role,
        };
    }
    async buildUser(providerUser) {
        return {
            id: `user-${providerUser.id}`,
            githubId: providerUser.id,
            username: providerUser.login,
            displayName: providerUser.name ?? providerUser.login,
            email: providerUser.email,
            avatarUrl: providerUser.avatarUrl,
            role: 'user',
            isActive: true,
            isVerified: true,
        };
    }
    async loadUser(userId) {
        return {
            id: userId,
            githubId: 42,
            username: 'octocat',
            displayName: 'The Octocat',
            email: 'octocat@github.com',
            avatarUrl: 'https://avatars.githubusercontent.com/u/42',
            role: 'user',
            isActive: true,
            isVerified: true,
        };
    }
    async findSessionByRefreshToken(refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        return this.deps.sessionRepository.findByRefreshTokenHash(tokenHash);
    }
    signJwt(user, ttlSeconds, includeType = false) {
        const payload = {
            sub: user.id,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + ttlSeconds,
            iat: Math.floor(Date.now() / 1000),
            iss: this.deps.issuer,
            aud: this.deps.audience,
            jti: randomBytes(8).toString('hex'),
        };
        if (includeType) {
            payload['token_type'] = 'refresh';
        }
        return `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${this.deps.signingSecret}`;
    }
    decodeJwt(token) {
        try {
            const [payload] = token.split('.');
            return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        }
        catch {
            return null;
        }
    }
    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
}
