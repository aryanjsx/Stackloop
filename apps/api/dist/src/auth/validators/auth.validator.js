export class AuthValidator {
    static validateGithubLogin(input) {
        if (input.redirectUri && !this.isSafeAbsoluteUrl(input.redirectUri)) {
            throw new Error('Invalid redirect_uri');
        }
        if (!input.state) {
            return true;
        }
        return true;
    }
    static validateGithubCallback(input) {
        if (!input.code || !input.state) {
            throw new Error('code and state are required');
        }
        return true;
    }
    static validateRefreshToken(input) {
        if (!input.refreshToken) {
            throw new Error('refresh_token is required');
        }
        return true;
    }
    static isSafeAbsoluteUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
}
