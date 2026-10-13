import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpGithubOAuthProvider } from '../src/auth/providers/github-oauth.provider.js';

test('HttpGithubOAuthProvider demo mode generates frontend callback URL with mock code and state', () => {
  const provider = new HttpGithubOAuthProvider({
    clientId: 'placeholder-github-client-id',
    clientSecret: 'placeholder-github-client-secret',
    redirectUri: 'https://app.stackloop.dev/auth/callback',
    apiBaseUrl: 'https://api.github.com',
  });

  const url = provider.buildAuthorizationUrl({
    state: 'test-state-123',
    codeChallenge: 'test-challenge',
  });

  assert.equal(url, 'https://app.stackloop.dev/auth/callback?code=demo_oauth_code&state=test-state-123');
});

test('HttpGithubOAuthProvider demo mode exchanges mock code and provides mock profile', async () => {
  const provider = new HttpGithubOAuthProvider({
    clientId: 'placeholder-github-client-id',
    clientSecret: 'placeholder-github-client-secret',
    redirectUri: 'https://app.stackloop.dev/auth/callback',
    apiBaseUrl: 'https://api.github.com',
  });

  const token = await provider.exchangeCode({
    code: 'demo_oauth_code',
    codeVerifier: 'verifier',
  });
  assert.equal(token, 'demo_access_token');

  const profile = await provider.fetchProfile(token);
  assert.equal(profile.login, 'alex-developer');
  assert.equal(profile.name, 'Alex Rivera');
  assert.ok(profile.id > 0);
  assert.ok(profile.avatarUrl);
});
