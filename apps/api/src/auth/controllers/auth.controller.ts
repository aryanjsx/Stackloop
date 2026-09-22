import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors.js';
import {
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  setCsrfCookie,
  type CookieConfig,
} from '../cookies.js';
import {
  githubCallbackSchema,
  githubLoginSchema,
  parseOrThrow,
  refreshSchema,
} from '../validators/auth.validator.js';
import type { AuthService } from '../services/auth.service.js';
import type { AuthUser, AuthTokens } from '../types.js';

export interface AuthControllerConfig extends CookieConfig {
  webAppOrigin: string;
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AuthControllerConfig,
  ) {}

  /** GET /auth/github/login — redirects the browser to GitHub's consent screen. */
  githubLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = parseOrThrow(githubLoginSchema, req.query);
      const { redirectUrl } = await this.authService.initiateLogin({
        returnTo: query.return_to ?? null,
      });

      res.redirect(302, redirectUrl);
    } catch (error) {
      next(error);
    }
  };

  /** GET /auth/github/callback — GitHub redirects here with a code and the state we issued. */
  githubCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = parseOrThrow(githubCallbackSchema, req.query);

      const result = await this.authService.completeLogin({
        code: query.code,
        state: query.state,
        userAgent: req.get('user-agent') ?? null,
        ipAddress: req.ip ?? null,
      });

      this.applySessionCookies(res, result.tokens);

      res.status(200).json({
        data: {
          user: serialiseUser(result.user),
          access_token: result.tokens.accessToken,
          refresh_token: result.tokens.refreshToken,
          expires_in: result.tokens.expiresIn,
          return_to: result.returnTo,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** POST /auth/refresh — rotates the refresh token and issues a new pair. */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = parseOrThrow(refreshSchema, req.body ?? {});

      // Browser clients hold the refresh token in an HttpOnly cookie and send no body;
      // API clients post it explicitly. The cookie is preferred so a stale body value cannot
      // override the live session cookie.
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? body.refresh_token;
      if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        throw new UnauthorizedError('A refresh token is required');
      }

      const result = await this.authService.refresh({ refreshToken });
      this.applySessionCookies(res, result.tokens);

      res.status(200).json({
        data: {
          access_token: result.tokens.accessToken,
          refresh_token: result.tokens.refreshToken,
          expires_in: result.tokens.expiresIn,
        },
      });
    } catch (error) {
      // A failed refresh leaves the client holding dead credentials; clearing them avoids a
      // retry loop against a revoked session.
      clearAuthCookies(res, this.config);
      next(error);
    }
  };

  /** POST /auth/logout — revokes the caller's own session. Requires authentication. */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const principal = req.principal;
      if (!principal) {
        throw new UnauthorizedError();
      }

      await this.authService.logout(principal);
      clearAuthCookies(res, this.config);

      res.status(200).json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  };

  /** GET /auth/me — returns the authenticated user. */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const principal = req.principal;
      if (!principal) {
        throw new UnauthorizedError();
      }

      res.status(200).json({
        data: {
          ...serialiseUser(principal.user),
          session_id: principal.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  private applySessionCookies(res: Response, tokens: AuthTokens): void {
    setAuthCookies(res, tokens, this.config);
    setCsrfCookie(res, randomBytes(32).toString('base64url'), this.config);
  }
}

function serialiseUser(user: AuthUser) {
  return {
    id: user.id,
    github_id: user.githubId,
    username: user.username,
    display_name: user.displayName,
    email: user.email,
    avatar_url: user.avatarUrl,
    role: user.role,
    is_verified: user.isVerified,
  };
}
