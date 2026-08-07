import { StateRepository } from '../types.js';

export class InMemoryStateRepository implements StateRepository {
  private store = new Map<string, { state: string; redirectUri: string; codeChallenge: string }>();

  async save(state: string, redirectUri: string, codeChallenge: string): Promise<void> {
    this.store.set(state, { state, redirectUri, codeChallenge });
  }

  async consume(state: string): Promise<{ state: string; redirectUri: string; codeChallenge: string } | null> {
    const record = this.store.get(state);
    if (!record) {
      return null;
    }
    this.store.delete(state);
    return record;
  }
}
