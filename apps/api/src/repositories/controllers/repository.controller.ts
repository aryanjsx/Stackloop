import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../auth/validators/auth.validator.js';
import type { RepositoryCollectorService } from '../services/repository-collector.service.js';
import type { RepositoryRepository } from '../types.js';

/**
 * GitHub owner and repository names. Constrained to GitHub's own rules so a value can never be
 * used to traverse out of the intended API path when interpolated into a request URL.
 */
const ownerSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/, 'owner must be a valid GitHub username');

const repoSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, 'repo must be a valid GitHub repository name');

const syncSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
});

const batchSyncSchema = z.object({
  // Bounded so one request cannot trigger an unbounded fan-out of GitHub API calls.
  items: z.array(syncSchema).min(1).max(50),
});

function extractUser(req: Request) {
  return (req as any).principal?.user ?? (req as any).user;
}

export class RepositoryController {
  public readonly repositoryRepository: RepositoryRepository;

  constructor(
    private readonly collectorService: RepositoryCollectorService,
    repositoryRepository?: RepositoryRepository
  ) {
    this.repositoryRepository = repositoryRepository ?? collectorService.repositoryRepository;
  }

  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = parseOrThrow(syncSchema, req.body ?? {});
      const result = await this.collectorService.collectRepository(body);

      res.status(200).json({
        data: {
          created: result.created,
          repository_id: result.repository.id,
          full_name: result.repository.fullName,
          summary_queued: result.summaryQueued,
          search_index_queued: result.searchIndexQueued,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  syncBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = parseOrThrow(batchSyncSchema, req.body ?? {});
      const results = await this.collectorService.collectRepositoryBatch(body.items);

      res.status(200).json({
        data: results.map((result) => ({
          created: result.created,
          repository_id: result.repository.id,
          full_name: result.repository.fullName,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const pageSize = req.query.pageSize
        ? parseInt(String(req.query.pageSize), 10)
        : req.query.page_size
          ? parseInt(String(req.query.page_size), 10)
          : 20;

      const q = typeof req.query.q === 'string' ? req.query.q : typeof req.query.query === 'string' ? req.query.query : undefined;
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;
      const sortParam = req.query.sort;
      const sort = sortParam === 'newest' || sortParam === 'updated' || sortParam === 'popular' ? sortParam : 'popular';

      const result = await this.repositoryRepository.list({
        page: isNaN(page) ? 1 : page,
        pageSize: isNaN(pageSize) ? 20 : pageSize,
        q,
        language,
        sort,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string' || !id) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      const currentUserId = extractUser(req)?.id;
      const repo = await this.repositoryRepository.findById(id, currentUserId);

      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      res.status(200).json({ data: repo });
    } catch (error) {
      next(error);
    }
  };

  getByOwnerAndName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { owner, name } = req.params;
      if (typeof owner !== 'string' || typeof name !== 'string' || !owner || !name) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing owner or repo name' } });
        return;
      }

      const currentUserId = extractUser(req)?.id;
      const repo = await this.repositoryRepository.findByFullName(owner, name, currentUserId);

      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      res.status(200).json({ data: repo });
    } catch (error) {
      next(error);
    }
  };

  saveRepository = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = extractUser(req);
      if (!user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const repoId = req.params.id ?? req.body?.repository_id;
      if (typeof repoId !== 'string' || !repoId) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      const repo = await this.repositoryRepository.findById(repoId);
      if (!repo) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
        return;
      }

      const result = await this.repositoryRepository.saveRepository(user.id, repoId);

      res.status(200).json({
        data: {
          saved: true,
          repository_id: repoId,
          saved_at: result.savedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  unsaveRepository = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = extractUser(req);
      if (!user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const repoId = req.params.id ?? req.params.saved_repository_id;
      if (typeof repoId !== 'string' || !repoId) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing repository id' } });
        return;
      }

      await this.repositoryRepository.unsaveRepository(user.id, repoId);

      res.status(200).json({
        data: {
          saved: false,
          repository_id: repoId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listSaved = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = extractUser(req);
      if (!user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const pageSize = req.query.pageSize
        ? parseInt(String(req.query.pageSize), 10)
        : req.query.page_size
          ? parseInt(String(req.query.page_size), 10)
          : 20;

      const result = await this.repositoryRepository.listSaved(user.id, {
        page: isNaN(page) ? 1 : page,
        pageSize: isNaN(pageSize) ? 20 : pageSize,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}
