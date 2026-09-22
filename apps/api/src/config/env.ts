import { z } from 'zod';

/**
 * Secrets that ship in example files and tutorials. Rejected outright in production so a
 * placeholder can never become a live signing key.
 */
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'local-development-secret',
  'change-me',
  'changeme',
  'secret',
  'your_secret_here',
]);

const MIN_SECRET_LENGTH = 32;

const secondsSchema = (fallback: number) =>
  z.coerce.number().int().positive().max(60 * 60 * 24 * 365).default(fallback);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WEB_APP_ORIGIN: z.url({ protocol: /^https?$/ }).default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_REDIRECT_URI: z.url({ protocol: /^https?$/ }),
  GITHUB_API_BASE_URL: z.url({ protocol: /^https?$/ }).default('https://api.github.com'),
  GITHUB_TOKEN: z.string().optional(),

  JWT_SIGNING_SECRET: z
    .string()
    .min(MIN_SECRET_LENGTH, `JWT_SIGNING_SECRET must be at least ${MIN_SECRET_LENGTH} characters`),
  JWT_ISSUER: z.string().min(1).default('stackloop'),
  JWT_AUDIENCE: z.string().min(1).default('stackloop-api'),

  ACCESS_TOKEN_TTL_SECONDS: secondsSchema(900),
  REFRESH_TOKEN_TTL_SECONDS: secondsSchema(60 * 60 * 24 * 30),
  OAUTH_STATE_TTL_SECONDS: secondsSchema(600),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  webAppOrigin: string;
  database: {
    url: string;
  };
  github: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    apiBaseUrl: string;
    token?: string;
  };
  auth: {
    signingSecret: string;
    issuer: string;
    audience: string;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    oauthStateTtlSeconds: number;
  };
}

export class ConfigurationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ConfigurationError';
    this.issues = issues;
  }
}

/**
 * Parses and validates configuration. Throws {@link ConfigurationError} listing every problem
 * at once rather than failing on the first, so a misconfigured environment can be fixed in a
 * single pass.
 *
 * Takes the environment as an argument rather than reading `process.env` directly so that it
 * is testable without mutating global state.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    throw new ConfigurationError(issues);
  }

  const value = parsed.data;
  const isProduction = value.NODE_ENV === 'production';
  const extraIssues: string[] = [];

  if (isProduction && KNOWN_PLACEHOLDER_SECRETS.has(value.JWT_SIGNING_SECRET.toLowerCase())) {
    extraIssues.push('JWT_SIGNING_SECRET is a known placeholder value and cannot be used in production');
  }

  if (isProduction && !value.GITHUB_REDIRECT_URI.startsWith('https://')) {
    extraIssues.push('GITHUB_REDIRECT_URI must use https in production');
  }

  if (isProduction && !value.WEB_APP_ORIGIN.startsWith('https://')) {
    extraIssues.push('WEB_APP_ORIGIN must use https in production');
  }

  if (value.REFRESH_TOKEN_TTL_SECONDS <= value.ACCESS_TOKEN_TTL_SECONDS) {
    extraIssues.push('REFRESH_TOKEN_TTL_SECONDS must be greater than ACCESS_TOKEN_TTL_SECONDS');
  }

  if (extraIssues.length > 0) {
    throw new ConfigurationError(extraIssues);
  }

  return {
    nodeEnv: value.NODE_ENV,
    isProduction,
    port: value.PORT,
    webAppOrigin: value.WEB_APP_ORIGIN,
    database: {
      url: value.DATABASE_URL,
    },
    github: {
      clientId: value.GITHUB_CLIENT_ID,
      clientSecret: value.GITHUB_CLIENT_SECRET,
      redirectUri: value.GITHUB_REDIRECT_URI,
      apiBaseUrl: value.GITHUB_API_BASE_URL,
      ...(value.GITHUB_TOKEN ? { token: value.GITHUB_TOKEN } : {}),
    },
    auth: {
      signingSecret: value.JWT_SIGNING_SECRET,
      issuer: value.JWT_ISSUER,
      audience: value.JWT_AUDIENCE,
      accessTokenTtlSeconds: value.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenTtlSeconds: value.REFRESH_TOKEN_TTL_SECONDS,
      oauthStateTtlSeconds: value.OAUTH_STATE_TTL_SECONDS,
    },
  };
}
