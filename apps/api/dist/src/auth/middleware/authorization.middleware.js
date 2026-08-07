import { ForbiddenError } from '../errors.js';
export function createAuthorizationMiddleware(requiredRole) {
    return function authorizationMiddleware(req, res, next) {
        if (!req.user || req.user.role !== requiredRole && req.user.role !== 'admin') {
            throw new ForbiddenError();
        }
        next();
    };
}
