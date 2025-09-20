import ErrorLogger from './errorLogger';

// 测试错误日志功能的函数
export const testErrorLogger = () => {
  const logger = ErrorLogger.getInstance();

  // 添加一些测试错误
  logger.addError('网络连接超时 - 无法获取股票价格数据');
  logger.addError('API调用失败: 服务器返回500错误');
  logger.addError('数据库连接异常 - 无法保存项目信息');
  logger.addError('用户输入验证失败: 股数必须为正整数');

  console.log('已添加测试错误日志');
};

// 导出以便在浏览器控制台中使用
if (typeof window !== 'undefined') {
  (window as any).testErrorLogger = testErrorLogger;
}