// 页面级别的错误日志管理器
// 每个页面有独立的错误日志实例，不需要全局同步

class PageErrorLogger {
  private errors: string[] = [];
  private hasNewErrors: boolean = false;
  private listeners: Array<() => void> = [];

  addError(error: string): void {
    const timestamp = new Date().toLocaleString('zh-CN');
    const errorWithTimestamp = `[${timestamp}] ${error}`;
    this.errors.unshift(errorWithTimestamp); // 最新的在最上面
    this.hasNewErrors = true;
    this.notifyListeners();
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  getHasNewErrors(): boolean {
    return this.hasNewErrors;
  }

  markAsViewed(): void {
    this.hasNewErrors = false;
    this.notifyListeners();
  }

  clearErrors(): void {
    this.errors = [];
    this.hasNewErrors = false;
    this.notifyListeners();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    // 返回取消订阅的函数
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }
}

// 页面错误日志管理器工厂
const pageLoggers = new Map<string, PageErrorLogger>();

export function getPageErrorLogger(pageId: string): PageErrorLogger {
  if (!pageLoggers.has(pageId)) {
    pageLoggers.set(pageId, new PageErrorLogger());
  }
  return pageLoggers.get(pageId)!;
}

// 便捷的错误记录函数
export function logPageError(pageId: string, error: string): void {
  const logger = getPageErrorLogger(pageId);
  logger.addError(error);
}

export default PageErrorLogger;