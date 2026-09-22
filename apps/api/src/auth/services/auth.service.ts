import {
  AccountDisabledError,
  InvalidRefreshTokenError,
  InvalidStateError,
  RefreshTokenReuseError,
  UnauthorizedError,
} from '../errors.js';
import { createCodeVerifier, createState, deriveChallenge } from '../pkce.js';
import { TokenService } from '../tokens/token.service.js';
import type { GithubOAuthProvider } from '../providers/github-oauth.provider.js';
import type {
  AuthUser,
  AuthUserRepository,
  AuthenticatedResult,
  LoginInitiation,
  OAuthStateRepository,
  RefreshTokenRepository,
  RequestPrincipal,
  SessionRepository,
} from '../types.js';

export interface AuthServiceDependencies {
  oauthStateRepository: OAuthStateRepository;
  sessionRepository: SessionRepository;
  refreshTokenRepository: RefreshTokenRepository;
  userRepository: AuthUserRepository;
  githubProvider: GithubOAuthProvider;
  tokenService: TokenService;
  oauthStateTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  /** Injectable so tests can control time deterministically. */
  now?: () => Date;
}

export interface CompleteLoginInput {
  code: string;
  state: string;
  userAgent: string | null;
  ipAddress: string | null;
}

export class AuthService {
  private readonly now: () => Date;

  constructor(private readonly deps: AuthServiceDependencies) {
    this.now = deps.now ?? (() => new Date());
  }

  /**
   * Starts a login. The PKCE verifier and the single-use state are persisted server-side; only
   * the derived challenge and the state leave the server.
   */
  async initiateLogin(input: { returnTo: string | null }): Promise<LoginInitiation> {
    const state = createState();
    const codeVerifier = createCodeVerifier();
    const expiresAt = new Date(this.now().getTime() + this.deps.oauthStateTtlSeconds * 1000);

    await this.deps.oauthStateRepository.create({
      state,
      codeVerifier,
      redirectUri: '',
      returnTo: input.returnTo,
      expiresAt,
    });

    return {
      redirectUrl: this.deps.githubProvider.buildAuthorizationUrl({
        state,
        codeChallenge: deriveChallenge(codeVerifier),
      }),
      state,
    };
  }

  /**
   * Completes a login. The state is validated and consumed *before* the authorization code is
   * exchanged, so a code injected by a third party is never presented to GitHub.
   */
  async completeLogin(input: CompleteLoginInput): Promise<AuthenticatedResult> {
    const now = this.now();

    const storedState = await this.deps.oauthStateRepository.consume(input.state, now);
    if (!storedState) {
      throw new InvalidStateError();
    }

    const providerToken = await this.deps.githubProvider.exchangeCode({
      code: input.code,
      codeVerifier: storedState.codeVerifier,
    });
    const profile = await this.deps.githubProvider.fetchProfile(providerToken);

    const user = await this.deps.userRepository.upsertFromGithub(profile, now);
    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    const session = await this.deps.sessionRepository.create({
      userId: user.id,
      provider: 'github',
      expiresAt: new Date(now.getTime() + this.deps.refreshTokenTtlSeconds * 1000),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    const tokens = await this.issueTokenPair(user, session.id);

    return {
      user,
      tokens,
      sessionId: session.id,
      returnTo: storedState.returnTo,
    };
  }

  /**
   * Rotates a refresh token. Every failure path is answered with the same error shape, so the
   * caller cannot distinguish "unknown token" from "expired" from "belongs to a dead session".
   *
   * Presenting a token that has already been rotated is treated as theft: the entire session is
   * revoked, which invalidates the attacker's token and the legitimate user's alike, forcing a
   * fresh sign-in.
   */
  async refresh(input: { refreshToken: string }): Promise<Omit<AuthenticatedResult, 'returnTo'>> {
    const now = this.now();

    const claims = await this.deps.tokenService.verifyRefreshToken(input.refreshToken).catch(() => {
      throw new InvalidRefreshTokenError();
    });

    const tokenHash = TokenService.hash(input.refreshToken);
    const stored = await this.deps.refreshTokenRepository.findByHash(tokenHash);
    if (!stored) {
      throw new InvalidRefreshTokenError();
    }

    // A token whose signature says one session but whose stored row says another indicates
    // tampering somewhere in the chain.
    if (stored.sessionId !== claims.sessionId) {
      await this.revokeSession(stored.sessionId, 'refresh_token_session_mismatch', now);
      throw new InvalidRefreshTokenError();
    }

    if (stored.usedAt !== null) {
      await this.revokeSession(stored.sessionId, 'refresh_token_reuse', now);
      throw new RefreshTokenReuseError();
    }

    if (stored.revokedAt !== null || stored.expiresAt <= now) {
      throw new InvalidRefreshTokenError();
    }

    const session = await this.deps.sessionRepository.findById(stored.sessionId);
    if (!session || session.revokedAt !== null || session.expiresAt <= now) {
      throw new InvalidRefreshTokenError();
    }

    // Compare-and-set. Losing this race means another request rotated the same token first,
    // which is the concurrent form of reuse.
    const claimed = await this.deps.refreshTokenRepository.markUsedIfUnused(stored.id, now);
    if (!claimed) {
      await this.revokeSession(stored.sessionId, 'refresh_token_reuse', now);
      throw new RefreshTokenReuseError();
    }

    const user = await this.deps.userRepository.findById(session.userId);
    if (!user) {
      await this.revokeSession(session.id, 'user_missing', now);
      throw new InvalidRefreshTokenError();
    }
    if (!user.isActive) {
      await this.revokeSession(session.id, 'account_disabled', now);
      throw new AccountDisabledError();
    }

    const tokens = await this.issueTokenPair(user, session.id);
    await this.deps.sessionRepository.touch(session.id, now);

    return { user, tokens, sessionId: session.id };
  }

  /**
   * Revokes the session identified by the caller's own access token.
   *
   * The session id comes from the verified token rather than the request body, which is what
   * prevents one user from revoking another user's session.
   */
  async logout(principal: RequestPrincipal): Promise<void> {
    await this.revokeSession(principal.sessionId, 'user_logout', this.now());
  }

  /**
   * Resolves an access token to a principal. A valid signature alone is not enough: the backing
   * session must still exist, be unrevoked, and be unexpired, and the account must be active.
   */
  async resolvePrincipal(accessToken: string, credentialSource: 'cookie' | 'bearer'): Promise<RequestPrincipal> {
    const now = this.now();
    const claims = await this.deps.tokenService.verifyAccessToken(accessToken);

    // Resolved by the session the token was issued for, not by user id. Looking up "any active
    // session for this user" would let a token outlive the session it belongs to.
    const session = await this.deps.sessionRepository.findById(claims.sessionId);
    if (!session || session.revokedAt !== null || session.expiresAt <= now) {
      throw new UnauthorizedError();
    }
    if (session.userId !== claims.userId) {
      throw new UnauthorizedError();
    }

    const user = await this.deps.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedError();
    }
    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    return { user, sessionId: session.id, credentialSource };
  }

  private async issueTokenPair(user: AuthUser, sessionId: string) {
    const subject = { userId: user.id, sessionId, role: user.role };

    const access = await this.deps.tokenService.issueAccessToken(subject);
    const refresh = await this.deps.tokenService.issueRefreshToken(subject);

    await this.deps.refreshTokenRepository.create({
      sessionId,
      tokenHash: TokenService.hash(refresh.token),
      jti: refresh.jti,
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresIn: access.expiresInSeconds,
    };
  }

  private async revokeSession(sessionId: string, reason: string, at: Date): Promise<void> {
    await this.deps.sessionRepository.revoke(sessionId, reason, at);
    await this.deps.refreshTokenRepository.revokeAllForSession(sessionId, at);
  }
}
