import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

type MemoryEntry = { value: string; expiresAt: number };

const KEYS = {
  taxonomyBrands: 'taxonomy:brands:active',
  taxonomyDistricts: 'taxonomy:districts',
  taxonomyCategoriesPublic: 'taxonomy:categories:public',
  dashboard: 'dashboard:summary',
} as const;

/**
 * Optional Redis cache with in-memory fallback.
 * Redis outage never fails the request (ASVS: caching must not be a SPOF).
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private redis: { get(k: string): Promise<string | null>; set(k: string, v: string, ...args: unknown[]): Promise<unknown>; del(...k: string[]): Promise<unknown>; quit(): Promise<unknown>; on(ev: string, fn: (e: Error) => void): void } | null =
    null;

  readonly keys = KEYS;

  async onModuleInit() {
    const url = process.env.REDIS_URL?.trim();
    const host = process.env.REDIS_HOST?.trim();
    if (!url && !host) return;
    try {
      const Redis = (await import('ioredis')).default;
      const client = url
        ? new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true })
        : new Redis({
            host,
            port: Number(process.env.REDIS_PORT ?? 6379),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
          });
      client.on('error', (err: Error) => {
        this.log.warn(`Redis error: ${err.message}`);
      });
      await client.connect();
      this.redis = client;
      this.log.log('Redis cache connected');
    } catch (err) {
      this.log.warn(
        `Redis unavailable, using in-memory cache (${err instanceof Error ? err.message : 'error'})`,
      );
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = this.redis
        ? await this.redis.get(key)
        : this.memoryGet(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.log.warn(
        `Cache get failed for ${key}: ${err instanceof Error ? err.message : 'error'}`,
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    try {
      if (this.redis) {
        await this.redis.set(key, raw, 'EX', ttlSeconds);
        return;
      }
      this.memory.set(key, {
        value: raw,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    } catch (err) {
      this.log.warn(
        `Cache set failed for ${key}: ${err instanceof Error ? err.message : 'error'}`,
      );
    }
  }

  async del(...keys: string[]): Promise<void> {
    const unique = [...new Set(keys.filter(Boolean))];
    if (unique.length === 0) return;
    try {
      if (this.redis) {
        await this.redis.del(...unique);
      }
      for (const key of unique) this.memory.delete(key);
    } catch (err) {
      this.log.warn(
        `Cache del failed: ${err instanceof Error ? err.message : 'error'}`,
      );
    }
  }

  invalidateTaxonomy() {
    return this.del(
      KEYS.taxonomyBrands,
      KEYS.taxonomyDistricts,
      KEYS.taxonomyCategoriesPublic,
    );
  }

  invalidateDashboard() {
    return this.del(KEYS.dashboard);
  }

  private memoryGet(key: string): string | null {
    const row = this.memory.get(key);
    if (!row) return null;
    if (row.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return row.value;
  }
}
