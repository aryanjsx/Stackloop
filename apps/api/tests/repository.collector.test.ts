import test from 'node:test';
import assert from 'node:assert/strict';
import { RepositoryCollectorService } from '../src/repositories/services/repository-collector.service.js';
import { InMemoryRepositoryRepository } from '../src/repositories/repositories/repository.repository.js';

class StubGitHubService {
  async fetchRepository() {
    return {
      id: 42,
      name: 'stackloop',
      full_name: 'octo-org/stackloop',
      owner: { login: 'octo-org' },
      description: 'A developer discovery platform',
      html_url: 'https://github.com/octo-org/stackloop',
      homepage: null,
      default_branch: 'main',
      language: 'TypeScript',
      stargazers_count: 100,
      forks_count: 20,
      open_issues_count: 5,
      watchers_count: 10,
      size: 2048,
      archived: false,
      disabled: false,
      private: false,
      pushed_at: '2026-08-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    };
  }

  async fetchReadme() {
    return '# StackLoop\n';
  }

  async fetchTopics() {
    return ['developer-tools', 'open-source'];
  }

  async fetchLanguages() {
    return ['TypeScript', 'Markdown'];
  }

  async fetchContributors() {
    return ['octocat'];
  }
}

test('collects repository metadata and enqueues downstream jobs', async () => {
  const repositoryRepository = new InMemoryRepositoryRepository();
  const githubService = new StubGitHubService() as any;
  const collector = new RepositoryCollectorService({
    githubService,
    repositoryRepository,
    queueProducer: {
      enqueueSummaryJob: async (payload) => ({ id: payload.repositoryId, queued: true }),
      enqueueSearchIndexJob: async (payload) => ({ id: payload.repositoryId, queued: true }),
    },
  });

  const result = await collector.collectRepository({
    owner: 'octo-org',
    repo: 'stackloop',
  });

  assert.equal(result.created, true);
  assert.equal(result.repository.fullName, 'octo-org/stackloop');
  assert.equal(result.summaryQueued, true);
  assert.equal(result.searchIndexQueued, true);
});
