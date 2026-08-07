export type UserRole = 'user' | 'maintainer' | 'admin' | 'moderator';

export interface GithubProviderUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  provider: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  githubId: number;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
}

export interface LoginInitiationResult {
  redirectUrl: string;
  state: string;
}

export interface SessionRepository {
  create(session: AuthSession): Promise<AuthSession>;
  findById(id: string): Promise<AuthSession | null>;
  findActiveByUserId(userId: string): Promise<AuthSession | null>;
  findByRefreshTokenHash(hash: string): Promise<AuthSession | null>;
  update(session: AuthSession): Promise<AuthSession>;
  revoke(id: string): Promise<void>;
}

export interface StateRepository {
  save(state: string, redirectUri: string, codeChallenge: string): Promise<void>;
  consume(state: string): Promise<{ state: string; redirectUri: string; codeChallenge: string } | null>;
}

export interface JwtConfig {
  issuer: string;
  audience: string;
  signingSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}
