class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: string[] = [];
  private hasNewErrors: boolean = false;
  private listeners: Array<() => void> = [];

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

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

export default ErrorLogger;