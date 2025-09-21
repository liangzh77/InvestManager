interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time To Live in milliseconds
}

class ApiCache {
  private cache = new Map<string, CacheEntry>();

  set(key: string, data: any, ttl: number = 30000): void { // Default 30 seconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const apiCache = new ApiCache();

// In-flight requests to prevent duplicate calls
const inflightRequests = new Map<string, Promise<any>>();

// Cached fetch function
export async function cachedFetch(url: string, options?: RequestInit, ttl?: number): Promise<any> {
  const cacheKey = `${url}_${JSON.stringify(options || {})}`;

  // Try to get from cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log(`🎯 [Cache HIT] ${url}`);
    return cached;
  }

  // Check if request is already in flight
  if (inflightRequests.has(cacheKey)) {
    console.log(`⏳ [In-Flight] ${url} - waiting for existing request`);
    return await inflightRequests.get(cacheKey)!;
  }

  console.log(`🚀 [Cache MISS] ${url} - Cache size: ${apiCache.getStats().size}`);

  // Create and store the promise
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();

      // Only cache successful responses
      if (data.success) {
        apiCache.set(cacheKey, data, ttl);
        console.log(`✅ [Cached] ${url} for ${ttl || 30000}ms`);
      }

      return data;
    } catch (error) {
      console.error(`❌ [Cache ERROR] ${url}:`, error);
      throw error;
    } finally {
      // Remove from in-flight requests
      inflightRequests.delete(cacheKey);
    }
  })();

  // Store the promise to prevent duplicate requests
  inflightRequests.set(cacheKey, requestPromise);

  return await requestPromise;
}

// Helper functions for common API calls
export const cachedApiCalls = {
  overview: () => cachedFetch('/api/overview', undefined, 10000), // 10 seconds
  projects: () => cachedFetch('/api/projects', undefined, 15000), // 15 seconds
  transactions: () => cachedFetch('/api/transactions', undefined, 15000), // 15 seconds

  // Invalidate related caches after mutations
  invalidateOverview: () => apiCache.invalidatePattern('overview'),
  invalidateProjects: () => apiCache.invalidatePattern('projects'),
  invalidateTransactions: () => apiCache.invalidatePattern('transactions'),
  invalidateAll: () => apiCache.clear()
};