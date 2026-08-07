import { IncomingMessage, ServerResponse } from 'node:http';
import { ForbiddenError } from '../errors.js';

export function createAuthorizationMiddleware(requiredRole: string) {
  return function authorizationMiddleware(req: IncomingMessage & { user?: any }, res: ServerResponse, next: () => void) {
    if (!req.user || req.user.role !== requiredRole && req.user.role !== 'admin') {
      throw new ForbiddenError();
    }
    next();
  };
}
