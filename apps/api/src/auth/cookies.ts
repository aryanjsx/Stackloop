import type { CookieOptions, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'stackloop_access_token';
export const REFRESH_TOKEN_COOKIE = 'stackloop_refresh_token';
export const CSRF_COOKIE = 'csrf_token';

/** Path the refresh cookie is scoped to, so it is not sent on every request. */
export const REFRESH_COOKIE_PATH = '/auth/refresh';

export interface CookieConfig {
  isProduction: boolean;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

function baseOptions(config: CookieConfig): CookieOptions {
  return {
    httpOnly: true,
    // Secure would make cookies unusable over plain http on localhost, so it tracks the
    // environment rather than being hardcoded.
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  config: CookieConfig,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseOptions(config),
    maxAge: config.accessTokenTtlSeconds * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseOptions(config),
    // Strict rather than Lax: a refresh must never ride along with a cross-site navigation.
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: config.refreshTokenTtlSeconds * 1000,
  });
}

/**
 * The CSRF cookie is deliberately readable by JavaScript. The double-submit pattern requires the
 * browser app to copy it into a request header, which proves the request came from a same-origin
 * script rather than from a cross-site form post. It carries no authority on its own.
 */
export function setCsrfCookie(res: Response, token: string, config: CookieConfig): void {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: config.refreshTokenTtlSeconds * 1000,
  });
}

export function clearAuthCookies(res: Response, config: CookieConfig): void {
  const options = baseOptions(config);
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...options, sameSite: 'strict', path: REFRESH_COOKIE_PATH });
  res.clearCookie(CSRF_COOKIE, { ...options, httpOnly: false });
}
