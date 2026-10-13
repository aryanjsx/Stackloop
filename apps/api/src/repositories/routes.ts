import { Router } from 'express';
import type { AuthService } from '../auth/services/auth.service.js';
import { optionalAuth, requireAuth } from '../auth/middleware/auth.middleware.js';
import { requireRole } from '../auth/middleware/authorization.middleware.js';
import { csrfProtection } from '../auth/middleware/csrf.middleware.js';
import type { RepositoryController } from './controllers/repository.controller.js';

export interface RepositoryRouterOptions {
  authService: AuthService;
  controller: RepositoryController;
}

/**
 * Repository discovery, bookmark, and ingestion endpoints.
 */
export function createRepositoryRouter({
  authService,
  controller,
}: RepositoryRouterOptions): Router {
  const router = Router();

  // Admin platform ingestion operations
  router.post('/sync/batch', csrfProtection(), requireAuth(authService), requireRole('admin'), controller.syncBatch);
  router.post('/sync', csrfProtection(), requireAuth(authService), requireRole('admin'), controller.sync);

  // Authenticated user bookmark actions on specific repositories
  router.post('/:id/save', csrfProtection(), requireAuth(authService), controller.saveRepository);
  router.delete('/:id/save', csrfProtection(), requireAuth(authService), controller.unsaveRepository);

  // AI Agent endpoints
  router.post('/ai-discover', optionalAuth(authService), controller.aiDiscover);
  router.post('/:id/ai-describe', optionalAuth(authService), controller.aiDescribe);

  // GitHub Actions (Star and Fork)
  router.post('/:id/star', optionalAuth(authService), controller.starRepository);
  router.post('/:id/fork', optionalAuth(authService), controller.forkRepository);

  // Public repository discovery and lookup (optionalAuth checks if user has saved this repo)
  router.get('/by-name/:owner/:name', optionalAuth(authService), controller.getByOwnerAndName);
  router.get('/:id', optionalAuth(authService), controller.getById);
  router.get('/', optionalAuth(authService), controller.list);

  return router;
}

/**
 * Saved repositories (user bookmarks) router.
 * Requires authentication for all endpoints.
 */
export function createSavedRepositoryRouter({
  authService,
  controller,
}: RepositoryRouterOptions): Router {
  const router = Router();

  router.use(requireAuth(authService));

  router.get('/', controller.listSaved);
  router.post('/', csrfProtection(), controller.saveRepository);
  router.delete('/:id', csrfProtection(), controller.unsaveRepository);

  return router;
}
