import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { AuthController } from './controllers/auth.controller.js';
import type { AuthService } from './services/auth.service.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';

export interface AuthRouterOptions {
  authService: AuthService;
  controller: AuthController;
  /** Disabled in tests, where repeated requests would otherwise trip the limiter. */
  enableRateLimiting?: boolean;
}

/**
 * Rate limits on the authentication endpoints, per auth-security-spec.md section 17.
 * Login and callback are grouped: both start work on behalf of an unauthenticated caller.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' } },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many refresh attempts. Try again later.' } },
});

export function createAuthRouter({
  authService,
  controller,
  enableRateLimiting = true,
}: AuthRouterOptions): Router {
  const router = Router();
  const noop = (_req: unknown, _res: unknown, next: () => void) => next();

  const login = enableRateLimiting ? loginLimiter : noop;
  const refresh = enableRateLimiting ? refreshLimiter : noop;

  router.get('/github/login', login, controller.githubLogin);
  router.get('/github/callback', login, controller.githubCallback);

  // Refresh is deliberately not behind requireAuth: the whole point is that the access token
  // may already have expired. The refresh token itself is the credential.
  router.post('/refresh', refresh, csrfProtection(), controller.refresh);

  // Logout takes the session from the verified token, never from the request body.
  router.post('/logout', csrfProtection(), requireAuth(authService), controller.logout);

  router.get('/me', requireAuth(authService), controller.me);

  return router;
}
