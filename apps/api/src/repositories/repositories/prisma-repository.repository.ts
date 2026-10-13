import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  AiSummaryInfo,
  PaginatedRepositories,
  RepositoryDetailRecord,
  RepositoryQueryOptions,
  RepositoryRecord,
  RepositoryRepository,
  SaveAiSummaryInput,
  SavedRepositoryRecord,
} from '../types.js';

export class PrismaRepositoryRepository implements RepositoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByGithubId(githubId: number): Promise<RepositoryRecord | null> {
    const record = await this.prisma.repository.findUnique({
      where: { githubId: BigInt(githubId) },
    });
    return record ? toRecord(record) : null;
  }

  async findById(id: string, currentUserId?: string): Promise<RepositoryDetailRecord | null> {
    const record = await this.prisma.repository.findFirst({
      where: { id, deletedAt: null },
      include: {
        technologies: { include: { technology: true } },
        categories: { include: { category: true } },
        aiMetadata: { orderBy: { generatedAt: 'desc' }, take: 1 },
        ...(currentUserId ? { savedBy: { where: { userId: currentUserId } } } : {}),
      },
    });

    return record ? toDetailRecord(record, currentUserId) : null;
  }

  async findByFullName(owner: string, name: string, currentUserId?: string): Promise<RepositoryDetailRecord | null> {
    const fullName = `${owner}/${name}`;
    const record = await this.prisma.repository.findFirst({
      where: {
        OR: [
          { fullName: { equals: fullName, mode: 'insensitive' } },
          {
            AND: [
              { ownerLogin: { equals: owner, mode: 'insensitive' } },
              { name: { equals: name, mode: 'insensitive' } },
            ],
          },
        ],
        deletedAt: null,
      },
      include: {
        technologies: { include: { technology: true } },
        categories: { include: { category: true } },
        aiMetadata: { orderBy: { generatedAt: 'desc' }, take: 1 },
        ...(currentUserId ? { savedBy: { where: { userId: currentUserId } } } : {}),
      },
    });

    return record ? toDetailRecord(record, currentUserId) : null;
  }

  async upsert(record: RepositoryRecord): Promise<RepositoryRecord> {
    const data = {
      ownerLogin: record.ownerLogin,
      name: record.name,
      fullName: record.fullName,
      description: record.description ?? null,
      homepageUrl: record.homepageUrl ?? null,
      repositoryUrl: record.repositoryUrl,
      defaultBranch: record.defaultBranch,
      language: record.language ?? null,
      stargazersCount: record.stargazersCount,
      forksCount: record.forksCount,
      openIssuesCount: record.openIssuesCount,
      watchersCount: record.watchersCount,
      sizeKb: record.sizeKb ?? null,
      isArchived: record.isArchived,
      isDisabled: record.isDisabled,
      isPrivate: record.isPrivate,
      lastPushAt: record.lastPushAt ?? null,
      lastSyncedAt: record.lastSyncedAt ?? new Date(),
    };

    const saved = await this.prisma.repository.upsert({
      where: { githubId: BigInt(record.githubId) },
      create: { githubId: BigInt(record.githubId), ...data },
      update: { ...data, deletedAt: null },
    });

    return toRecord(saved);
  }

  async list(options?: RepositoryQueryOptions): Promise<PaginatedRepositories> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (options?.q) {
      where.OR = [
        { name: { contains: options.q, mode: 'insensitive' } },
        { fullName: { contains: options.q, mode: 'insensitive' } },
        { description: { contains: options.q, mode: 'insensitive' } },
      ];
    }

    if (options?.language) {
      where.language = { equals: options.language, mode: 'insensitive' };
    }

    let orderBy: Record<string, 'asc' | 'desc'> = { stargazersCount: 'desc' };
    if (options?.sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (options?.sort === 'updated') {
      orderBy = { lastPushAt: 'desc' };
    }

    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.repository.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.repository.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: items.map(toRecord),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async isSaved(userId: string, repositoryId: string): Promise<boolean> {
    const count = await this.prisma.savedRepository.count({
      where: { userId, repositoryId },
    });
    return count > 0;
  }

  async saveRepository(userId: string, repositoryId: string): Promise<{ saved: boolean; savedAt: Date }> {
    const saved = await this.prisma.savedRepository.upsert({
      where: { userId_repositoryId: { userId, repositoryId } },
      create: { userId, repositoryId },
      update: {},
    });
    return { saved: true, savedAt: saved.savedAt };
  }

  async unsaveRepository(userId: string, repositoryId: string): Promise<{ removed: boolean }> {
    try {
      await this.prisma.savedRepository.delete({
        where: { userId_repositoryId: { userId, repositoryId } },
      });
      return { removed: true };
    } catch {
      return { removed: false };
    }
  }

  async listSaved(
    userId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<PaginatedRepositories<SavedRepositoryRecord>> {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.savedRepository.findMany({
        where: { userId },
        orderBy: { savedAt: 'desc' },
        skip,
        take: pageSize,
        include: { repository: true },
      }),
      this.prisma.savedRepository.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        repositoryId: item.repositoryId,
        savedAt: item.savedAt,
        repository: item.repository ? toRecord(item.repository) : undefined,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async saveAiSummary(repositoryId: string, input: SaveAiSummaryInput): Promise<AiSummaryInfo> {
    const aiRecord = await this.prisma.repositoryAiMetadata.create({
      data: {
        repositoryId,
        summaryText: input.summaryText,
        aiModel: input.aiModel ?? 'gemini-3.8',
        confidenceScore: input.confidenceScore !== undefined ? new Prisma.Decimal(input.confidenceScore) : null,
        summaryVersion: 'v1',
      },
    });

    if (input.technologies && input.technologies.length > 0) {
      for (const tech of input.technologies) {
        const slug = tech.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) continue;

        const record = await this.prisma.technology.upsert({
          where: { slug },
          create: { slug, name: tech.name, category: tech.category ?? null },
          update: tech.category ? { category: tech.category } : {},
        });

        await this.prisma.repositoryTechnology.upsert({
          where: {
            repositoryId_technologyId: {
              repositoryId,
              technologyId: record.id,
            },
          },
          create: {
            repositoryId,
            technologyId: record.id,
            confidenceScore: tech.confidence !== undefined ? new Prisma.Decimal(tech.confidence) : new Prisma.Decimal(1.0),
          },
          update: {
            confidenceScore: tech.confidence !== undefined ? new Prisma.Decimal(tech.confidence) : new Prisma.Decimal(1.0),
          },
        });
      }
    }

    return {
      summary: aiRecord.summaryText ?? '',
      aiModel: aiRecord.aiModel ?? undefined,
      confidenceScore: aiRecord.confidenceScore ? Number(aiRecord.confidenceScore) : undefined,
      generatedAt: aiRecord.generatedAt,
    };
  }
}

interface PrismaRepositoryRow {
  id: string;
  githubId: bigint;
  ownerLogin: string;
  name: string;
  fullName: string;
  description: string | null;
  homepageUrl: string | null;
  repositoryUrl: string;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  watchersCount: number;
  sizeKb: number | null;
  isArchived: boolean;
  isDisabled: boolean;
  isPrivate: boolean;
  isVerified: boolean;
  lastPushAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: PrismaRepositoryRow): RepositoryRecord {
  return {
    id: row.id,
    githubId: Number(row.githubId),
    ownerLogin: row.ownerLogin,
    name: row.name,
    fullName: row.fullName,
    ...(row.description !== null ? { description: row.description } : {}),
    ...(row.homepageUrl !== null ? { homepageUrl: row.homepageUrl } : {}),
    repositoryUrl: row.repositoryUrl,
    defaultBranch: row.defaultBranch,
    ...(row.language !== null ? { language: row.language } : {}),
    stargazersCount: row.stargazersCount,
    forksCount: row.forksCount,
    openIssuesCount: row.openIssuesCount,
    watchersCount: row.watchersCount,
    ...(row.sizeKb !== null ? { sizeKb: row.sizeKb } : {}),
    isArchived: row.isArchived,
    isDisabled: row.isDisabled,
    isPrivate: row.isPrivate,
    isVerified: row.isVerified,
    ...(row.lastPushAt !== null ? { lastPushAt: row.lastPushAt } : {}),
    ...(row.lastSyncedAt !== null ? { lastSyncedAt: row.lastSyncedAt } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDetailRecord(row: any, currentUserId?: string): RepositoryDetailRecord {
  const base = toRecord(row);
  const technologies = (row.technologies ?? []).map((rt: any) => ({
    id: rt.technology.id,
    name: rt.technology.name,
    slug: rt.technology.slug,
    category: rt.technology.category,
  }));

  const categories = (row.categories ?? []).map((rc: any) => ({
    id: rc.category.id,
    name: rc.category.name,
    slug: rc.category.slug,
    description: rc.category.description,
  }));

  const latestAi = row.aiMetadata?.[0];
  const aiSummary = latestAi
    ? {
        summary: latestAi.summaryText ?? '',
        aiModel: latestAi.aiModel ?? undefined,
        confidenceScore: latestAi.confidenceScore ? Number(latestAi.confidenceScore) : undefined,
        generatedAt: latestAi.generatedAt,
      }
    : undefined;

  const isSaved = currentUserId ? (row.savedBy?.length ?? 0) > 0 : false;

  return {
    ...base,
    technologies,
    categories,
    aiSummary,
    isSaved,
  };
}
