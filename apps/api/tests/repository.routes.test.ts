import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { RepositoryController } from '../src/repositories/controllers/repository.controller.js';
import { RepositoryCollectorService } from '../src/repositories/services/repository-collector.service.js';
import { InMemoryRepositoryRepository } from '../src/repositories/repositories/repository.repository.js';
import type { GitHubService } from '../src/repositories/services/github.service.js';
import { createTestHarness, redirectLocation } from './helpers/test-app.js';

const payload = {
  id: 9001,
  name: 'example',
  full_name: 'octo/example',
  owner: { login: 'octo' },
  description: 'An example repository',
  html_url: 'https://github.com/octo/example',
  homepage: null,
  default_branch: 'main',
  language: 'TypeScript',
  stargazers_count: 120,
  forks_count: 8,
  open_issues_count: 3,
  watchers_count: 120,
  size: 2048,
  archived: false,
  disabled: false,
  private: false,
  pushed_at: '2026-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/** Minimal GitHub stub; the collector only calls these five methods. */
function createGithubStub(): GitHubService {
  return {
    fetchRepository: async () => payload,
    fetchReadme: async () => '# Example',
    fetchTopics: async () => ['testing'],
    fetchLanguages: async () => ['TypeScript'],
    fetchContributors: async () => ['octo'],
  } as unknown as GitHubService;
}

async function createHarness() {
  const auth = createTestHarness();
  const collector = new RepositoryCollectorService({
    githubService: createGithubStub(),
    repositoryRepository: new InMemoryRepositoryRepository(),
    queueProducer: {
      enqueueSummaryJob: async (p) => ({ id: p.repositoryId, queued: true }),
      enqueueSearchIndexJob: async (p) => ({ id: p.repositoryId, queued: true }),
    },
  });

  const app = createApp({
    authService: auth.authService,
    repositoryController: new RepositoryController(collector),
    isProduction: false,
    webAppOrigin: 'http://localhost:3000',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 2592000,
    enableRateLimiting: false,
  });

  return { app, auth };
}

/** Signs in and optionally promotes the account, returning a bearer token. */
async function tokenFor(harness: Awaited<ReturnType<typeof createHarness>>, role: 'user' | 'admin') {
  const loginResponse = await request(harness.app).get('/auth/github/login');
  const state = redirectLocation(loginResponse).searchParams.get('state')!;
  const callback = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'valid-code', state });

  if (role === 'admin') {
    const user = [...harness.auth.users.users.values()][0]!;
    harness.auth.users.setUser({ ...user, role: 'admin' });
    // The existing token still carries role "user" in its claims, but authorisation reads the
    // role from the database-backed principal, so a re-issued token is not required.
  }

  return callback.body.data.access_token as string;
}

test('repository sync rejects anonymous requests', async () => {
  const harness = await createHarness();
  const response = await request(harness.app)
    .post('/repositories/sync')
    .send({ owner: 'octo', repo: 'example' });

  assert.equal(response.status, 401);
});

test('repository sync rejects a non-admin user', async () => {
  const harness = await createHarness();
  const token = await tokenFor(harness, 'user');

  const response = await request(harness.app)
    .post('/repositories/sync')
    .set('Authorization', `Bearer ${token}`)
    .send({ owner: 'octo', repo: 'example' });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('repository sync succeeds for an admin', async () => {
  const harness = await createHarness();
  const token = await tokenFor(harness, 'admin');

  const response = await request(harness.app)
    .post('/repositories/sync')
    .set('Authorization', `Bearer ${token}`)
    .send({ owner: 'octo', repo: 'example' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.full_name, 'octo/example');
  assert.equal(response.body.data.created, true);
});

test('repository sync validates owner and repo names', async () => {
  const harness = await createHarness();
  const token = await tokenFor(harness, 'admin');

  const invalid = [
    { owner: '../etc', repo: 'passwd' },
    { owner: 'octo', repo: '../../secrets' },
    { owner: '', repo: 'example' },
    { owner: 'octo' },
    {},
  ];

  for (const body of invalid) {
    const response = await request(harness.app)
      .post('/repositories/sync')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(body)}`);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
});

test('batch sync is bounded and validated', async () => {
  const harness = await createHarness();
  const token = await tokenFor(harness, 'admin');

  const tooMany = await request(harness.app)
    .post('/repositories/sync/batch')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: Array.from({ length: 51 }, () => ({ owner: 'octo', repo: 'example' })) });
  assert.equal(tooMany.status, 400);

  const empty = await request(harness.app)
    .post('/repositories/sync/batch')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [] });
  assert.equal(empty.status, 400);

  const ok = await request(harness.app)
    .post('/repositories/sync/batch')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ owner: 'octo', repo: 'example' }] });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.length, 1);
});

test('the documented batch path is the one that is served', async () => {
  // Regression test for D-15: the README documented /repositories/sync/batch while the code
  // registered /repositories/batch-sync, so the documented path 404'd.
  const harness = await createHarness();
  const token = await tokenFor(harness, 'admin');

  const legacy = await request(harness.app)
    .post('/repositories/batch-sync')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ owner: 'octo', repo: 'example' }] });

  assert.equal(legacy.status, 404);
});
