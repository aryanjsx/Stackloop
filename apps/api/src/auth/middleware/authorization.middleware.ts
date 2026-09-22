import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors.js';
import type { UserRole } from '../types.js';

/**
 * Role hierarchy from auth-security-spec.md section 9. A higher rank satisfies any requirement
 * at or below it.
 *
 * `moderator` sits alongside `maintainer` rather than above it: it is a content role, and the
 * spec lists it as a future addition. It is present so the type is exhaustive, not because the
 * role is granted anywhere yet.
 */
const ROLE_RANK: Record<UserRole, number> = {
  user: 1,
  moderator: 2,
  maintainer: 2,
  admin: 3,
};

export function requireRole(requiredRole: UserRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const principal = req.principal;

    // Ordering matters: an anonymous caller is unauthenticated (401), not merely forbidden
    // (403), and conflating them tells an attacker nothing useful but confuses real clients.
    if (!principal) {
      next(new UnauthorizedError());
      return;
    }

    if (ROLE_RANK[principal.user.role] < ROLE_RANK[requiredRole]) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
}
