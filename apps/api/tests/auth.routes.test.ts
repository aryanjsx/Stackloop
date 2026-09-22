import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { deriveChallenge } from '../src/auth/pkce.js';
import {
  cookieAttributes,
  createTestHarness,
  readCookie,
  type TestHarness,
} from './helpers/test-app.js';

/** Drives a full login and returns the issued credentials. */
async function login(harness: TestHarness, returnTo?: string) {
  const loginResponse = await request(harness.app)
    .get('/auth/github/login')
    .query(returnTo ? { return_to: returnTo } : {});

  assert.equal(loginResponse.status, 302);
  const state = new URL(loginResponse.headers.location).searchParams.get('state');
  assert.ok(state);

  const callback = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'valid-code', state });

  assert.equal(callback.status, 200);
  return {
    state,
    body: callback.body.data,
    setCookie: callback.headers['set-cookie'] as string[] | undefined,
  };
}

test('health endpoint responds without authentication', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app).get('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { data: { status: 'ok' } });
});

test('unknown routes return a structured 404', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app).get('/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

// ---------------------------------------------------------------------------
// GET /auth/github/login
// ---------------------------------------------------------------------------

test('login redirects to GitHub with a real S256 challenge derived from the stored verifier', async () => {
  // Regression test for D-09: the challenge used to be unrelated random bytes.
  const harness = createTestHarness();
  const response = await request(harness.app).get('/auth/github/login');

  assert.equal(response.status, 302);
  const location = new URL(response.headers.location);
  assert.equal(location.origin + location.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');

  const state = location.searchParams.get('state');
  const challenge = location.searchParams.get('code_challenge');
  assert.ok(state && challenge);

  const stored = await harness.oauthStates.consume(state, new Date());
  assert.ok(stored, 'the login attempt must be persisted server-side');
  assert.equal(deriveChallenge(stored.codeVerifier), challenge);
});

test('login rejects an absolute return_to, preventing an open redirect', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app)
    .get('/auth/github/login')
    .query({ return_to: 'https://evil.example.com/steal' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('login rejects a protocol-relative return_to', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app)
    .get('/auth/github/login')
    .query({ return_to: '//evil.example.com' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('login accepts a relative return_to and carries it through the callback', async () => {
  const harness = createTestHarness();
  const { body } = await login(harness, '/repositories/42');

  assert.equal(body.return_to, '/repositories/42');
});

test('each login issues a distinct state and verifier', async () => {
  const harness = createTestHarness();
  const first = await request(harness.app).get('/auth/github/login');
  const second = await request(harness.app).get('/auth/github/login');

  const firstState = new URL(first.headers.location).searchParams.get('state');
  const secondState = new URL(second.headers.location).searchParams.get('state');

  assert.notEqual(firstState, secondState);
});

// ---------------------------------------------------------------------------
// GET /auth/github/callback
// ---------------------------------------------------------------------------

test('callback exchanges the code with GitHub and creates a real user and session', async () => {
  // Regression test for D-04 and D-05: the callback used to hardcode the profile and never
  // contact GitHub at all.
  const harness = createTestHarness();
  const { body } = await login(harness);

  assert.equal(harness.github.exchangeCallCount, 1);
  assert.equal(harness.github.lastExchange?.code, 'valid-code');
  assert.ok(harness.github.lastExchange?.codeVerifier);

  assert.equal(body.user.username, 'octocat');
  assert.equal(body.user.github_id, 4242);
  assert.equal(body.user.role, 'user');
  assert.equal(harness.users.users.size, 1);
  assert.equal(harness.sessions.records.size, 1);
});

test('callback presents the stored verifier, not a fresh one', async () => {
  const harness = createTestHarness();
  const loginResponse = await request(harness.app).get('/auth/github/login');
  const location = new URL(loginResponse.headers.location);
  const state = location.searchParams.get('state')!;
  const challenge = location.searchParams.get('code_challenge')!;

  await request(harness.app).get('/auth/github/callback').query({ code: 'valid-code', state });

  assert.equal(deriveChallenge(harness.github.lastExchange!.codeVerifier), challenge);
});

test('callback rejects an unknown state without contacting GitHub', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'valid-code', state: 'never-issued' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_STATE');
  // The code must never be presented to the provider when state validation fails.
  assert.equal(harness.github.exchangeCallCount, 0);
});

test('callback rejects a replayed state', async () => {
  const harness = createTestHarness();
  const loginResponse = await request(harness.app).get('/auth/github/login');
  const state = new URL(loginResponse.headers.location).searchParams.get('state')!;

  const first = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'valid-code', state });
  assert.equal(first.status, 200);

  const replay = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'valid-code', state });

  assert.equal(replay.status, 400);
  assert.equal(replay.body.error.code, 'INVALID_STATE');
  assert.equal(harness.github.exchangeCallCount, 1);
});

test('callback rejects an expired state', async () => {
  // Regression test for D-13: the state store previously had no TTL at all.
  const harness = createTestHarness({ oauthStateTtlSeconds: 60 });
  const loginResponse = await request(harness.app).get('/auth/github/login');
  const state = new URL(loginResponse.headers.location).searchParams.get('state')!;

  harness.advanceSeconds(120);

  const response = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'valid-code', state });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_STATE');
});

test('callback requires both code and state', async () => {
  const harness = createTestHarness();

  const noCode = await request(harness.app).get('/auth/github/callback').query({ state: 'x' });
  assert.equal(noCode.status, 400);
  assert.equal(noCode.body.error.code, 'VALIDATION_ERROR');

  const noState = await request(harness.app).get('/auth/github/callback').query({ code: 'x' });
  assert.equal(noState.status, 400);
  assert.equal(noState.body.error.code, 'VALIDATION_ERROR');
});

test('callback surfaces a provider failure as 502, not 500', async () => {
  const harness = createTestHarness();
  harness.github.failExchange = true;

  const loginResponse = await request(harness.app).get('/auth/github/login');
  const state = new URL(loginResponse.headers.location).searchParams.get('state')!;

  const response = await request(harness.app)
    .get('/auth/github/callback')
    .query({ code: 'bad-code', state });

  assert.equal(response.status, 502);
  assert.equal(response.body.error.code, 'OAUTH_EXCHANGE_FAILED');
});

test('callback sets HttpOnly session cookies and a readable CSRF cookie', async () => {
  const harness = createTestHarness();
  const { setCookie } = await login(harness);

  const access = cookieAttributes(setCookie, 'stackloop_access_token');
  assert.ok(access);
  assert.match(access, /HttpOnly/i);
  assert.match(access, /SameSite=Lax/i);

  const refresh = cookieAttributes(setCookie, 'stackloop_refresh_token');
  assert.ok(refresh);
  assert.match(refresh, /HttpOnly/i);
  assert.match(refresh, /SameSite=Strict/i);
  assert.match(refresh, /Path=\/auth\/refresh/i);

  // The CSRF cookie must be readable by the browser app for the double-submit pattern.
  const csrf = cookieAttributes(setCookie, 'csrf_token');
  assert.ok(csrf);
  assert.doesNotMatch(csrf, /HttpOnly/i);
});

test('signing in twice reuses the account rather than duplicating it', async () => {
  const harness = createTestHarness();
  const first = await login(harness);
  const second = await login(harness);

  assert.equal(harness.users.users.size, 1);
  assert.equal(first.body.user.id, second.body.user.id);
  // A second sign-in is a separate session.
  assert.equal(harness.sessions.records.size, 2);
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

test('me rejects an anonymous request', async () => {
  // Regression test for D-07: the middleware used to call next() regardless of the outcome.
  const harness = createTestHarness();
  const response = await request(harness.app).get('/auth/me');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('me rejects a forged token claiming the admin role', async () => {
  // Regression test for D-02. This exact request granted admin access before.
  const harness = createTestHarness();
  const forged = Buffer.from(
    JSON.stringify({ sub: 'attacker', role: 'admin', sid: 'anything', type: 'access' }),
  ).toString('base64url');

  const response = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${forged}.`);

  assert.equal(response.status, 401);
});

test('me returns the authenticated user via bearer token', async () => {
  const harness = createTestHarness();
  const { body } = await login(harness);

  const response = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${body.access_token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.username, 'octocat');
  assert.equal(response.body.data.github_id, 4242);
});

test('me returns the authenticated user via session cookie', async () => {
  const harness = createTestHarness();
  const { setCookie } = await login(harness);
  const accessToken = readCookie(setCookie, 'stackloop_access_token');

  const response = await request(harness.app)
    .get('/auth/me')
    .set('Cookie', `stackloop_access_token=${accessToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.username, 'octocat');
});

test('me rejects a token whose session has been revoked', async () => {
  // A valid signature is not sufficient; the backing session must still be live.
  const harness = createTestHarness();
  const { body } = await login(harness);
  const sessionId = [...harness.sessions.records.keys()][0]!;

  await harness.sessions.revoke(sessionId, 'test', new Date());

  const response = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${body.access_token}`);

  assert.equal(response.status, 401);
});

test('me rejects an access token after it expires', async () => {
  const harness = createTestHarness({ accessTokenTtlSeconds: 1 });
  const { body } = await login(harness);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const response = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${body.access_token}`);

  assert.equal(response.status, 401);
});

test('me rejects a token belonging to a deactivated account', async () => {
  const harness = createTestHarness();
  const { body } = await login(harness);
  const user = [...harness.users.users.values()][0]!;
  harness.users.setUser({ ...user, isActive: false });

  const response = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${body.access_token}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'ACCOUNT_DISABLED');
});

test('me rejects a malformed authorization header', async () => {
  const harness = createTestHarness();

  for (const header of ['Bearer', 'Bearer   ', 'Basic abc123', 'token abc']) {
    const response = await request(harness.app).get('/auth/me').set('Authorization', header);
    assert.equal(response.status, 401, `expected 401 for header "${header}"`);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

test('refresh rotates both tokens', async () => {
  const harness = createTestHarness();
  const { body } = await login(harness);

  const response = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: body.refresh_token });

  assert.equal(response.status, 200);
  assert.notEqual(response.body.data.refresh_token, body.refresh_token);
  assert.equal(typeof response.body.data.access_token, 'string');
  assert.equal(response.body.data.expires_in, 900);
});

test('refresh requires a token', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app).post('/auth/refresh').send({});

  assert.equal(response.status, 401);
});

test('refresh rejects an unknown token', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: 'not-a-real-token' });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_REFRESH_TOKEN');
});

test('refresh rejects an access token presented in its place', async () => {
  const harness = createTestHarness();
  const { body } = await login(harness);

  const response = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: body.access_token });

  assert.equal(response.status, 401);
});

test('replaying a rotated refresh token revokes the whole session', async () => {
  // Regression test for D-11: rotation existed, but reuse was not detected and the session
  // chain was never revoked.
  const harness = createTestHarness();
  const { body } = await login(harness);

  const first = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: body.refresh_token });
  assert.equal(first.status, 200);

  // Replay the original, now-spent token.
  const replay = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: body.refresh_token });

  assert.equal(replay.status, 401);
  assert.equal(replay.body.error.code, 'REFRESH_TOKEN_REUSE');

  // The legitimate successor token must also be dead, forcing a fresh sign-in.
  const afterRevocation = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: first.body.data.refresh_token });
  assert.equal(afterRevocation.status, 401);

  // And the access token issued alongside it no longer resolves.
  const me = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${first.body.data.access_token}`);
  assert.equal(me.status, 401);
});

test('refresh clears cookies when it fails', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: 'garbage' });

  assert.equal(response.status, 401);
  const setCookie = response.headers['set-cookie'] as string[] | undefined;
  assert.ok(setCookie?.some((entry) => entry.startsWith('stackloop_access_token=;')));
});

test('refresh prefers the cookie over a body value', async () => {
  const harness = createTestHarness();
  const { body, setCookie } = await login(harness);
  const cookieToken = readCookie(setCookie, 'stackloop_refresh_token');

  const response = await request(harness.app)
    .post('/auth/refresh')
    .set('Cookie', `stackloop_refresh_token=${cookieToken}`)
    .send({ refresh_token: 'a-stale-value' });

  assert.equal(response.status, 200);
  assert.notEqual(response.body.data.refresh_token, body.refresh_token);
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

test('logout requires authentication', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app).post('/auth/logout').send({});

  assert.equal(response.status, 401);
});

test('logout cannot revoke another user\'s session from the request body', async () => {
  // Regression test for D-03: logout used to take session_id from an unauthenticated body,
  // letting anyone revoke any session they could name.
  const harness = createTestHarness();
  const victim = await login(harness);
  const victimSessionId = victim.body.user.id && [...harness.sessions.records.keys()][0]!;

  const response = await request(harness.app)
    .post('/auth/logout')
    .send({ session_id: victimSessionId });

  assert.equal(response.status, 401);

  // The victim's session is untouched.
  const me = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${victim.body.access_token}`);
  assert.equal(me.status, 200);
});

test('logout revokes only the caller\'s own session', async () => {
  const harness = createTestHarness();
  const first = await login(harness);
  const second = await login(harness);

  const response = await request(harness.app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${first.body.access_token}`)
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.data.success, true);

  const firstAfter = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${first.body.access_token}`);
  assert.equal(firstAfter.status, 401);

  // The user's other session is unaffected.
  const secondAfter = await request(harness.app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${second.body.access_token}`);
  assert.equal(secondAfter.status, 200);
});

test('logout invalidates the refresh token too', async () => {
  const harness = createTestHarness();
  const { body } = await login(harness);

  await request(harness.app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${body.access_token}`)
    .send({});

  const response = await request(harness.app)
    .post('/auth/refresh')
    .send({ refresh_token: body.refresh_token });

  assert.equal(response.status, 401);
});

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

test('a cookie-authenticated mutation without a CSRF header is rejected', async () => {
  // Regression test for D-08: the CSRF middleware existed but was mounted nowhere.
  const harness = createTestHarness();
  const { setCookie } = await login(harness);
  const accessToken = readCookie(setCookie, 'stackloop_access_token');
  const csrf = readCookie(setCookie, 'csrf_token');

  const response = await request(harness.app)
    .post('/auth/logout')
    .set('Cookie', `stackloop_access_token=${accessToken}; csrf_token=${csrf}`)
    .send({});

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'CSRF_TOKEN_INVALID');
});

test('a cookie-authenticated mutation with a mismatched CSRF header is rejected', async () => {
  const harness = createTestHarness();
  const { setCookie } = await login(harness);
  const accessToken = readCookie(setCookie, 'stackloop_access_token');
  const csrf = readCookie(setCookie, 'csrf_token');

  const response = await request(harness.app)
    .post('/auth/logout')
    .set('Cookie', `stackloop_access_token=${accessToken}; csrf_token=${csrf}`)
    .set('X-CSRF-Token', 'a-different-value-of-same-ish-length')
    .send({});

  assert.equal(response.status, 403);
});

test('a cookie-authenticated mutation with a matching CSRF header succeeds', async () => {
  const harness = createTestHarness();
  const { setCookie } = await login(harness);
  const accessToken = readCookie(setCookie, 'stackloop_access_token');
  const csrf = readCookie(setCookie, 'csrf_token')!;

  const response = await request(harness.app)
    .post('/auth/logout')
    .set('Cookie', `stackloop_access_token=${accessToken}; csrf_token=${csrf}`)
    .set('X-CSRF-Token', csrf)
    .send({});

  assert.equal(response.status, 200);
});

test('a bearer-authenticated mutation does not require a CSRF token', async () => {
  // A cross-site attacker cannot cause an Authorization header to be sent, so CSRF does not
  // apply to header-authenticated API clients.
  const harness = createTestHarness();
  const { body } = await login(harness);

  const response = await request(harness.app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${body.access_token}`)
    .send({});

  assert.equal(response.status, 200);
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

test('a malformed JSON body is a client error, not a server error', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app)
    .post('/auth/refresh')
    .set('Content-Type', 'application/json')
    .send('{"refresh_token": ');

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'MALFORMED_JSON');
});

test('security headers are applied', async () => {
  const harness = createTestHarness();
  const response = await request(harness.app).get('/health');

  assert.equal(response.headers['x-powered-by'], undefined);
  assert.ok(response.headers['x-content-type-options']);
});
