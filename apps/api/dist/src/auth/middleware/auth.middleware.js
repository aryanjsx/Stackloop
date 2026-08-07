import { UnauthorizedError } from '../errors.js';
export function createAuthMiddleware(authService) {
    return async function authMiddleware(req, res, next) {
        const authorization = req.headers.authorization;
        if (!authorization || !authorization.startsWith('Bearer ')) {
            next();
            return;
        }
        const accessToken = authorization.slice('Bearer '.length);
        try {
            const session = await authService.validateSession({ accessToken });
            const user = await authService.getCurrentUser({ accessToken });
            req.user = user;
            req.user.sessionId = session?.id;
        }
        catch {
            throw new UnauthorizedError();
        }
        next();
    };
}
