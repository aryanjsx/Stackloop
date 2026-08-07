export class InMemoryStateRepository {
    store = new Map();
    async save(state, redirectUri, codeChallenge) {
        this.store.set(state, { state, redirectUri, codeChallenge });
    }
    async consume(state) {
        const record = this.store.get(state);
        if (!record) {
            return null;
        }
        this.store.delete(state);
        return record;
    }
}
