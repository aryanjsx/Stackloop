import type { PaginatedResult, Repository, RepositoryDetail, SavedRepositoryItem, User } from './types';

// By default in browser we use direct API or proxy rewrite
const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
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
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${base}/auth/github/login?return_to=${encodeURIComponent(returnTo)}`;
}
