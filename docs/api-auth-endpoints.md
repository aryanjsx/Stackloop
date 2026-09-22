# Authentication Endpoints

Implementation reference for the endpoints in `apps/api/src/auth/`. The design rationale lives in
[auth-security-spec.md](./auth-security-spec.md); this document records what is actually served.

All responses are JSON. Success bodies are wrapped in `data`, failures in `error`.

```jsonc
// success
{ "data": { /* ... */ } }

// failure
{ "error": { "code": "INVALID_STATE", "message": "...", "details": [] } }
```

`details` is present only on validation errors.

## Error codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request parameters failed validation; see `details` |
| `MALFORMED_JSON` | 400 | The request body is not valid JSON |
| `INVALID_STATE` | 400 | The login attempt is unknown, expired, or already completed |
| `UNAUTHORIZED` | 401 | Authentication is required or the credentials are unusable |
| `INVALID_TOKEN` | 401 | The access token is missing, malformed, expired, or not genuine |
| `INVALID_REFRESH_TOKEN` | 401 | The refresh token is unknown, expired, or revoked |
| `REFRESH_TOKEN_REUSE` | 401 | A spent refresh token was replayed; the session has been revoked |
| `ACCOUNT_DISABLED` | 403 | The account exists but is deactivated |
| `FORBIDDEN` | 403 | Authenticated, but the role is insufficient |
| `CSRF_TOKEN_INVALID` | 403 | A cookie-authenticated mutation had a missing or mismatched CSRF token |
| `RATE_LIMITED` | 429 | Too many attempts within the window |
| `OAUTH_EXCHANGE_FAILED` | 502 | GitHub rejected the code or could not be reached |
| `INTERNAL_ERROR` | 500 | Unexpected failure; details are withheld in production |

## Authenticating a request

Two mechanisms are supported.

**Bearer token**, for API clients and server-to-server calls:

```http
Authorization: Bearer <access_token>
```

**Session cookie**, set automatically for browsers. `stackloop_access_token` is `HttpOnly`, so
JavaScript cannot read it. Because cookies are sent ambiently, cookie-authenticated
state-changing requests additionally require a CSRF header — see [CSRF](#csrf) below.

A valid token signature is never sufficient on its own. The session it was issued for must still
exist, be unrevoked, and be unexpired, and the account must be active.

---

## `GET /auth/github/login`

Starts a login and redirects to GitHub's consent screen. Server-side, it stores a single-use
`state` and a PKCE verifier that expire after `OAUTH_STATE_TTL_SECONDS`.

**Query parameters**

| Name | Required | Notes |
|---|---|---|
| `return_to` | no | Where to send the user after login. Must be a relative path beginning with `/`. Absolute and protocol-relative values are rejected to prevent an open redirect. |

```bash
curl -i "http://localhost:3001/auth/github/login?return_to=/repositories/42"
```

**302** with a `Location` pointing at `https://github.com/login/oauth/authorize`, carrying
`client_id`, `redirect_uri`, `scope=read:user user:email`, `state`, `code_challenge`, and
`code_challenge_method=S256`.

**400** `VALIDATION_ERROR` if `return_to` is not a safe relative path.

> GitHub's OAuth Apps do not currently implement PKCE, so the challenge parameters are ignored by
> the provider. They are sent because the specification requires them and they become effective
> if GitHub adds support. The protection that is load-bearing today is the single-use `state`,
> validated server-side before any code is exchanged.

---

## `GET /auth/github/callback`

Where GitHub returns the user. Validates and consumes the `state` **before** exchanging the code,
so a code injected by a third party is never presented to GitHub.

**Query parameters:** `code` and `state`, both required.

```bash
curl -i "http://localhost:3001/auth/github/callback?code=<code>&state=<state>"
```

**200**

```json
{
  "data": {
    "user": {
      "id": "0b1f...",
      "github_id": 4242,
      "username": "octocat",
      "display_name": "The Octocat",
      "email": "octocat@github.com",
      "avatar_url": "https://avatars.githubusercontent.com/u/4242",
      "role": "user",
      "is_verified": true
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "return_to": "/repositories/42"
  }
}
```

Also sets three cookies:

| Cookie | Flags | Purpose |
|---|---|---|
| `stackloop_access_token` | `HttpOnly`, `SameSite=Lax`, `Path=/` | Browser access credential |
| `stackloop_refresh_token` | `HttpOnly`, `SameSite=Strict`, `Path=/auth/refresh` | Scoped so it is not sent on ordinary requests |
| `csrf_token` | readable by JavaScript, `SameSite=Lax` | Copied into `X-CSRF-Token` for the double-submit check |

`Secure` is applied to all three when `NODE_ENV=production`.

**Errors:** `400 VALIDATION_ERROR` (missing `code` or `state`), `400 INVALID_STATE` (unknown,
expired, or replayed state), `403 ACCOUNT_DISABLED`, `502 OAUTH_EXCHANGE_FAILED`.

---

## `POST /auth/refresh`

Rotates the refresh token and issues a new pair. Does **not** require an access token — the
access token has usually expired by the time this is called.

The token is read from the `stackloop_refresh_token` cookie when present, otherwise from the
body. The cookie takes precedence so a stale body value cannot override a live session.

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token": "<refresh_token>"}'
```

**200**

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900
  }
}
```

**Reuse detection.** Every issued refresh token is stored (hashed) and marked spent when rotated.
Presenting an already-rotated token is treated as evidence of theft: the entire session is
revoked and the response is `401 REFRESH_TOKEN_REUSE`. This invalidates the attacker's token and
the legitimate user's alike, forcing a fresh sign-in. Any failed refresh also clears the auth
cookies so clients do not loop against a dead session.

**Errors:** `401 UNAUTHORIZED` (no token supplied), `401 INVALID_REFRESH_TOKEN`,
`401 REFRESH_TOKEN_REUSE`, `403 ACCOUNT_DISABLED`, `403 CSRF_TOKEN_INVALID`, `429 RATE_LIMITED`.

---

## `POST /auth/logout`

Revokes the caller's session and clears the auth cookies. **Requires authentication.**

The session revoked is the one named in the caller's own verified token. There is no way to
specify a session id in the request; any `session_id` in the body is ignored.

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

**200** `{ "data": { "success": true } }`

Only the current session is revoked. A user signed in on another device stays signed in there.

**Errors:** `401 UNAUTHORIZED`, `403 CSRF_TOKEN_INVALID`.

---

## `GET /auth/me`

Returns the authenticated user. **Requires authentication.**

```bash
curl http://localhost:3001/auth/me -H "Authorization: Bearer <access_token>"
```

**200**

```json
{
  "data": {
    "id": "0b1f...",
    "github_id": 4242,
    "username": "octocat",
    "display_name": "The Octocat",
    "email": "octocat@github.com",
    "avatar_url": "https://avatars.githubusercontent.com/u/4242",
    "role": "user",
    "is_verified": true,
    "session_id": "6c2a..."
  }
}
```

**Errors:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `403 ACCOUNT_DISABLED`.

---

## CSRF

Applies to state-changing requests (`POST`, `PATCH`, `PUT`, `DELETE`) that authenticate **via
cookies**. Read the `csrf_token` cookie and echo it back in the `X-CSRF-Token` header:

```http
POST /auth/logout
Cookie: stackloop_access_token=...; csrf_token=abc123
X-CSRF-Token: abc123
```

Requests authenticated with an `Authorization` header are exempt, because a cross-site attacker
cannot cause that header to be attached.

## Rate limits

| Endpoints | Limit |
|---|---|
| `/auth/github/login`, `/auth/github/callback` | 30 per 15 minutes |
| `/auth/refresh` | 60 per 15 minutes |

Exceeding a limit returns `429` with `RATE_LIMITED`. Standard `RateLimit-*` headers are included.

## Token lifetimes

| Token | Default | Variable |
|---|---|---|
| Access | 15 minutes | `ACCESS_TOKEN_TTL_SECONDS` |
| Refresh | 30 days | `REFRESH_TOKEN_TTL_SECONDS` |
| OAuth state | 10 minutes | `OAUTH_STATE_TTL_SECONDS` |

Tokens are HS256 JWTs carrying `sub`, `role`, `sid`, `type`, `iss`, `aud`, `iat`, `exp`, and
`jti`. See [ADR-0001](./adr/0001-jwt-signing-algorithm.md) for why HS256 rather than RS256.

---

## Repository ingestion

`POST /repositories/sync` and `POST /repositories/sync/batch` require the `admin` role: they
spend GitHub API quota and write shared data.

```bash
curl -X POST http://localhost:3001/repositories/sync \
  -H "Authorization: Bearer <admin_access_token>" \
  -H 'Content-Type: application/json' \
  -d '{"owner": "vercel", "repo": "next.js"}'
```

**200**

```json
{
  "data": {
    "created": true,
    "repository_id": "9d3c...",
    "full_name": "vercel/next.js",
    "summary_queued": false,
    "search_index_queued": false
  }
}
```

`summary_queued` and `search_index_queued` report `false` because the job queue is not built yet;
that is Phase 5 work. The batch variant takes `{ "items": [{ "owner": "...", "repo": "..." }] }`
with at most 50 entries.
