import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from '../errors.js';
import type { AuthService } from '../services/auth.service.js';
import { ACCESS_TOKEN_COOKIE } from '../cookies.js';

/**
 * Populates `req.principal` when the caller presents valid credentials.
 *
 * Unlike the previous implementation, this rejects rather than calling `next()` on failure, and
 * because it is mounted as real Express middleware the request genuinely stops here.
 */
export function requireAuth(authService: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const credentials = extractCredentials(req);
      if (!credentials) {
        throw new UnauthorizedError();
      }

      req.principal = await authService.resolvePrincipal(credentials.token, credentials.source);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Attaches a principal when credentials are present and valid, but allows anonymous access.
 * Invalid credentials are still rejected: silently downgrading a bad token to "anonymous" hides
 * expiry from clients and makes debugging misleading.
 */
export function optionalAuth(authService: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const credentials = extractCredentials(req);
      if (!credentials) {
        next();
        return;
      }

      req.principal = await authService.resolvePrincipal(credentials.token, credentials.source);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function extractCredentials(req: Request): { token: string; source: 'cookie' | 'bearer' } | null {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? { token, source: 'bearer' } : null;
  }

  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return { token: cookieToken, source: 'cookie' };
  }

  return null;
}
