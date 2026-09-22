import { Router } from 'express';
import type { AuthService } from '../auth/services/auth.service.js';
import { requireAuth } from '../auth/middleware/auth.middleware.js';
import { requireRole } from '../auth/middleware/authorization.middleware.js';
import { csrfProtection } from '../auth/middleware/csrf.middleware.js';
import type { RepositoryController } from './controllers/repository.controller.js';

export interface RepositoryRouterOptions {
  authService: AuthService;
  controller: RepositoryController;
}

/**
 * Repository ingestion endpoints.
 *
 * These are platform operations, not user actions: each one spends GitHub API quota and writes
 * to shared data, so they require the admin role. Previously they were unauthenticated and
 * unvalidated.
 */
export function createRepositoryRouter({
  authService,
  controller,
}: RepositoryRouterOptions): Router {
  const router = Router();

  router.use(csrfProtection(), requireAuth(authService), requireRole('admin'));

  router.post('/sync', controller.sync);
  router.post('/sync/batch', controller.syncBatch);

  return router;
}
