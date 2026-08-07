export class InMemoryRepositoryRepository {
    records = new Map();
    async findByGithubId(githubId) {
        return this.records.get(githubId) ?? null;
    }
    async upsert(record) {
        this.records.set(record.githubId, record);
        return record;
    }
    async list() {
        return Array.from(this.records.values());
    }
}
