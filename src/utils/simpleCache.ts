// 超简单但有效的缓存和去重系统
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const pendingRequests = new Map<string, Promise<any>>();

export function cachedFetch(url: string, ttl: number = 15000): Promise<any> {
  const now = Date.now();

  // 检查缓存
  const cached = cache.get(url);
  if (cached && (now - cached.timestamp) < cached.ttl) {
    console.log(`🎯 CACHE HIT: ${url}`);
    return Promise.resolve(cached.data);
  }

  // 检查是否已有相同请求在进行中
  if (pendingRequests.has(url)) {
    console.log(`⏳ DUPLICATE PREVENTED: ${url}`);
    return pendingRequests.get(url)!;
  }

  console.log(`🚀 FRESH REQUEST: ${url}`);

  // 创建新请求
  const request = fetch(url)
    .then(response => response.json())
    .then(data => {
      // 存入缓存
      cache.set(url, { data, timestamp: now, ttl });
      console.log(`✅ CACHED: ${url}`);
      return data;
    })
    .catch(error => {
      console.error(`❌ REQUEST FAILED: ${url}`, error);
      throw error;
    })
    .finally(() => {
      // 清除正在进行的请求
      pendingRequests.delete(url);
    });

  // 记录正在进行的请求
  pendingRequests.set(url, request);

  return request;
}

// 清除缓存的助手函数
export function clearCache(pattern?: string) {
  if (pattern) {
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      cache.delete(key);
      console.log(`🗑️ CACHE CLEARED: ${key}`);
    });
  } else {
    cache.clear();
    console.log(`🗑️ ALL CACHE CLEARED`);
  }
}

// API调用函数
export const api = {
  overview: () => cachedFetch('/api/overview', 10000),
  projects: () => cachedFetch('/api/projects', 15000),
  transactions: () => cachedFetch('/api/transactions', 15000),

  // 清除相关缓存
  clearOverview: () => clearCache('overview'),
  clearProjects: () => clearCache('projects'),
  clearTransactions: () => clearCache('transactions'),
  clearAll: () => clearCache()
};