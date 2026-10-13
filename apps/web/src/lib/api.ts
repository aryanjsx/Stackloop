import type {
  PaginatedResult,
  Repository,
  RepositoryDetail,
  SavedRepositoryItem,
  User,
  UserPreferences,
  AiDescribeResponse,
  StarResponse,
  ForkResponse,
} from './types';

// In browser we route through Next.js rewrite (/api-backend) to avoid cross-site CORS issues
const API_BASE_URL = typeof window !== 'undefined'
  ? '/api-backend'
  : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method?.toUpperCase() || 'GET')) {
    headers.set('x-csrf-token', csrfToken);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes session and csrf cookies
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson?.error?.message) {
        errorDetail = errorJson.error.message;
      }
    } catch {
      // not JSON
    }
    throw new Error(errorDetail);
  }

  const json = await res.json();
  return json.data as T;
}

export async function fetchRepositories(params?: {
  q?: string;
  language?: string;
  sort?: 'popular' | 'newest' | 'updated';
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Repository>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('q', params.q);
  if (params?.language) searchParams.set('language', params.language);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

  const qs = searchParams.toString();
  return apiRequest<PaginatedResult<Repository>>(`/repositories${qs ? `?${qs}` : ''}`);
}

export async function fetchRepositoryById(id: string): Promise<RepositoryDetail> {
  return apiRequest<RepositoryDetail>(`/repositories/${encodeURIComponent(id)}`);
}

export async function fetchRepositoryByName(owner: string, name: string): Promise<RepositoryDetail> {
  return apiRequest<RepositoryDetail>(`/repositories/by-name/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await apiRequest<User>('/auth/me');
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' });
}

export async function saveRepository(repositoryId: string): Promise<{ saved: boolean; saved_at: string }> {
  return apiRequest<{ saved: boolean; saved_at: string }>(`/repositories/${encodeURIComponent(repositoryId)}/save`, {
    method: 'POST',
  });
}

export async function unsaveRepository(repositoryId: string): Promise<{ saved: boolean }> {
  return apiRequest<{ saved: boolean }>(`/repositories/${encodeURIComponent(repositoryId)}/save`, {
    method: 'DELETE',
  });
}

export async function fetchSavedRepositories(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<SavedRepositoryItem>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());

  const qs = searchParams.toString();
  return apiRequest<PaginatedResult<SavedRepositoryItem>>(`/saved-repositories${qs ? `?${qs}` : ''}`);
}

export function getGitHubLoginUrl(returnTo: string = '/'): string {
  const base = typeof window !== 'undefined' ? '/api-backend' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
  return `${base}/auth/github/login?return_to=${encodeURIComponent(returnTo)}`;
}

const PREFERENCES_STORAGE_KEY = 'stackloop_user_preferences';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  languages: ['TypeScript', 'Python', 'Rust'],
  topics: ['Artificial Intelligence / LLMs', 'Web Frameworks', 'DevOps & Cloud'],
  experienceLevel: 'Intermediate',
  explanationStyle: 'Deep Architectural',
};

export function getLocalPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PREFERENCES;
    return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export function setLocalPreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save preferences to localStorage', e);
  }
}

export async function fetchUserPreferences(): Promise<UserPreferences> {
  const local = getLocalPreferences();
  try {
    const server = await apiRequest<UserPreferences>('/auth/profile/preferences');
    const merged = { ...local, ...server };
    setLocalPreferences(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveUserPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = getLocalPreferences();
  const updated = { ...current, ...prefs };
  setLocalPreferences(updated);

  try {
    await apiRequest<UserPreferences>('/auth/profile/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  } catch {
    // Local fallback is already saved
  }

  return updated;
}

export async function starRepository(
  repositoryId: string,
  starred: boolean,
  pat?: string
): Promise<StarResponse> {
  const effectivePat = pat || getLocalPreferences().githubPat;
  return apiRequest<StarResponse>(`/repositories/${encodeURIComponent(repositoryId)}/star`, {
    method: 'POST',
    body: JSON.stringify({ starred, github_pat: effectivePat }),
  });
}

export async function forkRepository(
  repositoryId: string,
  pat?: string
): Promise<ForkResponse> {
  const effectivePat = pat || getLocalPreferences().githubPat;
  return apiRequest<ForkResponse>(`/repositories/${encodeURIComponent(repositoryId)}/fork`, {
    method: 'POST',
    body: JSON.stringify({ github_pat: effectivePat }),
  });
}

export async function askAiAboutRepo(params: {
  repositoryId: string;
  query?: string;
  mode?: 'describe' | 'architecture' | 'tradeoffs' | 'getting-started' | 'custom';
  preferences?: UserPreferences;
}): Promise<AiDescribeResponse> {
  return apiRequest<AiDescribeResponse>(`/repositories/${encodeURIComponent(params.repositoryId)}/ai-describe`, {
    method: 'POST',
    body: JSON.stringify({
      query: params.query,
      mode: params.mode || 'describe',
      preferences: params.preferences || getLocalPreferences(),
    }),
  });
}

export async function askAiGeneral(params: {
  query: string;
  preferences?: UserPreferences;
}): Promise<AiDescribeResponse> {
  return apiRequest<AiDescribeResponse>('/repositories/ai-discover', {
    method: 'POST',
    body: JSON.stringify({
      query: params.query,
      preferences: params.preferences || getLocalPreferences(),
    }),
  });
}

export async function verifyGithubPat(token: string): Promise<{ valid: boolean; login?: string; avatar_url?: string; error?: string }> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) {
      return { valid: false, error: `GitHub API returned ${res.status}` };
    }
    const data = await res.json();
    return {
      valid: true,
      login: data.login,
      avatar_url: data.avatar_url,
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Network error reaching GitHub' };
  }
}

