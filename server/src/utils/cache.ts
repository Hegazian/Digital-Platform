/**
 * CacheService with TTL support & fallback for Redis or memory map.
 */
export class CacheService {
  private static memoryStore = new Map<string, { value: any; expiresAt: number | null }>();

  static async get<T>(key: string): Promise<T | null> {
    const item = this.memoryStore.get(key);
    if (!item) {
      return null;
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return item.value as T;
  }

  static async set(key: string, value: any, ttlSec?: number): Promise<void> {
    const expiresAt = ttlSec ? Date.now() + ttlSec * 1000 : null;
    this.memoryStore.set(key, { value, expiresAt });
  }

  static async del(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }

  static async clear(): Promise<void> {
    this.memoryStore.clear();
  }
}
