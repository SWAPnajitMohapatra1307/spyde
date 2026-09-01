export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  // Helper methods for typed JSON storage
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T, durationSeconds?: number): Promise<'OK' | null>;
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

  public async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  public async setJson<T>(key: string, value: T, durationSeconds?: number): Promise<'OK' | null> {
    const str = JSON.stringify(value);
    if (durationSeconds) {
      return this.set(key, str, 'EX', durationSeconds);
    }
    return this.set(key, str);
  }
}

class UpstashRestRedisClient implements IRedisClient {
  private url: string;
  private token: string;
  private inMemoryFallback: InMemoryRedisClient;

  constructor(url: string, token: string) {
    // Strip trailing slashes
    this.url = url.replace(/\/$/, '');
    this.token = token;
    this.inMemoryFallback = new InMemoryRedisClient();
  }

  private async executeCommand<T = any>(command: any[]): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Upstash Redis HTTP error: ${response.status} ${response.statusText}`);
    }

    const json: any = await response.json();
    if (json.error) {
      throw new Error(`Upstash Redis command error: ${json.error}`);
    }
    return json.result;
  }

  public async get(key: string): Promise<string | null> {
    try {
      const res = await this.executeCommand(['GET', key]);
      return res !== null ? String(res) : null;
    } catch (err) {
      console.warn('[REDIS-FALLBACK] Failed Upstash GET, using memory cache:', err);
      return this.inMemoryFallback.get(key);
    }
  }

  public async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<'OK' | null> {
    try {
      const cmd: (string | number)[] = ['SET', key, value];
      if (mode === 'EX' && duration) {
        cmd.push('EX', duration);
      }
      await this.executeCommand(cmd);
      return 'OK';
    } catch (err) {
      console.warn('[REDIS-FALLBACK] Failed Upstash SET, using memory cache:', err);
      return this.inMemoryFallback.set(key, value, mode, duration);
    }
  }

  public async del(key: string): Promise<number> {
    try {
      return await this.executeCommand(['DEL', key]);
    } catch (err) {
      return this.inMemoryFallback.del(key);
    }
  }

  public async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.executeCommand(['SADD', key, ...members]);
    } catch (err) {
      return this.inMemoryFallback.sadd(key, ...members);
    }
  }

  public async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.executeCommand(['SREM', key, ...members]);
    } catch (err) {
      return this.inMemoryFallback.srem(key, ...members);
    }
  }

  public async smembers(key: string): Promise<string[]> {
    try {
      return await this.executeCommand(['SMEMBERS', key]);
    } catch (err) {
      return this.inMemoryFallback.smembers(key);
    }
  }

  public async sismember(key: string, member: string): Promise<number> {
    try {
      return await this.executeCommand(['SISMEMBER', key, member]);
    } catch (err) {
      return this.inMemoryFallback.sismember(key, member);
    }
  }

  public async expire(key: string, seconds: number): Promise<number> {
    try {
      return await this.executeCommand(['EXPIRE', key, seconds]);
    } catch (err) {
      return this.inMemoryFallback.expire(key, seconds);
    }
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  public async setJson<T>(key: string, value: T, durationSeconds?: number): Promise<'OK' | null> {
    const str = JSON.stringify(value);
    if (durationSeconds) {
      return this.set(key, str, 'EX', durationSeconds);
    }
    return this.set(key, str);
  }
}

function createRedisClient(): IRedisClient {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    console.log('[REDIS] ⚡ Connected to Upstash Redis REST cluster.');
    return new UpstashRestRedisClient(upstashUrl, upstashToken);
  }

  console.log('[REDIS] ℹ️ Upstash credentials not detected. Running on local in-memory fallback.');
  return new InMemoryRedisClient();
}

export const redis = createRedisClient();