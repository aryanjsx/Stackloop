export interface GithubLoginDto {
  redirectUri?: string;
  state?: string;
  codeChallenge?: string;
}

export interface GithubCallbackDto {
  code: string;
  state: string;
  codeVerifier?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface CreateSessionDto {
  userId: string;
  provider: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

export interface AuthResponseDto {
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: {
      id: string;
      username: string;
      display_name: string;
      email?: string;
      avatar_url?: string;
      role: string;
    };
  };
}
