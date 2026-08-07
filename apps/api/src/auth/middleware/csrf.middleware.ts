import { IncomingMessage, ServerResponse } from 'node:http';

export function createCsrfMiddleware() {
  return function csrfMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.headers.cookie?.match(/csrf_token=([^;]+)/)?.[1];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: { code: 'CSRF_TOKEN_INVALID', message: 'CSRF token validation failed.' } }));
      return;
    }

    next();
  };
}
