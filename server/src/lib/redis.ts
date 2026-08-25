export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

class InMemoryRedisClient implements IRedisClient {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private expirations: Map<string, NodeJS.Timeout> = new Map();

  public async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  public async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<'OK' | null> {
    this.store.set(key, value);

    if (this.expirations.has(key)) {
      clearTimeout(this.expirations.get(key)!);
      this.expirations.delete(key);
    }

    if (mode === 'EX' && typeof duration === 'number') {
      const timeout = setTimeout(() => {
        this.store.delete(key);
        this.expirations.delete(key);
      }, duration * 1000);
      this.expirations.set(key, timeout);
    }

    return 'OK';
  }

  public async del(key: string): Promise<number> {
    let deletedCount = 0;
    if (this.store.delete(key)) deletedCount++;
    if (this.sets.delete(key)) deletedCount++;
    if (this.expirations.has(key)) {
      clearTimeout(this.expirations.get(key)!);
      this.expirations.delete(key);
    }
    return deletedCount;
  }

  public async sadd(key: string, ...members: string[]): Promise<number> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set<string>();
      this.sets.set(key, set);
    }
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  public async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    return removed;
  }

  public async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    if (!set) return [];
    return Array.from(set);
  }

  public async sismember(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    return set.has(member) ? 1 : 0;
  }

  public async expire(key: string, seconds: number): Promise<number> {
    const exists = this.store.has(key) || this.sets.has(key);
    if (!exists) return 0;

    if (this.expirations.has(key)) {
      clearTimeout(this.expirations.get(key)!);
      this.expirations.delete(key);
    }

    const timeout = setTimeout(() => {
      this.store.delete(key);
      this.sets.delete(key);
      this.expirations.delete(key);
    }, seconds * 1000);

    this.expirations.set(key, timeout);
    return 1;
  }
}

function createRedisClient(): IRedisClient {
  console.log('[REDIS] Initializing Redis cache layer with in-memory fallback enabled.');
  return new InMemoryRedisClient();
}

export const redis = createRedisClient();
