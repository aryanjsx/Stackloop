# ADR-0001: JWT signing algorithm

- **Status:** Accepted
- **Date:** 2026-09-22
- **Phase:** 4 (Core Backend Development)
- **Amends:** [auth-security-spec.md](../auth-security-spec.md) §6

## Context

The authentication specification recommends asymmetric signing for access tokens:

> Use asymmetric signing (RS256 or ES256) ... Rotate signing keys over time.

The environment contract that the rest of the project has standardized on, however, is a single
shared secret, `JWT_SIGNING_SECRET`, which implies symmetric HS256. The two are inconsistent,
and Phase 4 cannot implement token signing without resolving the inconsistency.

Asymmetric signing earns its complexity when tokens are verified by parties that should not be
able to *mint* them — separate services, third-party consumers, or a public API. For the MVP,
`apps/api` is the only issuer and the only verifier. `services/ai` does not validate user tokens,
and a public API is explicitly out of MVP scope per [PRD](../prd.md) §5. There is currently no
party that needs verify-only capability.

## Decision

Phase 4 implements **HS256** with a single shared secret supplied via `JWT_SIGNING_SECRET`.

Requirements that are **not** relaxed by this decision:

- The signature must be genuinely computed and genuinely verified. The signing secret must never
  appear in a token.
- `exp`, `iss`, and `aud` must be validated on every request, rejecting tokens that are expired
  or carry an unexpected issuer or audience.
- `JWT_SIGNING_SECRET` must be supplied by the environment, with no production fallback default.
  The API must refuse to start in production if it is unset.
- Refresh tokens remain server-side records: stored as hashes, rotated on use, and revocable.
  Access-token validity alone never grants access; the backing session must be live.

## Consequences

**Accepted now.** Simpler key management, no key distribution or JWKS endpoint, and one
environment variable instead of a managed key pair. Matches the existing documented env contract,
so no downstream configuration changes.

**Cost.** Any service given the secret in order to verify tokens can also forge them. This is
acceptable while `apps/api` is the sole issuer and verifier.

**Migration trigger.** Revisit and move to RS256 when any of the following becomes true:

1. A second service needs to verify user tokens independently.
2. A public API or third-party SDK is shipped.
3. Key rotation without invalidating all live sessions becomes a requirement.

Tracked as a Phase 10 (DevOps & Deployment) hardening item. The token layer must therefore keep
the signing algorithm behind a single module so that swapping it does not touch call sites.
