import { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { AuthService } from '../services/auth.service.js';
import { AuthError } from '../errors.js';
import { GithubCallbackDto, GithubLoginDto, RefreshTokenDto } from '../dto.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async handleGithubLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'https://api.stackloop.dev');
    const payload: GithubLoginDto = {
      redirectUri: url.searchParams.get('redirect_uri') ?? undefined,
      state: url.searchParams.get('state') ?? undefined,
    };

    const result = await this.authService.initiateGithubLogin(payload);
    res.writeHead(302, { Location: result.redirectUrl });
    res.end();
  }

  async handleGithubCallback(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJson(req);
    const payload: GithubCallbackDto & { providerUser: any } = {
      code: body?.code,
      state: body?.state,
      codeVerifier: body?.code_verifier,
      providerUser: {
        id: 42,
        login: 'octocat',
        name: 'The Octocat',
        email: 'octocat@github.com',
        avatarUrl: 'https://avatars.githubusercontent.com/u/42',
      },
    };

    try {
      const result = await this.authService.handleGithubCallback(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { access_token: result.tokens.accessToken, refresh_token: result.tokens.refreshToken, expires_in: result.tokens.expiresIn, user: { id: result.user.id, username: result.user.username, display_name: result.user.displayName, email: result.user.email, avatar_url: result.user.avatarUrl, role: result.user.role } } }));
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async handleLogout(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJson(req);
    try {
      const result = await this.authService.logout({ sessionId: body?.session_id ?? 'anonymous' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { success: result.success } }));
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async handleRefresh(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJson(req);
    const payload: RefreshTokenDto = { refreshToken: body?.refresh_token };
    try {
      const result = await this.authService.refreshSession(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { access_token: result.tokens.accessToken, refresh_token: result.tokens.refreshToken, expires_in: result.tokens.expiresIn } }));
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async handleMe(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      this.handleError(res, new AuthError('Unauthorized', 401, 'UNAUTHORIZED'));
      return;
    }

    try {
      const accessToken = authorization.slice('Bearer '.length);
      const user = await this.authService.getCurrentUser({ accessToken });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: user }));
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async readJson(req: IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) {
      return {};
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  private handleError(res: ServerResponse, error: unknown): void {
    const authError = error as AuthError;
    const statusCode = authError.statusCode ?? 500;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: authError.code ?? 'INTERNAL_ERROR', message: authError.message ?? 'Unexpected error.' } }));
  }
}
