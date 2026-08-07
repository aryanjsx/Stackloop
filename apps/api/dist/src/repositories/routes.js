import { createServer } from 'node:http';
import { RepositoryController } from './controllers/repository.controller.js';
import { RepositoryCollectorService } from './services/repository-collector.service.js';
import { GitHubService } from './services/github.service.js';
import { InMemoryRepositoryRepository } from './repositories/repository.repository.js';
export function createRepositoryRoutes() {
    const githubService = new GitHubService({
        baseUrl: process.env.GITHUB_API_BASE_URL ?? 'https://api.github.com',
        token: process.env.GITHUB_TOKEN ?? 'local-dev-token',
        rateLimitBuffer: Number(process.env.GITHUB_RATE_LIMIT_BUFFER ?? 5),
    });
    const repositoryRepository = new InMemoryRepositoryRepository();
    const collectorService = new RepositoryCollectorService({
        githubService,
        repositoryRepository,
        queueProducer: {
            enqueueSummaryJob: async (payload) => ({ id: payload.repositoryId, queued: true }),
            enqueueSearchIndexJob: async (payload) => ({ id: payload.repositoryId, queued: true }),
        },
    });
    const controller = new RepositoryController(collectorService);
    return createServer(async (req, res) => {
        const url = new URL(req.url ?? '/', 'https://api.stackloop.dev');
        if (url.pathname === '/repositories/sync' && req.method === 'POST') {
            await controller.syncRepository(req, res);
            return;
        }
        if (url.pathname === '/repositories/batch-sync' && req.method === 'POST') {
            await controller.syncBatch(req, res);
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
    });
}
