import { OAuthExchangeError } from '../errors.js';
import type { GithubProfile } from '../types.js';

export interface GithubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
  /** Overridable so tests can point at a local stub instead of github.com. */
  oauthBaseUrl?: string;
}

export interface AuthorizationUrlParams {
  state: string;
  codeChallenge: string;
}

export interface GithubOAuthProvider {
  buildAuthorizationUrl(params: AuthorizationUrlParams): string;
  exchangeCode(input: { code: string; codeVerifier: string }): Promise<string>;
  fetchProfile(accessToken: string): Promise<GithubProfile>;
}

const DEFAULT_OAUTH_BASE_URL = 'https://github.com';
const SCOPES = 'read:user user:email';
const REQUEST_TIMEOUT_MS = 10_000;

interface GithubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
}

interface GithubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

export class HttpGithubOAuthProvider implements GithubOAuthProvider {
  private readonly oauthBaseUrl: string;

  constructor(private readonly config: GithubOAuthConfig) {
    this.oauthBaseUrl = config.oauthBaseUrl ?? DEFAULT_OAUTH_BASE_URL;
  }

  buildAuthorizationUrl({ state, codeChallenge }: AuthorizationUrlParams): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.oauthBaseUrl}/login/oauth/authorize?${params.toString()}`;
  }

  /** Exchanges an authorization code for a GitHub access token. Returns the token. */
  async exchangeCode({ code, codeVerifier }: { code: string; codeVerifier: string }): Promise<string> {
    const response = await this.request(`${this.oauthBaseUrl}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'stackloop',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!response.ok) {
      throw new OAuthExchangeError();
    }

    // GitHub answers 200 with an `error` field for a bad, expired, or already-redeemed code,
    // so a successful status is not sufficient here.
    const payload = (await response.json()) as { access_token?: string; error?: string };
    if (payload.error || typeof payload.access_token !== 'string' || payload.access_token.length === 0) {
      throw new OAuthExchangeError();
    }

    return payload.access_token;
  }

  async fetchProfile(accessToken: string): Promise<GithubProfile> {
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'stackloop',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const userResponse = await this.request(`${this.config.apiBaseUrl}/user`, { headers });
    if (!userResponse.ok) {
      throw new OAuthExchangeError('Could not read your GitHub profile');
    }
    const user = (await userResponse.json()) as GithubUserResponse;

    if (typeof user.id !== 'number' || typeof user.login !== 'string') {
      throw new OAuthExchangeError('GitHub returned an unexpected profile shape');
    }

    return {
      id: user.id,
      login: user.login,
      name: user.name ?? null,
      email: user.email ?? (await this.fetchPrimaryEmail(headers)),
      avatarUrl: user.avatar_url ?? null,
      bio: user.bio ?? null,
      company: user.company ?? null,
      location: user.location ?? null,
      websiteUrl: user.blog && user.blog.length > 0 ? user.blog : null,
    };
  }

  /**
   * A GitHub profile omits the email when the user has set it to private, so fall back to the
   * dedicated endpoint and take the verified primary address. A missing email is not fatal;
   * the account is identified by its GitHub id.
   */
  private async fetchPrimaryEmail(headers: Record<string, string>): Promise<string | null> {
    try {
      const response = await this.request(`${this.config.apiBaseUrl}/user/emails`, { headers });
      if (!response.ok) {
        return null;
      }

      const emails = (await response.json()) as GithubEmailResponse[];
      if (!Array.isArray(emails)) {
        return null;
      }

      const primary = emails.find((entry) => entry.primary && entry.verified);
      return primary?.email ?? null;
    } catch {
      return null;
    }
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch {
      // Network failure or timeout reaching GitHub.
      throw new OAuthExchangeError('GitHub could not be reached');
    }
  }
}
