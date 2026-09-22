export type UserRole = 'user' | 'maintainer' | 'admin' | 'moderator';

export const USER_ROLES: readonly UserRole[] = ['user', 'maintainer', 'admin', 'moderator'];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/** A GitHub account as returned by the provider, normalised to our naming. */
export interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  websiteUrl: string | null;
}

export interface AuthUser {
  id: string;
  githubId: number;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  provider: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastActivityAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  sessionId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}

export interface OAuthStateRecord {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  returnTo: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface CreateSessionInput {
  userId: string;
  provider: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface CreateRefreshTokenInput {
  sessionId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
}

export interface CreateOAuthStateInput {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  returnTo: string | null;
  expiresAt: Date;
}

/**
 * Persistence ports. The production implementations are Prisma-backed; tests substitute
 * in-memory doubles so HTTP behaviour can be exercised without a database.
 */

export interface OAuthStateRepository {
  create(input: CreateOAuthStateInput): Promise<void>;
  /**
   * Atomically marks a state consumed and returns it, but only if it was previously unconsumed
   * and has not expired. Returns null otherwise, so a replayed or stale state cannot be reused.
   */
  consume(state: string, now: Date): Promise<OAuthStateRecord | null>;
  deleteExpired(now: Date): Promise<number>;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<SessionRecord>;
  findById(id: string): Promise<SessionRecord | null>;
  touch(id: string, at: Date): Promise<void>;
  revoke(id: string, reason: string, at: Date): Promise<void>;
}

export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /**
   * Conditionally marks a token used. Returns false if it was already used, which under
   * concurrency is the signal that the token is being replayed.
   */
  markUsedIfUnused(id: string, at: Date): Promise<boolean>;
  revokeAllForSession(sessionId: string, at: Date): Promise<void>;
}

export interface AuthUserRepository {
  findById(id: string): Promise<AuthUser | null>;
  upsertFromGithub(profile: GithubProfile, at: Date): Promise<AuthUser>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedResult {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
  returnTo: string | null;
}

export interface LoginInitiation {
  redirectUrl: string;
  state: string;
}

/** Request context attached by the authentication middleware. */
export interface RequestPrincipal {
  user: AuthUser;
  sessionId: string;
  /** How the caller presented credentials. Drives whether CSRF checks apply. */
  credentialSource: 'cookie' | 'bearer';
}
