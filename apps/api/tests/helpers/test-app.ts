import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { AuthService } from '../../src/auth/services/auth.service.js';
import { TokenService } from '../../src/auth/tokens/token.service.js';
import type {
  AuthorizationUrlParams,
  GithubOAuthProvider,
} from '../../src/auth/providers/github-oauth.provider.js';
import type { GithubProfile } from '../../src/auth/types.js';
import {
  InMemoryAuthUserRepository,
  InMemoryOAuthStateRepository,
  InMemoryRefreshTokenRepository,
  InMemorySessionRepository,
} from './in-memory-repositories.js';

export const TEST_SECRET = 'test-signing-secret-that-is-long-enough-32';

export const TEST_PROFILE: GithubProfile = {
  id: 4242,
  login: 'octocat',
  name: 'The Octocat',
  email: 'octocat@github.com',
  avatarUrl: 'https://avatars.githubusercontent.com/u/4242',
  bio: null,
  company: null,
  location: null,
  websiteUrl: null,
};

/**
 * Stands in for GitHub. Records what it was asked for so tests can assert that the API sends the
 * right parameters, and can be told to fail to exercise the error paths.
 */
export class StubGithubProvider implements GithubOAuthProvider {
  lastAuthorizationParams: AuthorizationUrlParams | null = null;
  lastExchange: { code: string; codeVerifier: string } | null = null;
  exchangeCallCount = 0;
  profile: GithubProfile = TEST_PROFILE;
  failExchange = false;

  buildAuthorizationUrl(params: AuthorizationUrlParams): string {
    this.lastAuthorizationParams = params;
    const search = new URLSearchParams({
      client_id: 'test-client-id',
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://github.com/login/oauth/authorize?${search.toString()}`;
  }

  async exchangeCode(input: { code: string; codeVerifier: string }): Promise<string> {
    this.exchangeCallCount += 1;
    this.lastExchange = input;
    if (this.failExchange) {
      const { OAuthExchangeError } = await import('../../src/auth/errors.js');
      throw new OAuthExchangeError();
    }
    return 'github-access-token';
  }

  async fetchProfile(): Promise<GithubProfile> {
    return this.profile;
  }
}

export interface TestHarness {
  app: Express;
  authService: AuthService;
  tokenService: TokenService;
  github: StubGithubProvider;
  oauthStates: InMemoryOAuthStateRepository;
  sessions: InMemorySessionRepository;
  refreshTokens: InMemoryRefreshTokenRepository;
  users: InMemoryAuthUserRepository;
  /** Advances the clock the service sees, for expiry tests. */
  advanceSeconds(seconds: number): void;
}

export function createTestHarness(
  overrides: { accessTokenTtlSeconds?: number; oauthStateTtlSeconds?: number } = {},
): TestHarness {
  const accessTokenTtlSeconds = overrides.accessTokenTtlSeconds ?? 900;
  const refreshTokenTtlSeconds = 2592000;

  let offsetMs = 0;
  const now = () => new Date(Date.now() + offsetMs);

  const oauthStates = new InMemoryOAuthStateRepository();
  const sessions = new InMemorySessionRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const users = new InMemoryAuthUserRepository();
  const github = new StubGithubProvider();

  const tokenService = new TokenService({
    signingSecret: TEST_SECRET,
    issuer: 'stackloop',
    audience: 'stackloop-api',
    accessTokenTtlSeconds,
    refreshTokenTtlSeconds,
  });

  const authService = new AuthService({
    oauthStateRepository: oauthStates,
    sessionRepository: sessions,
    refreshTokenRepository: refreshTokens,
    userRepository: users,
    githubProvider: github,
    tokenService,
    oauthStateTtlSeconds: overrides.oauthStateTtlSeconds ?? 600,
    refreshTokenTtlSeconds,
    now,
  });

  const app = createApp({
    authService,
    isProduction: false,
    webAppOrigin: 'http://localhost:3000',
    accessTokenTtlSeconds,
    refreshTokenTtlSeconds,
    // Off by default: the suite issues many requests to the same endpoints, which would
    // otherwise trip the limiter and mask the behaviour under test.
    enableRateLimiting: false,
  });

  return {
    app,
    authService,
    tokenService,
    github,
    oauthStates,
    sessions,
    refreshTokens,
    users,
    advanceSeconds(seconds: number) {
      offsetMs += seconds * 1000;
    },
  };
}

/** Reads the Location header of a redirect, failing loudly if the response was not one. */
export function redirectLocation(response: { headers: Record<string, unknown> }): URL {
  const location = response.headers['location'];
  if (typeof location !== 'string') {
    throw new Error('Expected the response to carry a Location header');
  }
  return new URL(location);
}

/** Extracts a cookie value from a set-cookie header list. */
export function readCookie(setCookie: string[] | undefined, name: string): string | null {
  if (!setCookie) {
    return null;
  }
  for (const entry of setCookie) {
    const match = new RegExp(`^${name}=([^;]*)`).exec(entry);
    if (match && match[1] !== undefined) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

export function cookieAttributes(setCookie: string[] | undefined, name: string): string | null {
  if (!setCookie) {
    return null;
  }
  return setCookie.find((entry) => entry.startsWith(`${name}=`)) ?? null;
}
