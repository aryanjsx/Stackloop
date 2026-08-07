import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { InMemorySessionRepository } from './repositories/session.repository.js';
import { InMemoryStateRepository } from './repositories/state.repository.js';
import { AuthValidator } from './validators/auth.validator.js';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { createAuthorizationMiddleware } from './middleware/authorization.middleware.js';
import { createCsrfMiddleware } from './middleware/csrf.middleware.js';

export function createAuthServer() {
  const sessionRepository = new InMemorySessionRepository();
  const stateRepository = new InMemoryStateRepository();
  const authService = new AuthService({
    sessionRepository,
    stateRepository,
    issuer: process.env.JWT_ISSUER ?? 'stackloop',
    audience: process.env.JWT_AUDIENCE ?? 'stackloop-api',
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 30),
    signingSecret: process.env.JWT_SIGNING_SECRET ?? 'local-development-secret',
  });

  const controller = new AuthController(authService);
  const authMiddleware = createAuthMiddleware(authService);
  const adminMiddleware = createAuthorizationMiddleware('admin');
  const csrfMiddleware = createCsrfMiddleware();

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'https://api.stackloop.dev');

    try {
      if (url.pathname === '/auth/github/login') {
        AuthValidator.validateGithubLogin({ redirectUri: url.searchParams.get('redirect_uri') ?? undefined, state: url.searchParams.get('state') ?? undefined });
        await controller.handleGithubLogin(req, res);
        return;
      }

      if (url.pathname === '/auth/github/callback') {
        AuthValidator.validateGithubCallback({ code: req.headers['x-code']?.toString(), state: req.headers['x-state']?.toString() });
        await controller.handleGithubCallback(req, res);
        return;
      }

      if (url.pathname === '/auth/logout') {
        await controller.handleLogout(req, res);
        return;
      }

      if (url.pathname === '/auth/refresh') {
        AuthValidator.validateRefreshToken({ refreshToken: req.headers['x-refresh-token']?.toString() });
        await controller.handleRefresh(req, res);
        return;
      }

      if (url.pathname === '/auth/me') {
        await authMiddleware(req as IncomingMessage & { user?: any }, res, () => {});
        await controller.handleMe(req, res);
        return;
      }

      if (url.pathname === '/admin') {
        await authMiddleware(req as IncomingMessage & { user?: any }, res, () => {});
        adminMiddleware(req as IncomingMessage & { user?: any }, res, () => {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { ok: true } }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
    } catch (error) {
      const authError = error as Error & { statusCode?: number; code?: string };
      res.writeHead(authError.statusCode ?? 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: authError.code ?? 'INTERNAL_ERROR', message: authError.message ?? 'Unexpected error' } }));
    }
  });
}
