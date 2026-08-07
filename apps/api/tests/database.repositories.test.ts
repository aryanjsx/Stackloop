import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaUserRepository } from '../src/database/repositories/user.repository.js';
import { PrismaRepositoryRepository } from '../src/database/repositories/repository.repository.js';

function createPrismaStub() {
  const users: Array<Record<string, unknown>> = [];
  const repositories: Array<Record<string, unknown>> = [
    { id: 'repo-1', githubId: 1001, fullName: 'octo/example' },
    { id: 'repo-2', githubId: 1002, fullName: 'octo/another' },
  ];

  return {
    user: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { id: `user-${users.length + 1}`, ...data };
        users.push(created);
        return created;
      },
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.githubId != null) {
          return users.find((user) => user.githubId === where.githubId) ?? null;
        }
        return users.find((user) => user.id === where.id) ?? null;
      },
      update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const index = users.findIndex((user) => user.id === where.id);
        if (index === -1) {
          throw new Error('User not found');
        }
        const updated = { ...users[index], ...data };
        users[index] = updated;
        return updated;
      },
    },
    repository: {
      findMany: async ({ skip, take }: { skip: number; take: number }) => repositories.slice(skip, skip + take),
      count: async () => repositories.length,
    },
  };
}

test('user repository supports create and find-by-github-id', async () => {
  const prisma = createPrismaStub() as any;
  const repository = new PrismaUserRepository(prisma);

  const created = await repository.create({
    githubId: 999,
    username: 'db-test-user',
    displayName: 'DB Test User',
    email: 'db@example.com',
  });

  const found = await repository.findByGithubId(999);
  assert.equal(found?.username, 'db-test-user');
  assert.equal(created.githubId, 999);
});

test('repository repository supports pagination helper', async () => {
  const prisma = createPrismaStub() as any;
  const repository = new PrismaRepositoryRepository(prisma);
  const result = await repository.findMany({}, { page: 1, pageSize: 5 });
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 5);
  assert.equal(result.total, 2);
});
