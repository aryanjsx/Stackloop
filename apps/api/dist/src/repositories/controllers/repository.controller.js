export class RepositoryController {
    collectorService;
    constructor(collectorService) {
        this.collectorService = collectorService;
    }
    async syncRepository(req, res) {
        const body = await this.readJson(req);
        const result = await this.collectorService.collectRepository({ owner: body.owner, repo: body.repo });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: result }));
    }
    async syncBatch(req, res) {
        const body = await this.readJson(req);
        const results = await this.collectorService.collectRepositoryBatch(body.items ?? []);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: results }));
    }
    async readJson(req) {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        if (chunks.length === 0) {
            return {};
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
}
