import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { ConfigurationError, loadConfig } from './config/env.js';
import { AuthService } from './auth/services/auth.service.js';
import { HttpGithubOAuthProvider } from './auth/providers/github-oauth.provider.js';
import { PrismaAuthUserRepository } from './auth/repositories/prisma-auth-user.repository.js';
import { PrismaOAuthStateRepository } from './auth/repositories/prisma-oauth-state.repository.js';
import { PrismaRefreshTokenRepository } from './auth/repositories/prisma-refresh-token.repository.js';
import { PrismaSessionRepository } from './auth/repositories/prisma-session.repository.js';
import {
  InMemoryAuthUserRepository,
  InMemoryOAuthStateRepository,
  InMemoryRefreshTokenRepository,
  InMemorySessionRepository,
} from './auth/repositories/in-memory-auth.repository.js';
import { TokenService } from './auth/tokens/token.service.js';
import { RepositoryController } from './repositories/controllers/repository.controller.js';
import { RepositoryCollectorService } from './repositories/services/repository-collector.service.js';
import { GitHubService } from './repositories/services/github.service.js';
import { PrismaRepositoryRepository } from './repositories/repositories/prisma-repository.repository.js';
import { InMemoryRepositoryRepository } from './repositories/repositories/repository.repository.js';
import { populateSeedRepositories } from './repositories/repositories/seed.js';
import { CloudTasksQueueProducer } from './repositories/services/cloud-tasks-queue.producer.js';
import type { RepositoryRepository } from './repositories/types.js';

/**
 * Process entrypoint. Connects to database when available, or seamlessly falls back to
 * preloaded in-memory repositories for resilient Cloud Run deployments without downtime.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  const prisma = new PrismaClient({
    log: config.isProduction ? ['error', 'warn'] : ['error', 'warn'],
  });

  let isDbConnected = false;
  try {
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 3000)),
    ]);
    isDbConnected = true;
    console.log('[StackLoop API] PostgreSQL connection established successfully.');
  } catch (error) {
    console.warn('[StackLoop API] PostgreSQL connection unavailable; using in-memory store for fallback.');
  }

  let repositoryRepository: RepositoryRepository;
  let authService: AuthService;

  const githubProvider = new HttpGithubOAuthProvider({
    clientId: config.github.clientId,
    clientSecret: config.github.clientSecret,
    redirectUri: config.github.redirectUri,
    apiBaseUrl: config.github.apiBaseUrl,
  });

  const tokenService = new TokenService({
    signingSecret: config.auth.signingSecret,
    issuer: config.auth.issuer,
    audience: config.auth.audience,
    accessTokenTtlSeconds: config.auth.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.auth.refreshTokenTtlSeconds,
  });

  if (isDbConnected) {
    authService = new AuthService({
      oauthStateRepository: new PrismaOAuthStateRepository(prisma),
      sessionRepository: new PrismaSessionRepository(prisma),
      refreshTokenRepository: new PrismaRefreshTokenRepository(prisma),
      userRepository: new PrismaAuthUserRepository(prisma),
      githubProvider,
      tokenService,
      oauthStateTtlSeconds: config.auth.oauthStateTtlSeconds,
      refreshTokenTtlSeconds: config.auth.refreshTokenTtlSeconds,
    });
    repositoryRepository = new PrismaRepositoryRepository(prisma);
  } else {
    authService = new AuthService({
      oauthStateRepository: new InMemoryOAuthStateRepository(),
      sessionRepository: new InMemorySessionRepository(),
      refreshTokenRepository: new InMemoryRefreshTokenRepository(),
      userRepository: new InMemoryAuthUserRepository(),
      githubProvider,
      tokenService,
      oauthStateTtlSeconds: config.auth.oauthStateTtlSeconds,
      refreshTokenTtlSeconds: config.auth.refreshTokenTtlSeconds,
    });
    const inMemoryRepo = new InMemoryRepositoryRepository();
    await populateSeedRepositories(inMemoryRepo);
    repositoryRepository = inMemoryRepo;
  }

  const queueProducer = new CloudTasksQueueProducer({
    aiServiceUrl: process.env.AI_SERVICE_URL,
    cloudTasksSecret: process.env.CLOUD_TASKS_SECRET,
    repositoryRepository,
  });

  const collectorService = new RepositoryCollectorService({
    githubService: new GitHubService({
      baseUrl: config.github.apiBaseUrl,
      token: config.github.token ?? '',
      rateLimitBuffer: 5,
    }),
    repositoryRepository,
    queueProducer,
  });

  const app = createApp({
    authService,
    repositoryController: new RepositoryController(collectorService, repositoryRepository),
    repositoryRepository,
    internalSecret: process.env.INTERNAL_SERVICE_SECRET || process.env.CLOUD_TASKS_SECRET,
    isProduction: config.isProduction,
    webAppOrigin: config.webAppOrigin,
    accessTokenTtlSeconds: config.auth.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.auth.refreshTokenTtlSeconds,
    trustProxy: config.isProduction,
  });

  const server = app.listen(config.port, () => {
    console.log(`StackLoop API listening on port ${config.port} (${config.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down.`);
    server.close(() => {
      if (isDbConnected) {
        void prisma.$disconnect().finally(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    console.error(error.message);
    process.exit(1);
  }

  console.error('Failed to start the StackLoop API', error);
  process.exit(1);
});
