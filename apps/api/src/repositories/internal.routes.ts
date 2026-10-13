import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { RepositoryRepository } from './types.js';

export interface InternalRouterOptions {
  repositoryRepository: RepositoryRepository;
  internalSecret?: string;
}

const aiSummaryWebhookSchema = z.object({
  repository_id: z.string().uuid(),
  summary: z.string().min(1),
  model: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  technologies: z
    .array(
      z.object({
        name: z.string(),
        category: z.string().optional().nullable(),
        confidence: z.number().optional().nullable(),
      })
    )
    .optional(),
});

/**
 * Internal router for service-to-service communication between the StackLoop AI
 * microservice / Cloud Tasks webhooks and the StackLoop core API.
 * Authenticated via shared secret header (X-Internal-Secret).
 */
export function createInternalRouter(options: InternalRouterOptions): Router {
  const router = Router();
  const configuredSecret =
    options.internalSecret ||
    process.env.INTERNAL_SERVICE_SECRET ||
    process.env.CLOUD_TASKS_SECRET ||
    'dev-cloud-tasks-secret';

  router.post(
    '/repositories/:id/ai-summary',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.header('X-Internal-Secret');
        if (!authHeader || authHeader !== configuredSecret) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing internal service secret' },
          });
          return;
        }

        const id = req.params.id;
        if (typeof id !== 'string' || !id) {
          res.status(400).json({
            error: { code: 'INVALID_REQUEST', message: 'Missing repository id in path' },
          });
          return;
        }

        const parsed = aiSummaryWebhookSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.issues },
          });
          return;
        }

        const { summary, model, confidence, technologies } = parsed.data;
        const savedSummary = await options.repositoryRepository.saveAiSummary(id, {
          summaryText: summary,
          aiModel: model,
          confidenceScore: confidence,
          technologies: technologies?.map((t) => ({
            name: t.name,
            category: t.category ?? null,
            confidence: t.confidence ?? undefined,
          })),
        });

        res.status(200).json({
          data: {
            success: true,
            repository_id: id,
            ai_summary: savedSummary,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
