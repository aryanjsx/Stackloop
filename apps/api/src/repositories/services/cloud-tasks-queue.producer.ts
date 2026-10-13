import { createHmac } from 'node:crypto';
import type { QueueProducer, RepositoryRepository } from '../types.js';

export interface CloudTasksProducerConfig {
  aiServiceUrl?: string;
  cloudTasksSecret?: string;
  repositoryRepository?: RepositoryRepository;
}

/**
 * CloudTasksQueueProducer handles async job dispatching to the StackLoop AI microservice.
 * In production GCP environments, it signs the payload with HMAC-SHA256 and targets
 * the /tasks/analyze webhook or Cloud Tasks HTTP target.
 */
export class CloudTasksQueueProducer implements QueueProducer {
  private readonly aiServiceUrl?: string;
  private readonly secret: string;

  constructor(private readonly config: CloudTasksProducerConfig = {}) {
    this.aiServiceUrl = config.aiServiceUrl || process.env.AI_SERVICE_URL;
    this.secret = config.cloudTasksSecret || process.env.CLOUD_TASKS_SECRET || 'dev-cloud-tasks-secret';
  }

  async enqueueSummaryJob(payload: { repositoryId: string; githubId: number }): Promise<{ id: string; queued: boolean }> {
    if (!this.aiServiceUrl) {
      // In local testing or when AI service is omitted, gracefully acknowledge without error
      return { id: payload.repositoryId, queued: false };
    }

    try {
      let repoData: any = null;
      if (this.config.repositoryRepository) {
        repoData = await this.config.repositoryRepository.findById(payload.repositoryId);
      }

      const bodyObj = {
        repository_id: payload.repositoryId,
        github_id: payload.githubId,
        owner: repoData?.ownerLogin ?? 'unknown',
        name: repoData?.name ?? 'unknown',
        full_name: repoData?.fullName ?? `repo/${payload.githubId}`,
        description: repoData?.description ?? null,
        readme: repoData?.readme ?? null,
        primary_language: repoData?.language ?? null,
        topics: repoData?.topics ?? [],
      };

      const rawBody = JSON.stringify(bodyObj);
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = Buffer.concat([
        Buffer.from(`${timestamp}.`, 'utf-8'),
        Buffer.from(rawBody, 'utf-8'),
      ]);
      const signature = createHmac('sha256', this.secret).update(signedPayload).digest('hex');
      const signatureHeader = `t=${timestamp},v1=${signature}`;

      const targetUrl = `${this.aiServiceUrl.replace(/\/+$/, '')}/tasks/analyze`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-StackLoop-Signature': signatureHeader,
          'X-CloudTasks-TaskName': `task-${payload.repositoryId}-${timestamp}`,
        },
        body: rawBody,
        signal: AbortSignal.timeout(10000),
      }).catch((err) => {
        // Log network or connection error gracefully
        console.warn(`[CloudTasksQueueProducer] Failed dispatching task to ${targetUrl}:`, (err as Error).message);
        return null;
      });

      return {
        id: payload.repositoryId,
        queued: Boolean(response && response.ok),
      };
    } catch (err) {
      console.warn('[CloudTasksQueueProducer] Error enqueuing summary job:', (err as Error).message);
      return { id: payload.repositoryId, queued: false };
    }
  }

  async enqueueSearchIndexJob(payload: { repositoryId: string; githubId: number }): Promise<{ id: string; queued: boolean }> {
    return { id: payload.repositoryId, queued: true };
  }
}
