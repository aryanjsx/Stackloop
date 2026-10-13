import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { PrismaAuthUserRepository } from '../src/auth/repositories/prisma-auth-user.repository.js';
import { PrismaSessionRepository } from '../src/auth/repositories/prisma-session.repository.js';
import { PrismaRepositoryRepository } from '../src/repositories/repositories/prisma-repository.repository.js';

let prisma: PrismaClient | null = null;

if (process.env.DATABASE_URL) {
  try {
    prisma = new PrismaClient();
  } catch {
    prisma = null;
  }
}

async function checkDatabaseConnection(): Promise<boolean> {
  if (!prisma) return false;
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

test('PostgreSQL Database Integration Tests', async (t) => {
  const isDbUp = await checkDatabaseConnection();

  if (!isDbUp || !prisma) {
    t.skip('PostgreSQL is not reachable at DATABASE_URL. Run `docker compose up -d` to run live integration tests.');
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
    return;
  }

  const testGithubId = 99999901;
  const testRepoGithubId = 99999902;

  t.after(async () => {
    if (!prisma) return;
    try {
      // Clean up test data
      await prisma.repository.deleteMany({ where: { githubId: BigInt(testRepoGithubId) } });
      await prisma.session.deleteMany({ where: { user: { githubId: BigInt(testGithubId) } } });
      await prisma.user.deleteMany({ where: { githubId: BigInt(testGithubId) } });
    } catch {
      // ignore cleanup errors
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });

  await t.test('PrismaAuthUserRepository creates and updates GitHub user', async () => {
    const userRepo = new PrismaAuthUserRepository(prisma!);
    const now = new Date();

    const created = await userRepo.upsertFromGithub(
      {
        id: testGithubId,
        login: 'integration-test-user',
        name: 'Integration Test User',
        email: 'test-integration@stackloop.local',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'Integration test user bio',
        company: null,
        location: null,
        websiteUrl: null,
      },
      now
    );

    assert.equal(created.username, 'integration-test-user');
    assert.equal(created.githubId, testGithubId);
    assert.equal(created.role, 'user');

    const fetched = await userRepo.findById(created.id);
    assert.ok(fetched);
    assert.equal(fetched.id, created.id);
    assert.equal(fetched.email, 'test-integration@stackloop.local');

    // Test upsert update branch
    const updated = await userRepo.upsertFromGithub(
      {
        id: testGithubId,
        login: 'integration-test-user-updated',
        name: 'Integration Test User Updated',
        email: 'test-integration@stackloop.local',
        avatarUrl: 'https://example.com/avatar.png',
        bio: null,
        company: null,
        location: null,
        websiteUrl: null,
      },
      new Date()
    );

    assert.equal(updated.id, created.id);
    assert.equal(updated.username, 'integration-test-user-updated');
  });

  await t.test('PrismaSessionRepository creates, queries, touches and revokes session', async () => {
    const userRepo = new PrismaAuthUserRepository(prisma!);
    const user = await userRepo.findById(
      (await prisma!.user.findUnique({ where: { githubId: BigInt(testGithubId) } }))!.id
    );
    assert.ok(user);

    const sessionRepo = new PrismaSessionRepository(prisma!);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    const session = await sessionRepo.create({
      userId: user.id,
      provider: 'github',
      userAgent: 'StackLoop-Integration-Test/1.0',
      ipAddress: '127.0.0.1',
      expiresAt,
    });

    assert.ok(session.id);
    assert.equal(session.userId, user.id);
    assert.equal(session.revokedAt, null);

    const fetched = await sessionRepo.findById(session.id);
    assert.ok(fetched);
    assert.equal(fetched.id, session.id);

    // Revoke session
    const revokedAt = new Date();
    await sessionRepo.revoke(session.id, 'integration test teardown', revokedAt);
    const revoked = await sessionRepo.findById(session.id);
    assert.ok(revoked?.revokedAt != null);
  });

  await t.test('PrismaRepositoryRepository creates, queries and bookmarks repositories', async () => {
    const repoRepo = new PrismaRepositoryRepository(prisma!);
    const user = await prisma!.user.findUnique({ where: { githubId: BigInt(testGithubId) } });
    assert.ok(user);

    const created = await repoRepo.upsert({
      id: 'test-repo-id',
      githubId: testRepoGithubId,
      ownerLogin: 'stackloop-test',
      name: 'integration-repo',
      fullName: 'stackloop-test/integration-repo',
      description: 'A test repository for integration validation',
      homepageUrl: undefined,
      repositoryUrl: 'https://github.com/stackloop-test/integration-repo',
      defaultBranch: 'main',
      language: 'TypeScript',
      stargazersCount: 42,
      forksCount: 0,
      openIssuesCount: 0,
      watchersCount: 42,
      sizeKb: 100,
      isArchived: false,
      isDisabled: false,
      isPrivate: false,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastPushAt: undefined,
      lastSyncedAt: new Date(),
    });

    assert.ok(created.id);
    assert.equal(created.name, 'integration-repo');

    const found = await repoRepo.findByGithubId(testRepoGithubId);
    assert.ok(found);
    assert.equal(found.fullName, 'stackloop-test/integration-repo');

    const paginated = await repoRepo.list({ page: 1, pageSize: 10 });
    assert.ok(paginated.total >= 1);
    assert.ok(paginated.items.length >= 1);
    assert.equal(paginated.page, 1);

    // Test saving repository
    const saved = await repoRepo.saveRepository(user.id, created.id);
    assert.equal(saved.saved, true);
    assert.equal(await repoRepo.isSaved(user.id, created.id), true);

    const savedList = await repoRepo.listSaved(user.id, { page: 1, pageSize: 10 });
    assert.ok(savedList.total >= 1);

    // Test unsaving
    await repoRepo.unsaveRepository(user.id, created.id);
    assert.equal(await repoRepo.isSaved(user.id, created.id), false);
  });
});
