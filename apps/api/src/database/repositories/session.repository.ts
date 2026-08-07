import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../base.repository.js';
import { SessionRepository } from '../interfaces.js';

export class PrismaSessionRepository extends BaseRepository<any, any, any> implements SessionRepository {
  protected modelName = 'session' as keyof PrismaClient;

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
    return this.paginate(model, where, { createdAt: 'desc' }, params);
  }

  async update(id: string, input: any): Promise<any> {
    const model = (this.prisma as any)[this.modelName];
    return model.update({ where: { id }, data: input });
  }

  async delete(id: string): Promise<any> {
    const model = (this.prisma as any)[this.modelName];
    return model.delete({ where: { id } });
  }
}
