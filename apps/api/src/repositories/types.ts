export interface GitHubRepositoryPayload {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  homepage: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  size: number;
  archived: boolean;
  disabled: boolean;
  private: boolean;
  pushed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RepositoryRecord {
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
  lastPushAt?: Date;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  readme?: string;
  topics?: string[];
  contributors?: string[];
}

export interface TechnologyTag {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
}

export interface CategoryTag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface AiSummaryInfo {
  summary: string;
  aiModel?: string;
  confidenceScore?: number;
  generatedAt?: Date;
}

export interface RepositoryDetailRecord extends RepositoryRecord {
  technologies?: TechnologyTag[];
  categories?: CategoryTag[];
  aiSummary?: AiSummaryInfo;
  isSaved?: boolean;
}

export interface RepositoryQueryOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  language?: string;
  sort?: 'popular' | 'newest' | 'updated';
}

export interface PaginatedRepositories<T = RepositoryRecord> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SavedRepositoryRecord {
  id: string;
  userId: string;
  repositoryId: string;
  savedAt: Date;
  repository?: RepositoryRecord;
}

export interface SaveAiSummaryInput {
  summaryText: string;
  aiModel?: string;
  confidenceScore?: number;
  technologies?: Array<{ name: string; category?: string | null; confidence?: number }>;
}

export interface RepositoryRepository {
  findByGithubId(githubId: number): Promise<RepositoryRecord | null>;
  findById(id: string, currentUserId?: string): Promise<RepositoryDetailRecord | null>;
  findByFullName(owner: string, name: string, currentUserId?: string): Promise<RepositoryDetailRecord | null>;
  upsert(record: RepositoryRecord): Promise<RepositoryRecord>;
  list(options?: RepositoryQueryOptions): Promise<PaginatedRepositories>;
  saveRepository(userId: string, repositoryId: string): Promise<{ saved: boolean; savedAt: Date }>;
  unsaveRepository(userId: string, repositoryId: string): Promise<{ removed: boolean }>;
  isSaved(userId: string, repositoryId: string): Promise<boolean>;
  listSaved(userId: string, options?: { page?: number; pageSize?: number }): Promise<PaginatedRepositories<SavedRepositoryRecord>>;
  saveAiSummary(repositoryId: string, input: SaveAiSummaryInput): Promise<AiSummaryInfo>;
}

export interface QueueProducer {
  enqueueSummaryJob(payload: { repositoryId: string; githubId: number }): Promise<{ id: string; queued: boolean }>;
  enqueueSearchIndexJob(payload: { repositoryId: string; githubId: number }): Promise<{ id: string; queued: boolean }>;
}

export interface GitHubClientConfig {
  baseUrl: string;
  token: string;
  rateLimitBuffer: number;
}
