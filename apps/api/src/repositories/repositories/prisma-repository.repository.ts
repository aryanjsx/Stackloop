import type { PrismaClient } from '@prisma/client';
import type { RepositoryRecord, RepositoryRepository } from '../types.js';

/**
 * PostgreSQL-backed repository store, replacing the in-memory Map the collector used to write
 * to. Ingested repositories now survive a restart and are visible to the rest of the platform.
 *
 * `readme`, `topics`, and `contributors` are collected but not persisted here: the schema models
 * topics and contributors as their own relations, and the README is input to the Phase 5 AI
 * summarisation step rather than a column on `repositories`. They remain on the in-memory record
 * so the collector can hand them to the enrichment queue.
 */
export class PrismaRepositoryRepository implements RepositoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByGithubId(githubId: number): Promise<RepositoryRecord | null> {
    const record = await this.prisma.repository.findUnique({
      where: { githubId: BigInt(githubId) },
    });
    return record ? toRecord(record) : null;
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
      // `isVerified` is omitted deliberately: it is a StackLoop moderation decision, and a
      // routine re-sync must not silently reset it.
      update: { ...data, deletedAt: null },
    });

    return toRecord(saved);
  }

  async list(): Promise<RepositoryRecord[]> {
    const records = await this.prisma.repository.findMany({
      where: { deletedAt: null },
      orderBy: { stargazersCount: 'desc' },
      take: 100,
    });
    return records.map(toRecord);
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
