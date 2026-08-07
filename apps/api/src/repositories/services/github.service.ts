import { GitHubClientConfig, GitHubRepositoryPayload } from '../types.js';

export interface GitHubRateLimitState {
  remaining: number;
  resetAt: Date;
}

export class GitHubService {
  constructor(private readonly config: GitHubClientConfig) {}

  async fetchRepository(owner: string, repo: string): Promise<GitHubRepositoryPayload> {
    const data = await this.request<GitHubRepositoryPayload>(`/repos/${owner}/${repo}`);
    return data;
  }

  async fetchReadme(owner: string, repo: string): Promise<string> {
    const response = await this.request<{ content?: string }>(`/repos/${owner}/${repo}/readme`);
    return response.content ? Buffer.from(response.content, 'base64').toString('utf8') : '';
  }

  async fetchTopics(owner: string, repo: string): Promise<string[]> {
    const response = await this.request<{ names?: string[] }>(`/repos/${owner}/${repo}/topics`, { headers: { Accept: 'application/vnd.github+json' } });
    return response.names ?? [];
  }

  async fetchLanguages(owner: string, repo: string): Promise<string[]> {
    const response = await this.request<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
    return Object.keys(response);
  }

  async fetchContributors(owner: string, repo: string): Promise<string[]> {
    const response = await this.request<Array<{ login?: string }>>(`/repos/${owner}/${repo}/contributors?per_page=10`);
    return response.map((item) => item.login).filter((login): login is string => Boolean(login));
  }

  async fetchRepositoryPage(owner: string, page: number): Promise<GitHubRepositoryPayload[]> {
    return this.request<GitHubRepositoryPayload[]>(`/users/${owner}/repos?per_page=100&page=${page}`);
  }

  async getRateLimitState(): Promise<GitHubRateLimitState> {
    const headers = await this.requestHeaders('/rate_limit');
    const remaining = Number(headers['x-ratelimit-remaining'] ?? 0);
    const resetAt = new Date(Number(headers['x-ratelimit-reset'] ?? 0) * 1000);
    return { remaining, resetAt };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers({
      Accept: 'application/vnd.github+json',
      'User-Agent': 'stackloop-collector',
      Authorization: `Bearer ${this.config.token}`,
      ...(init?.headers ?? {}),
    });

    const response = await this.fetchWithRetry(path, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`GitHub request failed with ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  private async requestHeaders(path: string): Promise<Record<string, string>> {
    const headers = new Headers({
      Accept: 'application/vnd.github+json',
      'User-Agent': 'stackloop-collector',
      Authorization: `Bearer ${this.config.token}`,
    });
    const response = await this.fetchWithRetry(path, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`GitHub request failed with ${response.status}`);
    }
    return Object.fromEntries(response.headers.entries());
  }

  private async fetchWithRetry(path: string, init: RequestInit): Promise<Response> {
    let attempt = 0;
    const maxAttempts = 4;
    while (attempt < maxAttempts) {
      const response = await fetch(`${this.config.baseUrl}${path}`, init);
      if (response.ok || response.status < 500) {
        return response;
      }
      attempt += 1;
      if (attempt >= maxAttempts) {
        return response;
      }
      const delayMs = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error('GitHub request retries exhausted');
  }
}
