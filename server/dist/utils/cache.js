"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
/**
 * CacheService with TTL support & fallback for Redis or memory map.
 */
class CacheService {
    static memoryStore = new Map();
    static async get(key) {
        const item = this.memoryStore.get(key);
        if (!item) {
            return null;
        }
        if (item.expiresAt && Date.now() > item.expiresAt) {
            this.memoryStore.delete(key);
            return null;
        }
        return item.value;
    }
    static async set(key, value, ttlSec) {
        const expiresAt = ttlSec ? Date.now() + ttlSec * 1000 : null;
        this.memoryStore.set(key, { value, expiresAt });
    }
    static async del(key) {
        this.memoryStore.delete(key);
    }
    static async clear() {
        this.memoryStore.clear();
    }
}
exports.CacheService = CacheService;
