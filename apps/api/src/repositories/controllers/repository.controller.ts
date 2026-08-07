import { IncomingMessage, ServerResponse } from 'node:http';
import { RepositoryCollectorService } from '../services/repository-collector.service.js';

export class RepositoryController {
  constructor(private readonly collectorService: RepositoryCollectorService) {}

  async syncRepository(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJson(req);
    const result = await this.collectorService.collectRepository({ owner: body.owner, repo: body.repo });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: result }));
  }

  async syncBatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJson(req);
    const results = await this.collectorService.collectRepositoryBatch(body.items ?? []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: results }));
  }

  private async readJson(req: IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) {
      return {};
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
}
