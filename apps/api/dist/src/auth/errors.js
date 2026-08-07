export class AuthError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 401, code = 'AUTH_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AuthError';
    }
}
export class InvalidStateError extends AuthError {
    constructor(message = 'Invalid OAuth state') {
        super(message, 400, 'INVALID_STATE');
    }
}
export class InvalidRefreshTokenError extends AuthError {
    constructor(message = 'Invalid refresh token') {
        super(message, 401, 'INVALID_REFRESH_TOKEN');
    }
}
export class UnauthorizedError extends AuthError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
export class ForbiddenError extends AuthError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}
