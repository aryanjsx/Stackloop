export interface CrudRepository<T, TCreate, TUpdate> {
  create(input: TCreate): Promise<T>;
  findById(id: string): Promise<T | null>;
  findMany(where?: Record<string, unknown>, params?: { page?: number; pageSize?: number }): Promise<{ items: T[]; total: number; page: number; pageSize: number }>;
  update(id: string, input: TUpdate): Promise<T>;
  delete(id: string): Promise<T>;
  restore?(id: string): Promise<T>;
}

export interface UserRepository extends CrudRepository<any, any, any> {
  findByGithubId(githubId: number): Promise<any | null>;
}

export interface RepositoryRepository extends CrudRepository<any, any, any> {
  findByGithubId(githubId: number): Promise<any | null>;
}

export interface CollectionRepository extends CrudRepository<any, any, any> {}
export interface SavedRepositoryRepository extends CrudRepository<any, any, any> {}
export interface RecommendationRepository extends CrudRepository<any, any, any> {}
export interface NotificationRepository extends CrudRepository<any, any, any> {}
export interface ActivityRepository extends CrudRepository<any, any, any> {}
export interface ContributionRepository extends CrudRepository<any, any, any> {}
export interface SessionRepository extends CrudRepository<any, any, any> {}
