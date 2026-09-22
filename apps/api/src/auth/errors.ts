export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 401,
    public readonly code = 'AUTH_ERROR',
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AuthError {
  constructor(
    message = 'Request validation failed',
    public readonly details: Array<{ field: string; message: string }> = [],
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class InvalidStateError extends AuthError {
  constructor(message = 'The login attempt is invalid, expired, or already completed') {
    super(message, 400, 'INVALID_STATE');
  }
}

export class OAuthExchangeError extends AuthError {
  constructor(message = 'Could not complete sign-in with GitHub') {
    super(message, 502, 'OAUTH_EXCHANGE_FAILED');
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401, 'INVALID_TOKEN');
  }
}

export class InvalidRefreshTokenError extends AuthError {
  constructor(message = 'Invalid or expired refresh token') {
    super(message, 401, 'INVALID_REFRESH_TOKEN');
  }
}

/**
 * Raised when a refresh token that has already been rotated is presented again. Treated as a
 * potential token-theft signal: the session is revoked and the user must sign in again.
 */
export class RefreshTokenReuseError extends AuthError {
  constructor(message = 'Refresh token reuse detected; the session has been revoked') {
    super(message, 401, 'REFRESH_TOKEN_REUSE');
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Authentication is required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class AccountDisabledError extends AuthError {
  constructor(message = 'This account is disabled') {
    super(message, 403, 'ACCOUNT_DISABLED');
  }
}

export class CsrfTokenError extends AuthError {
  constructor(message = 'CSRF token validation failed') {
    super(message, 403, 'CSRF_TOKEN_INVALID');
  }
}
