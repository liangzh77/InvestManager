import ErrorLogger from './errorLogger';

// 客户端错误同步工具
export class ErrorSync {
  private static lastSyncTime = 0;
  private static isPolling = false;

  // 从服务端获取错误并同步到客户端日志
  static async syncServerErrors() {
    if (typeof window === 'undefined') return; // 只在客户端运行

    try {
      const response = await fetch('/api/server-errors');
      const data = await response.json();

      if (data.success && data.data) {
        const clientLogger = ErrorLogger.getInstance();
        const serverErrors = data.data;

        // 只添加新的错误（根据时间戳判断）
        const newErrors = serverErrors.filter((error: any) => {
          const errorTime = new Date(error.timestamp).getTime();
          return errorTime > this.lastSyncTime;
        });

        // 添加新错误到客户端日志
        newErrors.forEach((error: any) => {
          clientLogger.addError(`[${error.source}] ${error.message}`);
        });

        // 更新最后同步时间
        if (serverErrors.length > 0) {
          this.lastSyncTime = Math.max(
            ...serverErrors.map((e: any) => new Date(e.timestamp).getTime())
          );
        }
      }
    } catch (error) {
      console.error('同步服务端错误失败:', error);
    }
  }

  // 开始定期轮询服务端错误
  static startPolling(intervalMs = 5000) {
    if (this.isPolling || typeof window === 'undefined') return;

    this.isPolling = true;
    const poll = async () => {
      if (!this.isPolling) return;

      await this.syncServerErrors();
      setTimeout(poll, intervalMs);
    };

    poll();
  }

  // 停止轮询
  static stopPolling() {
    this.isPolling = false;
  }

  // 检查API响应中的错误头并添加到日志
  static checkResponseForErrors(response: Response) {
    const serverError = response.headers.get('X-Server-Error');
    const errorSource = response.headers.get('X-Server-Error-Source');

    if (serverError) {
      const clientLogger = ErrorLogger.getInstance();
      const decodedError = decodeURIComponent(serverError);
      clientLogger.addError(decodedError);
    }
  }
}

// 增强的fetch函数，自动检查响应中的错误
export const fetchWithErrorSync = async (url: string, options?: RequestInit): Promise<Response> => {
  const response = await fetch(url, options);
  ErrorSync.checkResponseForErrors(response);
  return response;
};