import { PrismaClient } from '@prisma/client';
import { PaginatedResult, PaginationParams, RepositoryFilter } from './types.js';

export abstract class BaseRepository<T, TCreate, TUpdate> {
  constructor(protected readonly prisma: PrismaClient) {}

  protected abstract modelName: keyof PrismaClient;

  protected async paginate<TItem>(
    model: any,
    where: Record<string, unknown> | any = {},
    orderBy: any = { createdAt: 'desc' },
    params: PaginationParams = {},
  ): Promise<PaginatedResult<TItem>> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      model.findMany({ where, orderBy, skip, take: pageSize }),
      model.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  protected async softDelete(where: any): Promise<T> {
    const model = (this.prisma as any)[this.modelName];
    return model.update({ where, data: { deletedAt: new Date() } });
  }

  protected async restoreRecord(where: any): Promise<T> {
    const model = (this.prisma as any)[this.modelName];
    return model.update({ where, data: { deletedAt: null } });
  }

  protected buildWhere(filter?: RepositoryFilter): any {
    const where: Record<string, unknown> = {};
    if (filter?.deleted === false) {
      where.deletedAt = null;
    }
    if (filter?.active === true) {
      where.isActive = true;
    }
    return where;
  }
}
