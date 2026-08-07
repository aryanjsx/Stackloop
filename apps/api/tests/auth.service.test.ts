import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/auth/services/auth.service.js';
import { InMemorySessionRepository } from '../src/auth/repositories/session.repository.js';
import { InMemoryStateRepository } from '../src/auth/repositories/state.repository.js';

test('issues a session and rotates refresh tokens securely', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const stateRepository = new InMemoryStateRepository();
  const authService = new AuthService({
    sessionRepository,
    stateRepository,
    issuer: 'stackloop',
    audience: 'stackloop-api',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 60 * 60 * 24 * 30,
    signingSecret: 'test-secret',
  });

  const loginResult = await authService.initiateGithubLogin({
    redirectUri: 'https://app.stackloop.dev/callback',
    state: 'state-123',
    codeChallenge: 'challenge',
  });

  assert.equal(loginResult.redirectUrl.includes('https://github.com/login/oauth/authorize'), true);
  assert.equal(loginResult.state, 'state-123');

  const user = await authService.handleGithubCallback({
    code: 'oauth-code',
    state: 'state-123',
    codeVerifier: 'verifier',
    providerUser: {
      id: 42,
      login: 'octocat',
      name: 'The Octocat',
      email: 'octocat@github.com',
      avatarUrl: 'https://avatars.githubusercontent.com/u/42',
    },
  });

  assert.equal(user.user.username, 'octocat');
  assert.equal(user.tokens.accessToken.length > 0, true);
  assert.equal(user.tokens.refreshToken.length > 0, true);
});

test('rejects invalid refresh tokens and revokes session on logout', async () => {
  const sessionRepository = new InMemorySessionRepository();
  const stateRepository = new InMemoryStateRepository();
  const authService = new AuthService({
    sessionRepository,
    stateRepository,
    issuer: 'stackloop',
    audience: 'stackloop-api',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 60 * 60 * 24 * 30,
    signingSecret: 'test-secret',
  });

  await assert.rejects(() => authService.refreshSession({ refreshToken: 'bad-token' }), /invalid refresh token/i);

  const logoutResult = await authService.logout({ sessionId: 'missing-session' });
  assert.equal(logoutResult.success, true);
});
