import type { RequestPrincipal } from '../auth/types.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by the authentication middleware. Absent on anonymous requests. */
      principal?: RequestPrincipal;
    }
  }
}

export {};
