// 服务端错误日志记录工具
// 由于服务端和客户端是分离的，我们通过特殊的响应头来传递错误信息给客户端

interface ErrorLogEntry {
  timestamp: string;
  message: string;
  source: string;
}

// 服务端错误日志存储（内存中临时存储）
let serverErrors: ErrorLogEntry[] = [];

export class ServerErrorLogger {
  static addError(message: string, source: string = 'API') {
    const timestamp = new Date().toLocaleString('zh-CN');
    const errorEntry: ErrorLogEntry = {
      timestamp,
      message,
      source
    };

    // 添加到内存存储（最新的在前面）
    serverErrors.unshift(errorEntry);

    // 只保留最近的100条错误
    if (serverErrors.length > 100) {
      serverErrors = serverErrors.slice(0, 100);
    }

    // 同时输出到控制台
    console.error(`[${source}] ${message}`);
  }

  static getErrors(): ErrorLogEntry[] {
    return [...serverErrors];
  }

  static clearErrors() {
    serverErrors = [];
  }
}

// 用于在API响应中包含错误信息的工具函数
export function addErrorToResponse(response: Response, error: string, source: string = 'API'): Response {
  ServerErrorLogger.addError(error, source);

  // 创建新的响应，添加错误信息到头部
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'X-Server-Error': encodeURIComponent(`[${new Date().toLocaleString('zh-CN')}] ${error}`),
      'X-Server-Error-Source': source
    }
  });

  return newResponse;
}