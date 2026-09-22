import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { ConfigurationError, loadConfig } from './config/env.js';
import { AuthService } from './auth/services/auth.service.js';
import { HttpGithubOAuthProvider } from './auth/providers/github-oauth.provider.js';
import { PrismaAuthUserRepository } from './auth/repositories/prisma-auth-user.repository.js';
import { PrismaOAuthStateRepository } from './auth/repositories/prisma-oauth-state.repository.js';
import { PrismaRefreshTokenRepository } from './auth/repositories/prisma-refresh-token.repository.js';
import { PrismaSessionRepository } from './auth/repositories/prisma-session.repository.js';
import { TokenService } from './auth/tokens/token.service.js';

/**
 * Process entrypoint. Composes the real, database-backed implementations and starts listening.
 *
 * Before this existed, `createAuthServer()` and `createRepositoryRoutes()` each built a separate
 * http.Server that nothing ever called, so the API could not be started at all.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  const prisma = new PrismaClient({
    log: config.isProduction ? ['error', 'warn'] : ['error', 'warn'],
  });

  // Fail before accepting traffic rather than on the first request.
  await prisma.$connect();

  const authService = new AuthService({
    oauthStateRepository: new PrismaOAuthStateRepository(prisma),
    sessionRepository: new PrismaSessionRepository(prisma),
    refreshTokenRepository: new PrismaRefreshTokenRepository(prisma),
    userRepository: new PrismaAuthUserRepository(prisma),
    githubProvider: new HttpGithubOAuthProvider({
      clientId: config.github.clientId,
      clientSecret: config.github.clientSecret,
      redirectUri: config.github.redirectUri,
      apiBaseUrl: config.github.apiBaseUrl,
    }),
    tokenService: new TokenService({
      signingSecret: config.auth.signingSecret,
      issuer: config.auth.issuer,
      audience: config.auth.audience,
      accessTokenTtlSeconds: config.auth.accessTokenTtlSeconds,
      refreshTokenTtlSeconds: config.auth.refreshTokenTtlSeconds,
    }),
    oauthStateTtlSeconds: config.auth.oauthStateTtlSeconds,
    refreshTokenTtlSeconds: config.auth.refreshTokenTtlSeconds,
  });

  const app = createApp({
    authService,
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
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    // Configuration problems are operator errors; a stack trace only obscures the fix.
    console.error(error.message);
    process.exit(1);
  }

  console.error('Failed to start the StackLoop API', error);
  process.exit(1);
});
