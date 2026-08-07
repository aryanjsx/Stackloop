import { RepositoryRecord, RepositoryRepository } from '../types.js';

export class InMemoryRepositoryRepository implements RepositoryRepository {
  private readonly records = new Map<number, RepositoryRecord>();

  async findByGithubId(githubId: number): Promise<RepositoryRecord | null> {
    return this.records.get(githubId) ?? null;
  }

  async upsert(record: RepositoryRecord): Promise<RepositoryRecord> {
    this.records.set(record.githubId, record);
    return record;
  }

  async list(): Promise<RepositoryRecord[]> {
    return Array.from(this.records.values());
  }
}
