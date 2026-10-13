import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { RepositoryController } from '../src/repositories/controllers/repository.controller.js';
import { RepositoryCollectorService } from '../src/repositories/services/repository-collector.service.js';
import { InMemoryRepositoryRepository } from '../src/repositories/repositories/repository.repository.js';
import { CloudTasksQueueProducer } from '../src/repositories/services/cloud-tasks-queue.producer.js';
import { createTestHarness } from './helpers/test-app.js';

const TEST_SECRET = 'test-internal-secret-xyz';

async function createInternalHarness() {
  const auth = createTestHarness();
  const repoStore = new InMemoryRepositoryRepository();
  const collector = new RepositoryCollectorService({
    githubService: {} as any,
    repositoryRepository: repoStore,
    queueProducer: {
      enqueueSummaryJob: async (p) => ({ id: p.repositoryId, queued: true }),
      enqueueSearchIndexJob: async (p) => ({ id: p.repositoryId, queued: true }),
    },
  });

  const controller = new RepositoryController(collector, repoStore);

  const app = createApp({
    authService: auth.authService,
    repositoryController: controller,
    repositoryRepository: repoStore,
    internalSecret: TEST_SECRET,
    isProduction: false,
    webAppOrigin: 'http://localhost:3000',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
  });

  return { app, repoStore };
}

test('POST /internal/repositories/:id/ai-summary rejects request without internal secret', async () => {
  const { app } = await createInternalHarness();
  const repoId = randomUUID();

  const res = await request(app)
    .post(`/internal/repositories/${repoId}/ai-summary`)
    .send({
      repository_id: repoId,
      summary: 'Test summary',
    });

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('POST /internal/repositories/:id/ai-summary rejects invalid internal secret', async () => {
  const { app } = await createInternalHarness();
  const repoId = randomUUID();

  const res = await request(app)
    .post(`/internal/repositories/${repoId}/ai-summary`)
    .set('X-Internal-Secret', 'wrong-secret')
    .send({
      repository_id: repoId,
      summary: 'Test summary',
    });

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('POST /internal/repositories/:id/ai-summary saves AI metadata and technologies', async () => {
  const { app, repoStore } = await createInternalHarness();
  const repoId = randomUUID();

  await repoStore.upsert({
    id: repoId,
    githubId: 8888,
    ownerLogin: 'aryanjsx',
    name: 'Stackloop',
    fullName: 'aryanjsx/Stackloop',
    repositoryUrl: 'https://github.com/aryanjsx/Stackloop',
    defaultBranch: 'main',
    stargazersCount: 42,
    forksCount: 5,
    openIssuesCount: 0,
    watchersCount: 42,
    isArchived: false,
    isDisabled: false,
    isPrivate: false,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const payload = {
    repository_id: repoId,
    summary: 'StackLoop is an AI-powered GitHub repository discovery engine featuring automated code analysis.',
    model: 'gemini-3.8',
    confidence: 0.96,
    technologies: [
      { name: 'TypeScript', category: 'language', confidence: 0.99 },
      { name: 'Next.js', category: 'framework', confidence: 0.95 },
      { name: 'PostgreSQL', category: 'database', confidence: 0.9 },
    ],
  };

  const res = await request(app)
    .post(`/internal/repositories/${repoId}/ai-summary`)
    .set('X-Internal-Secret', TEST_SECRET)
    .send(payload);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.success, true);
  assert.equal(res.body.data.ai_summary.summary, payload.summary);
  assert.equal(res.body.data.ai_summary.aiModel, 'gemini-3.8');

  // Verify that GET /repositories/:id returns the attached AI summary and technologies
  const getRes = await request(app).get(`/repositories/${repoId}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.data.aiSummary?.summary, payload.summary);
  assert.equal(getRes.body.data.technologies?.length, 3);
  assert.equal(getRes.body.data.technologies?.[0]?.name, 'TypeScript');
});

test('CloudTasksQueueProducer handles enqueueing gracefully when AI service is offline', async () => {
  const producer = new CloudTasksQueueProducer({
    aiServiceUrl: 'http://127.0.0.1:59999', // Non-existent offline port
    cloudTasksSecret: 'secret',
  });

  const result = await producer.enqueueSummaryJob({
    repositoryId: randomUUID(),
    githubId: 12345,
  });

  assert.equal(result.queued, false);
});
