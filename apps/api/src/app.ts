import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { AuthController } from './auth/controllers/auth.controller.js';
import { createAuthRouter } from './auth/routes.js';
import type { AuthService } from './auth/services/auth.service.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export interface CreateAppOptions {
  authService: AuthService;
  isProduction: boolean;
  webAppOrigin: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  enableRateLimiting?: boolean;
  /** Set when running behind a reverse proxy so `req.ip` reflects the real client. */
  trustProxy?: boolean;
}

/**
 * Builds the HTTP application. Dependencies are injected rather than constructed here, so tests
 * can supply in-memory repositories and a stub OAuth provider while production wires Prisma and
 * the real GitHub client.
 *
 * Middleware order follows auth-security-spec.md section 18: transport hardening, body and
 * cookie parsing, then per-route authentication, authorisation, CSRF, and rate limiting.
 */
export function createApp(options: CreateAppOptions): Express {
  const app = express();

  if (options.trustProxy) {
    // Required for correct client IPs and for rate limiting to key on the real caller.
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(helmet());

  // A request body larger than this is never legitimate for these endpoints; the cap keeps a
  // trivially large payload from consuming memory.
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.status(200).json({ data: { status: 'ok' } });
  });

  const controller = new AuthController(options.authService, {
    isProduction: options.isProduction,
    webAppOrigin: options.webAppOrigin,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
  });

  app.use(
    '/auth',
    createAuthRouter({
      authService: options.authService,
      controller,
      enableRateLimiting: options.enableRateLimiting ?? true,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler({ isProduction: options.isProduction }));

  return app;
}
