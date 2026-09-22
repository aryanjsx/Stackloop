import { createHash, randomBytes } from 'node:crypto';

/**
 * PKCE helpers, per RFC 7636.
 *
 * The previous implementation generated the "challenge" as unrelated random bytes, so it was
 * never derived from the verifier and proved nothing. `deriveChallenge` is the real S256
 * transform: BASE64URL(SHA256(ASCII(verifier))).
 *
 * Note that GitHub's OAuth App endpoints do not currently implement PKCE; the extra parameters
 * are ignored by the provider. They are sent because auth-security-spec.md section 3 requires
 * them and because they become effective the moment the provider supports them. The protection
 * that is actually load-bearing against authorization-code CSRF today is the single-use `state`
 * value, which is validated server-side before any code exchange occurs.
 */

/** Length in bytes. 32 bytes base64url-encodes to 43 characters, the RFC's recommended minimum. */
const VERIFIER_BYTES = 32;

export function createCodeVerifier(): string {
  return randomBytes(VERIFIER_BYTES).toString('base64url');
}

export function deriveChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
}

export function createState(): string {
  return randomBytes(VERIFIER_BYTES).toString('base64url');
}
