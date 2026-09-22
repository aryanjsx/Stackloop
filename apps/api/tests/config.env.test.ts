import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigurationError, loadConfig } from '../src/config/env.js';

const validEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://stackloop:stackloop@localhost:5432/stackloop',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  GITHUB_REDIRECT_URI: 'http://localhost:3001/auth/github/callback',
  JWT_SIGNING_SECRET: 'test-signing-secret-that-is-long-enough-32',
} satisfies NodeJS.ProcessEnv;

test('loads a valid environment and applies documented defaults', () => {
  const config = loadConfig(validEnv);

  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.isProduction, false);
  assert.equal(config.port, 3001);
  assert.equal(config.auth.issuer, 'stackloop');
  assert.equal(config.auth.audience, 'stackloop-api');
  assert.equal(config.auth.accessTokenTtlSeconds, 900);
  assert.equal(config.auth.refreshTokenTtlSeconds, 2592000);
  assert.equal(config.auth.oauthStateTtlSeconds, 600);
  assert.equal(config.github.apiBaseUrl, 'https://api.github.com');
});

test('reports every missing required variable at once', () => {
  try {
    loadConfig({ NODE_ENV: 'development' });
    assert.fail('expected loadConfig to throw');
  } catch (error) {
    assert.ok(error instanceof ConfigurationError);
    const joined = error.issues.join('\n');
    // Regression test for the audit finding that these were documented but never read.
    assert.match(joined, /GITHUB_CLIENT_ID/);
    assert.match(joined, /GITHUB_CLIENT_SECRET/);
    assert.match(joined, /GITHUB_REDIRECT_URI/);
    assert.match(joined, /JWT_SIGNING_SECRET/);
    assert.match(joined, /DATABASE_URL/);
  }
});

test('rejects a signing secret that is too short', () => {
  assert.throws(
    () => loadConfig({ ...validEnv, JWT_SIGNING_SECRET: 'too-short' }),
    ConfigurationError,
  );
});

test('rejects a known placeholder signing secret in production', () => {
  const productionEnv = {
    ...validEnv,
    NODE_ENV: 'production',
    WEB_APP_ORIGIN: 'https://app.stackloop.dev',
    GITHUB_REDIRECT_URI: 'https://api.stackloop.dev/auth/github/callback',
    // Padded to satisfy the length rule, so this asserts the placeholder check specifically.
    JWT_SIGNING_SECRET: 'local-development-secret',
  };

  assert.throws(() => loadConfig(productionEnv), ConfigurationError);
});

test('allows the development fallback secret outside production', () => {
  const config = loadConfig({
    ...validEnv,
    JWT_SIGNING_SECRET: 'local-development-secret-padded-to-32',
  });

  assert.equal(config.isProduction, false);
});

test('requires https for redirect and web origin in production', () => {
  try {
    loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      GITHUB_REDIRECT_URI: 'http://api.stackloop.dev/auth/github/callback',
      WEB_APP_ORIGIN: 'http://app.stackloop.dev',
    });
    assert.fail('expected loadConfig to throw');
  } catch (error) {
    assert.ok(error instanceof ConfigurationError);
    const joined = error.issues.join('\n');
    assert.match(joined, /GITHUB_REDIRECT_URI must use https/);
    assert.match(joined, /WEB_APP_ORIGIN must use https/);
  }
});

test('rejects a refresh token lifetime shorter than the access token lifetime', () => {
  assert.throws(
    () =>
      loadConfig({
        ...validEnv,
        ACCESS_TOKEN_TTL_SECONDS: '3600',
        REFRESH_TOKEN_TTL_SECONDS: '60',
      }),
    ConfigurationError,
  );
});

test('rejects a non-numeric port', () => {
  assert.throws(() => loadConfig({ ...validEnv, PORT: 'not-a-port' }), ConfigurationError);
});

test('rejects a malformed redirect URI', () => {
  assert.throws(
    () => loadConfig({ ...validEnv, GITHUB_REDIRECT_URI: 'not-a-url' }),
    ConfigurationError,
  );
});

test('omits the GitHub token when it is not supplied', () => {
  const withoutToken = loadConfig(validEnv);
  assert.equal(withoutToken.github.token, undefined);

  const withToken = loadConfig({ ...validEnv, GITHUB_TOKEN: 'ghp_example' });
  assert.equal(withToken.github.token, 'ghp_example');
});
