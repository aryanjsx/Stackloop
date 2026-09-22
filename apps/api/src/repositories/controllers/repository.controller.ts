import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../auth/validators/auth.validator.js';
import type { RepositoryCollectorService } from '../services/repository-collector.service.js';

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

export class RepositoryController {
  constructor(private readonly collectorService: RepositoryCollectorService) {}

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
}
