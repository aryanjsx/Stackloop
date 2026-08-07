import { IncomingMessage, ServerResponse } from 'node:http';
import { AuthService } from '../services/auth.service.js';
import { UnauthorizedError } from '../errors.js';

export function createAuthMiddleware(authService: AuthService) {
  return async function authMiddleware(req: IncomingMessage & { user?: any }, res: ServerResponse, next: () => void) {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      next();
      return;
    }

    const accessToken = authorization.slice('Bearer '.length);
    try {
      const session = await authService.validateSession({ accessToken });
      const user = await authService.getCurrentUser({ accessToken });
      req.user = user;
      req.user.sessionId = session?.id;
    } catch {
      throw new UnauthorizedError();
    }

    next();
  };
}
