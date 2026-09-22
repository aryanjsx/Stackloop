import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { CsrfTokenError } from '../errors.js';
import { CSRF_COOKIE } from '../cookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection for cookie-authenticated, state-changing requests.
 *
 * The check applies only when the browser supplied credentials ambiently via cookies. A caller
 * using an `Authorization: Bearer` header is not susceptible to CSRF, because a cross-site
 * attacker cannot cause that header to be attached.
 *
 * The previous version of this middleware was constructed but never mounted on any route, so it
 * protected nothing.
 */
export function csrfProtection(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];

    // No CSRF cookie means the request is not riding on an ambient browser session.
    if (typeof cookieToken !== 'string' || cookieToken.length === 0) {
      next();
      return;
    }

    const headerToken = req.get('x-csrf-token');
    if (typeof headerToken !== 'string' || headerToken.length === 0) {
      next(new CsrfTokenError());
      return;
    }

    if (!constantTimeEquals(headerToken, cookieToken)) {
      next(new CsrfTokenError());
      return;
    }

    next();
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
