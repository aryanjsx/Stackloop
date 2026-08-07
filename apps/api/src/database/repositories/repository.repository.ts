import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../base.repository.js';
import { RepositoryRepository } from '../interfaces.js';

export class PrismaRepositoryRepository extends BaseRepository<any, any, any> implements RepositoryRepository {
  protected modelName = 'repository' as keyof PrismaClient;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(input: any): Promise<any> {
    const model = (this.prisma as any)[this.modelName];
    return model.create({ data: input });
  }

  async findById(id: string): Promise<any | null> {
    const model = (this.prisma as any)[this.modelName];
    return model.findUnique({ where: { id } });
  }

  async findMany(where: Record<string, unknown> = {}, params: { page?: number; pageSize?: number } = {}) {
    const model = (this.prisma as any)[this.modelName];
    return this.paginate(model, { ...this.buildWhere({ deleted: false }), ...where }, { createdAt: 'desc' }, params);
  }

  async findByGithubId(githubId: number): Promise<any | null> {
    const model = (this.prisma as any)[this.modelName];
    return model.findUnique({ where: { githubId } });
  }

  async update(id: string, input: any): Promise<any> {
    const model = (this.prisma as any)[this.modelName];
    return model.update({ where: { id }, data: input });
  }

  async delete(id: string): Promise<any> {
    return this.softDelete({ id });
  }

  async restore(id: string): Promise<any> {
    return this.restoreRecord({ id });
  }
}
