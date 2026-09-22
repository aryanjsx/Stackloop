import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { InvalidTokenError } from '../errors.js';
import type { UserRole } from '../types.js';

/**
 * Token signing and verification.
 *
 * Deliberately the only place in the codebase that knows the signing algorithm, so that the
 * move to RS256 described in docs/adr/0001-jwt-signing-algorithm.md does not touch call sites.
 */

export type TokenType = 'access' | 'refresh';

export interface TokenSubject {
  userId: string;
  sessionId: string;
  role: UserRole;
}

export interface IssuedToken {
  token: string;
  jti: string;
  expiresAt: Date;
  expiresInSeconds: number;
}

export interface VerifiedToken extends TokenSubject {
  jti: string;
  type: TokenType;
  expiresAt: Date;
}

export interface TokenServiceConfig {
  signingSecret: string;
  issuer: string;
  audience: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

const ALGORITHM = 'HS256';

export class TokenService {
  private readonly key: Uint8Array;

  constructor(private readonly config: TokenServiceConfig) {
    this.key = new TextEncoder().encode(config.signingSecret);
  }

  async issueAccessToken(subject: TokenSubject): Promise<IssuedToken> {
    return this.issue(subject, 'access', this.config.accessTokenTtlSeconds);
  }

  async issueRefreshToken(subject: TokenSubject): Promise<IssuedToken> {
    return this.issue(subject, 'refresh', this.config.refreshTokenTtlSeconds);
  }

  async verifyAccessToken(token: string): Promise<VerifiedToken> {
    return this.verify(token, 'access');
  }

  async verifyRefreshToken(token: string): Promise<VerifiedToken> {
    return this.verify(token, 'refresh');
  }

  /**
   * Hash used for the copy of a token stored in the database. Tokens are high-entropy random
   * values, so a fast digest is appropriate here; this is not password hashing.
   */
  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Constant-time comparison of two hex digests, so that comparing a presented token against a
   * stored one cannot be used as a timing oracle.
   */
  static hashesMatch(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    if (left.length !== right.length || left.length === 0) {
      return false;
    }
    return timingSafeEqual(left, right);
  }

  private async issue(subject: TokenSubject, type: TokenType, ttlSeconds: number): Promise<IssuedToken> {
    const jti = randomUUID();
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAt + ttlSeconds;

    const token = await new SignJWT({ role: subject.role, sid: subject.sessionId, type })
      .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
      .setSubject(subject.userId)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAtSeconds)
      .setJti(jti)
      .sign(this.key);

    return {
      token,
      jti,
      expiresAt: new Date(expiresAtSeconds * 1000),
      expiresInSeconds: ttlSeconds,
    };
  }

  private async verify(token: string, expectedType: TokenType): Promise<VerifiedToken> {
    let payload: JWTPayload;

    try {
      // Verifies the signature and rejects expired tokens, or tokens whose issuer or audience
      // does not match. Pinning `algorithms` prevents algorithm-confusion attacks such as a
      // token presented with alg "none".
      ({ payload } = await jwtVerify(token, this.key, {
        algorithms: [ALGORITHM],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }));
    } catch {
      // The underlying reason is deliberately not surfaced to the caller; distinguishing
      // "bad signature" from "expired" gives an attacker free information.
      throw new InvalidTokenError();
    }

    const { sub, jti, exp, role, sid, type } = payload as JWTPayload & {
      role?: unknown;
      sid?: unknown;
      type?: unknown;
    };

    if (typeof sub !== 'string' || sub.length === 0) {
      throw new InvalidTokenError();
    }
    if (typeof jti !== 'string' || jti.length === 0) {
      throw new InvalidTokenError();
    }
    if (typeof exp !== 'number') {
      throw new InvalidTokenError();
    }
    if (typeof sid !== 'string' || sid.length === 0) {
      throw new InvalidTokenError();
    }
    if (typeof role !== 'string' || role.length === 0) {
      throw new InvalidTokenError();
    }
    // A refresh token must never be accepted where an access token is required, or vice versa.
    if (type !== expectedType) {
      throw new InvalidTokenError();
    }

    return {
      userId: sub,
      sessionId: sid,
      role: role as UserRole,
      jti,
      type: expectedType,
      expiresAt: new Date(exp * 1000),
    };
  }
}
