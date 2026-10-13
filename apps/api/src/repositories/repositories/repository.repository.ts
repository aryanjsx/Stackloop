import { randomUUID } from 'node:crypto';
import type {
  AiSummaryInfo,
  PaginatedRepositories,
  RepositoryDetailRecord,
  RepositoryQueryOptions,
  RepositoryRecord,
  RepositoryRepository,
  SaveAiSummaryInput,
  SavedRepositoryRecord,
  TechnologyTag,
} from '../types.js';

export class InMemoryRepositoryRepository implements RepositoryRepository {
  private readonly records = new Map<number, RepositoryRecord>();
  private readonly saved = new Map<string, SavedRepositoryRecord>();
  private readonly aiSummaries = new Map<string, AiSummaryInfo>();
  private readonly technologies = new Map<string, TechnologyTag[]>();

  async findByGithubId(githubId: number): Promise<RepositoryRecord | null> {
    return this.records.get(githubId) ?? null;
  }

  async findById(id: string, currentUserId?: string): Promise<RepositoryDetailRecord | null> {
    for (const record of this.records.values()) {
      if (record.id === id) {
        const isSaved = currentUserId ? await this.isSaved(currentUserId, record.id) : false;
        return {
          ...record,
          technologies: this.technologies.get(record.id) ?? [],
          categories: [],
          aiSummary: this.aiSummaries.get(record.id),
          isSaved,
        };
      }
    }
    return null;
  }

  async findByFullName(owner: string, name: string, currentUserId?: string): Promise<RepositoryDetailRecord | null> {
    const fullName = `${owner}/${name}`.toLowerCase();
    for (const record of this.records.values()) {
      if (record.fullName.toLowerCase() === fullName) {
        const isSaved = currentUserId ? await this.isSaved(currentUserId, record.id) : false;
        return {
          ...record,
          technologies: this.technologies.get(record.id) ?? [],
          categories: [],
          aiSummary: this.aiSummaries.get(record.id),
          isSaved,
        };
      }
    }
    return null;
  }

  async upsert(record: RepositoryRecord): Promise<RepositoryRecord> {
    this.records.set(record.githubId, record);
    return record;
  }

  async list(options?: RepositoryQueryOptions): Promise<PaginatedRepositories> {
    let items = Array.from(this.records.values());

    if (options?.q) {
      const q = options.q.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    if (options?.language) {
      const lang = options.language.toLowerCase();
      items = items.filter((r) => r.language?.toLowerCase() === lang);
    }

    if (options?.sort === 'newest') {
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (options?.sort === 'updated') {
      items.sort((a, b) => (b.lastPushAt?.getTime() ?? 0) - (a.lastPushAt?.getTime() ?? 0));
    } else {
      // default: popular
      items.sort((a, b) => b.stargazersCount - a.stargazersCount);
    }

    const total = items.length;
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const paginatedItems = items.slice(skip, skip + pageSize);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async isSaved(userId: string, repositoryId: string): Promise<boolean> {
    const key = `${userId}:${repositoryId}`;
    return this.saved.has(key);
  }

  async saveRepository(userId: string, repositoryId: string): Promise<{ saved: boolean; savedAt: Date }> {
    const key = `${userId}:${repositoryId}`;
    const existing = this.saved.get(key);
    if (existing) {
      return { saved: true, savedAt: existing.savedAt };
    }

    const savedAt = new Date();
    this.saved.set(key, {
      id: randomUUID(),
      userId,
      repositoryId,
      savedAt,
    });
    return { saved: true, savedAt };
  }

  async unsaveRepository(userId: string, repositoryId: string): Promise<{ removed: boolean }> {
    const key = `${userId}:${repositoryId}`;
    const existed = this.saved.delete(key);
    return { removed: existed };
  }

  async listSaved(userId: string, options?: { page?: number; pageSize?: number }): Promise<PaginatedRepositories<SavedRepositoryRecord>> {
    const userSaves: SavedRepositoryRecord[] = [];
    for (const item of this.saved.values()) {
      if (item.userId === userId) {
        let repo: RepositoryRecord | undefined;
        for (const r of this.records.values()) {
          if (r.id === item.repositoryId) {
            repo = r;
            break;
          }
        }
        userSaves.push({ ...item, repository: repo });
      }
    }

    userSaves.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());

    const total = userSaves.length;
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const paginatedItems = userSaves.slice(skip, skip + pageSize);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async saveAiSummary(repositoryId: string, input: SaveAiSummaryInput): Promise<AiSummaryInfo> {
    const summaryInfo: AiSummaryInfo = {
      summary: input.summaryText,
      aiModel: input.aiModel ?? 'gemini-3.8',
      confidenceScore: input.confidenceScore,
      generatedAt: new Date(),
    };
    this.aiSummaries.set(repositoryId, summaryInfo);

    if (input.technologies && input.technologies.length > 0) {
      const existing = this.technologies.get(repositoryId) ?? [];
      for (const t of input.technologies) {
        const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) continue;
        if (!existing.some((e) => e.slug === slug)) {
          existing.push({ id: randomUUID(), name: t.name, slug, category: t.category });
        }
      }
      this.technologies.set(repositoryId, existing);
    }

    return summaryInfo;
  }
}
