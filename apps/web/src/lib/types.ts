export interface User {
  id: string;
  githubId: number;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: 'user' | 'maintainer' | 'admin' | 'moderator';
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface AiSummary {
  summary: string;
  aiModel?: string;
  confidenceScore?: number;
  generatedAt: string | Date;
}

export interface Repository {
  id: string;
  githubId: number;
  ownerLogin: string;
  name: string;
  fullName: string;
  description?: string;
  homepageUrl?: string;
  repositoryUrl: string;
  defaultBranch: string;
  language?: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  watchersCount: number;
  sizeKb?: number;
  isArchived: boolean;
  isDisabled: boolean;
  isPrivate: boolean;
  isVerified: boolean;
  lastPushAt?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryDetail extends Repository {
  technologies: Technology[];
  categories: Category[];
  aiSummary?: AiSummary;
  isSaved?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SavedRepositoryItem {
  id: string;
  userId: string;
  repositoryId: string;
  savedAt: string;
  repository?: Repository;
}
