import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { RepositoryController } from '../src/repositories/controllers/repository.controller.js';
import { RepositoryCollectorService } from '../src/repositories/services/repository-collector.service.js';
import { InMemoryRepositoryRepository } from '../src/repositories/repositories/repository.repository.js';
import type { GitHubService } from '../src/repositories/services/github.service.js';
import { createTestHarness, redirectLocation } from './helpers/test-app.js';

const mockRepoPayload = {
  id: 101,
  name: 'antigravity-suite',
  full_name: 'octo/antigravity-suite',
  owner: { login: 'octo' },
  description: 'AI-assisted developer workflow suite',
  html_url: 'https://github.com/octo/antigravity-suite',
  homepage: 'https://example.com/antigravity',
  default_branch: 'main',
  language: 'TypeScript',
  stargazers_count: 500,
  forks_count: 50,
  open_issues_count: 5,
  watchers_count: 500,
  size: 4096,
  archived: false,
  disabled: false,
  private: false,
  pushed_at: '2026-03-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

function createGithubStub(): GitHubService {
  return {
    fetchRepository: async () => mockRepoPayload,
    fetchReadme: async () => '# Antigravity Suite\nComprehensive developer tools.',
    fetchTopics: async () => ['ai', 'typescript', 'devtools'],
    fetchLanguages: async () => ['TypeScript', 'Python'],
    fetchContributors: async () => ['octo', 'contributor1'],
  } as unknown as GitHubService;
}

async function createHarness() {
  const auth = createTestHarness();
  const repoStore = new InMemoryRepositoryRepository();
  const collector = new RepositoryCollectorService({
    githubService: createGithubStub(),
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
    isProduction: false,
    webAppOrigin: 'http://localhost:3000',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 2592000,
    enableRateLimiting: false,
  });

  return { app, auth, repoStore, collector };
}

async function tokenFor(harness: Awaited<ReturnType<typeof createHarness>>) {
  const loginResponse = await request(harness.app).get('/auth/github/login');
  const state = redirectLocation(loginResponse).searchParams.get('state')!;
  const callback = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'valid-code', state });

  return callback.body.data.access_token as string;
}

test('public repository listing works without authentication', async () => {
  const harness = await createHarness();

  // Populate two repos
  await harness.repoStore.upsert({
    id: 'repo-1',
    githubId: 101,
    ownerLogin: 'octo',
    name: 'first-repo',
    fullName: 'octo/first-repo',
    description: 'First public repo for test',
    repositoryUrl: 'https://github.com/octo/first-repo',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 150,
    forksCount: 10,
    openIssuesCount: 2,
    watchersCount: 150,
    sizeKb: 100,
    isArchived: false,
    isDisabled: false,
    isPrivate: false,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  });

  await harness.repoStore.upsert({
    id: 'repo-2',
    githubId: 102,
    ownerLogin: 'google',
    name: 'python-tools',
    fullName: 'google/python-tools',
    description: 'Python developer utilities',
    repositoryUrl: 'https://github.com/google/python-tools',
    defaultBranch: 'main',
    language: 'Python',
    stargazersCount: 300,
    forksCount: 40,
    openIssuesCount: 5,
    watchersCount: 300,
    sizeKb: 200,
    isArchived: false,
    isDisabled: false,
    isPrivate: false,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  });

  const res = await request(harness.app).get('/repositories');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.total, 2);
  assert.equal(res.body.data.items.length, 2);
  // Default sort is popular (highest stargazers first)
  assert.equal(res.body.data.items[0].name, 'python-tools');
});

test('public repository listing supports search query and language filter', async () => {
  const harness = await createHarness();

  await harness.repoStore.upsert({
    id: 'repo-ts',
    githubId: 201,
    ownerLogin: 'octo',
    name: 'ts-repo',
    fullName: 'octo/ts-repo',
    description: 'TypeScript awesome library',
    repositoryUrl: 'https://github.com/octo/ts-repo',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 50,
    forksCount: 0,
    openIssuesCount: 0,
    watchersCount: 50,
    isArchived: false,
    isDisabled: false,
    isPrivate: false,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  });

  await harness.repoStore.upsert({
    id: 'repo-py',
    githubId: 202,
    ownerLogin: 'octo',
    name: 'py-repo',
    fullName: 'octo/py-repo',
    description: 'Python awesome library',
    repositoryUrl: 'https://github.com/octo/py-repo',
    defaultBranch: 'main',
    language: 'Python',
    stargazersCount: 75,
    forksCount: 0,
    openIssuesCount: 0,
    watchersCount: 75,
    isArchived: false,
    isDisabled: false,
    isPrivate: false,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  });

  // Query filter
  const queryRes = await request(harness.app).get('/repositories').query({ q: 'Python' });
  assert.equal(queryRes.status, 200);
  assert.equal(queryRes.body.data.total, 1);
  assert.equal(queryRes.body.data.items[0].name, 'py-repo');

  // Language filter
  const langRes = await request(harness.app).get('/repositories').query({ language: 'TypeScript' });
  assert.equal(langRes.status, 200);
  assert.equal(langRes.body.data.total, 1);
  assert.equal(langRes.body.data.items[0].name, 'ts-repo');
});

test('public repository detail by ID and by owner/name', async () => {
  const harness = await createHarness();

  await harness.repoStore.upsert({
    id: 'repo-detail-1',
    githubId: 301,
    ownerLogin: 'stackloop',
    name: 'core',
    fullName: 'stackloop/core',
    description: 'StackLoop core platform',
    repositoryUrl: 'https://github.com/stackloop/core',
    defaultBranch: 'main',
    language: 'TypeScript',
    stargazersCount: 120,
    forksCount: 12,
    openIssuesCount: 1,
    watchersCount: 120,
    isArchived: false,
    isDisabled: false,
    isPrivate: false,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  });

  // Get by ID
  const idRes = await request(harness.app).get('/repositories/repo-detail-1');
  assert.equal(idRes.status, 200);
  assert.equal(idRes.body.data.id, 'repo-detail-1');
  assert.equal(idRes.body.data.fullName, 'stackloop/core');
  assert.equal(idRes.body.data.isSaved, false);

  // Get by owner and name
  const nameRes = await request(harness.app).get('/repositories/by-name/stackloop/core');
  assert.equal(nameRes.status, 200);
  assert.equal(nameRes.body.data.id, 'repo-detail-1');

  // 404 for unknown repository
  const notFound = await request(harness.app).get('/repositories/non-existent-id');
  assert.equal(notFound.status, 404);
  assert.equal(notFound.body.error.code, 'NOT_FOUND');
});

test('saved repository operations require authentication', async () => {
  const harness = await createHarness();

  const getSaved = await request(harness.app).get('/saved-repositories');
  assert.equal(getSaved.status, 401);

  const postSave = await request(harness.app).post('/repositories/repo-1/save');
  assert.equal(postSave.status, 401);

  const deleteSave = await request(harness.app).delete('/repositories/repo-1/save');
  assert.equal(deleteSave.status, 401);
});

test('authenticated user can bookmark and unbookmark repositories', async () => {
  const harness = await createHarness();
  const token = await tokenFor(harness);

  await harness.repoStore.upsert({
    id: 'repo-bookmark-test',
    githubId: 401,
    ownerLogin: 'octocat',
    name: 'bookmarkable',
    fullName: 'octocat/bookmarkable',
    description: 'A repository that can be saved',
    repositoryUrl: 'https://github.com/octocat/bookmarkable',
    defaultBranch: 'main',
    language: 'Rust',
    stargazersCount: 88,
    forksCount: 4,
    openIssuesCount: 0,
    watchersCount: 88,
    isArchived: false,
    isDisabled: false,
    isPrivate: false,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: new Date(),
  });

  // Verify currently saved list is empty
  const initialSaved = await request(harness.app)
    .get('/saved-repositories')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(initialSaved.status, 200);
  assert.equal(initialSaved.body.data.total, 0);

  // Save the repository via POST /repositories/:id/save
  const saveRes = await request(harness.app)
    .post('/repositories/repo-bookmark-test/save')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(saveRes.status, 200);
  assert.equal(saveRes.body.data.saved, true);
  assert.equal(saveRes.body.data.repository_id, 'repo-bookmark-test');

  // Verify it appears in GET /saved-repositories
  const afterSave = await request(harness.app)
    .get('/saved-repositories')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(afterSave.status, 200);
  assert.equal(afterSave.body.data.items[0].repositoryId, 'repo-bookmark-test');
  assert.equal(afterSave.body.data.items[0].repository.id, 'repo-bookmark-test');

  // Detail endpoint with auth token now shows isSaved = true
  const detailWithAuth = await request(harness.app)
    .get('/repositories/repo-bookmark-test')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(detailWithAuth.status, 200);
  assert.equal(detailWithAuth.body.data.isSaved, true);

  // Unsave the repository via DELETE /repositories/:id/save
  const unsaveRes = await request(harness.app)
    .delete('/repositories/repo-bookmark-test/save')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(unsaveRes.status, 200);
  assert.equal(unsaveRes.body.data.saved, false);

  // Verify it is no longer in saved repositories
  const afterUnsave = await request(harness.app)
    .get('/saved-repositories')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(afterUnsave.status, 200);
  assert.equal(afterUnsave.body.data.total, 0);

  // Detail endpoint now shows isSaved = false
  const detailAfterUnsave = await request(harness.app)
    .get('/repositories/repo-bookmark-test')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(detailAfterUnsave.status, 200);
  assert.equal(detailAfterUnsave.body.data.isSaved, false);
});
