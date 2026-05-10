/**
 * In-memory cache for revoked tokens.
 * Avoids a DB query on every request — entries are cached for 5 minutes.
 * Hard cap of MAX_SIZE entries prevents unbounded memory growth under token-flooding attacks.
 */

interface CacheEntry {
  revoked: boolean;
  expiresAt: number;
}

const MAX_SIZE = 10_000;

class TokenCache {
  private cache: Map<string, CacheEntry>;
  private ttl: number;

  constructor(ttlMinutes = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /** Returns true/false if cached, null if not in cache */
  isRevoked(token: string): boolean | null {
    const entry = this.cache.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(token);
      return null;
    }
    return entry.revoked;
  }

  set(token: string, revoked: boolean): void {
    if (this.cache.size >= MAX_SIZE) this.cleanup();
    this.cache.set(token, { revoked, expiresAt: Date.now() + this.ttl });
  }

  markAsRevoked(token: string): void {
    if (this.cache.size >= MAX_SIZE) this.cleanup();
    this.cache.set(token, { revoked: true, expiresAt: Date.now() + this.ttl });
  }

  clear(): void {
    this.cache.clear();
  }

  /** Garbage-collect expired entries */
  cleanup(): void {
    const now = Date.now();
    for (const [token, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(token);
    }
  }

  getStats(): { size: number; ttlMinutes: number; maxSize: number } {
    return { size: this.cache.size, ttlMinutes: this.ttl / 60_000, maxSize: MAX_SIZE };
  }
}

export const tokenCache = new TokenCache(5);

// Garbage-collect every 10 minutes
setInterval(() => tokenCache.cleanup(), 10 * 60 * 1000).unref();
