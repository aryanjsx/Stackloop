export class GitHubService {
    config;
    constructor(config) {
        this.config = config;
    }
    async fetchRepository(owner, repo) {
        const data = await this.request(`/repos/${owner}/${repo}`);
        return data;
    }
    async fetchReadme(owner, repo) {
        const response = await this.request(`/repos/${owner}/${repo}/readme`);
        return response.content ? Buffer.from(response.content, 'base64').toString('utf8') : '';
    }
    async fetchTopics(owner, repo) {
        const response = await this.request(`/repos/${owner}/${repo}/topics`, { headers: { Accept: 'application/vnd.github+json' } });
        return response.names ?? [];
    }
    async fetchLanguages(owner, repo) {
        const response = await this.request(`/repos/${owner}/${repo}/languages`);
        return Object.keys(response);
    }
    async fetchContributors(owner, repo) {
        const response = await this.request(`/repos/${owner}/${repo}/contributors?per_page=10`);
        return response.map((item) => item.login).filter((login) => Boolean(login));
    }
    async fetchRepositoryPage(owner, page) {
        return this.request(`/users/${owner}/repos?per_page=100&page=${page}`);
    }
    async getRateLimitState() {
        const headers = await this.requestHeaders('/rate_limit');
        const remaining = Number(headers['x-ratelimit-remaining'] ?? 0);
        const resetAt = new Date(Number(headers['x-ratelimit-reset'] ?? 0) * 1000);
        return { remaining, resetAt };
    }
    async request(path, init) {
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
        return response.json();
    }
    async requestHeaders(path) {
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
    async fetchWithRetry(path, init) {
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
