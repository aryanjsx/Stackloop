export class AuthValidator {
  static validateGithubLogin(input: { redirectUri?: string; state?: string }) {
    if (input.redirectUri && !this.isSafeAbsoluteUrl(input.redirectUri)) {
      throw new Error('Invalid redirect_uri');
    }
    if (!input.state) {
      return true;
    }
    return true;
  }

  static validateGithubCallback(input: { code?: string; state?: string }) {
    if (!input.code || !input.state) {
      throw new Error('code and state are required');
    }
    return true;
  }

  static validateRefreshToken(input: { refreshToken?: string }) {
    if (!input.refreshToken) {
      throw new Error('refresh_token is required');
    }
    return true;
  }

  private static isSafeAbsoluteUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
