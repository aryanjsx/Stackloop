import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { TokenService, type TokenSubject } from '../src/auth/tokens/token.service.js';
import { InvalidTokenError } from '../src/auth/errors.js';

const SECRET = 'test-signing-secret-that-is-long-enough-32';
const OTHER_SECRET = 'a-completely-different-secret-of-length-32';

const config = {
  signingSecret: SECRET,
  issuer: 'stackloop',
  audience: 'stackloop-api',
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 2592000,
};

const subject: TokenSubject = {
  userId: 'user-1',
  sessionId: 'session-1',
  role: 'user',
};

function createService(overrides: Partial<typeof config> = {}) {
  return new TokenService({ ...config, ...overrides });
}

test('issues an access token that round-trips through verification', async () => {
  const service = createService();
  const issued = await service.issueAccessToken(subject);

  const verified = await service.verifyAccessToken(issued.token);

  assert.equal(verified.userId, 'user-1');
  assert.equal(verified.sessionId, 'session-1');
  assert.equal(verified.role, 'user');
  assert.equal(verified.type, 'access');
  assert.equal(verified.jti, issued.jti);
});

test('the signing secret never appears in an issued token', async () => {
  // Regression test for defect D-01, where the token format was
  // `base64url(payload) + "." + signingSecret`, handing the secret to every client.
  const service = createService();
  const { token } = await service.issueAccessToken(subject);

  assert.equal(token.includes(SECRET), false);

  // Decoding every segment must not reveal it either.
  const decoded = token
    .split('.')
    .map((segment) => Buffer.from(segment, 'base64url').toString('utf8'))
    .join('');
  assert.equal(decoded.includes(SECRET), false);
});

test('rejects a token whose payload was tampered with', async () => {
  // Regression test for defect D-02: privilege escalation by editing the role claim.
  const service = createService();
  const { token } = await service.issueAccessToken(subject);

  const [header, payload, signature] = token.split('.');
  assert.ok(header && payload && signature);

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  decoded.role = 'admin';
  const forgedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');

  await assert.rejects(
    () => service.verifyAccessToken(`${header}.${forgedPayload}.${signature}`),
    InvalidTokenError,
  );
});

test('rejects an unsigned token forged from scratch', async () => {
  // The previous implementation accepted any base64url payload with no signature at all,
  // so this exact string granted admin access.
  const service = createService();
  const payload = Buffer.from(
    JSON.stringify({ sub: 'attacker', role: 'admin', sid: 's', type: 'access' }),
  ).toString('base64url');

  await assert.rejects(() => service.verifyAccessToken(`${payload}.`), InvalidTokenError);
  await assert.rejects(() => service.verifyAccessToken(payload), InvalidTokenError);
});

test('rejects a token signed with a different secret', async () => {
  const service = createService();
  const attacker = createService({ signingSecret: OTHER_SECRET });
  const { token } = await attacker.issueAccessToken({ ...subject, role: 'admin' });

  await assert.rejects(() => service.verifyAccessToken(token), InvalidTokenError);
});

test('rejects an expired token', async () => {
  const service = createService({ accessTokenTtlSeconds: 1 });
  const expired = await new SignJWT({ role: 'user', sid: 'session-1', type: 'access' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('user-1')
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .setJti('expired-jti')
    .sign(new TextEncoder().encode(SECRET));

  await assert.rejects(() => service.verifyAccessToken(expired), InvalidTokenError);
});

test('rejects a token with an unexpected issuer', async () => {
  const service = createService();
  const foreign = createService({ issuer: 'evil-issuer' });
  const { token } = await foreign.issueAccessToken(subject);

  await assert.rejects(() => service.verifyAccessToken(token), InvalidTokenError);
});

test('rejects a token with an unexpected audience', async () => {
  const service = createService();
  const foreign = createService({ audience: 'some-other-api' });
  const { token } = await foreign.issueAccessToken(subject);

  await assert.rejects(() => service.verifyAccessToken(token), InvalidTokenError);
});

test('rejects an "alg: none" token', async () => {
  const service = createService();
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'attacker',
      role: 'admin',
      sid: 'session-1',
      type: 'access',
      iss: config.issuer,
      aud: config.audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: 'forged',
    }),
  ).toString('base64url');

  await assert.rejects(() => service.verifyAccessToken(`${header}.${payload}.`), InvalidTokenError);
});

test('will not accept a refresh token where an access token is required', async () => {
  const service = createService();
  const refresh = await service.issueRefreshToken(subject);

  await assert.rejects(() => service.verifyAccessToken(refresh.token), InvalidTokenError);
});

test('will not accept an access token where a refresh token is required', async () => {
  const service = createService();
  const access = await service.issueAccessToken(subject);

  await assert.rejects(() => service.verifyRefreshToken(access.token), InvalidTokenError);
});

test('access and refresh tokens carry distinct expiries and ids', async () => {
  const service = createService();
  const access = await service.issueAccessToken(subject);
  const refresh = await service.issueRefreshToken(subject);

  assert.notEqual(access.jti, refresh.jti);
  assert.equal(access.expiresInSeconds, 900);
  assert.equal(refresh.expiresInSeconds, 2592000);
  assert.ok(refresh.expiresAt.getTime() > access.expiresAt.getTime());
});

test('hash comparison is length-safe and rejects mismatches', async () => {
  const hash = TokenService.hash('some-token');
  assert.equal(TokenService.hashesMatch(hash, TokenService.hash('some-token')), true);
  assert.equal(TokenService.hashesMatch(hash, TokenService.hash('another-token')), false);
  assert.equal(TokenService.hashesMatch(hash, ''), false);
  assert.equal(TokenService.hashesMatch('', ''), false);
});
