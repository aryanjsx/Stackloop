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

export interface RepositoryRepository {
  findByGithubId(githubId: number): Promise<RepositoryRecord | null>;
  upsert(record: RepositoryRecord): Promise<RepositoryRecord>;
  list(): Promise<RepositoryRecord[]>;
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
