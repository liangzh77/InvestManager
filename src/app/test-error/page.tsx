'use client';

import React, { useEffect } from 'react';
import ErrorLogger from '@/utils/errorLogger';
import { ErrorSync } from '@/utils/errorSync';
import ErrorLogViewer from '@/components/ErrorLogViewer';

export default function TestErrorPage() {
  const errorLogger = ErrorLogger.getInstance();

  useEffect(() => {
    // 启动服务端错误同步
    ErrorSync.startPolling(3000);

    return () => {
      ErrorSync.stopPolling();
    };
  }, []);

  const testClientError = () => {
    errorLogger.addError('客户端测试错误: 这是一个测试用的客户端错误消息');
  };

  const testServerError = async () => {
    try {
      // 调用一个不存在的API来触发服务端错误
      await fetch('/api/non-existent-endpoint');
    } catch (error) {
      console.log('触发了网络错误，这是预期的');
    }
  };

  const testApiError = async () => {
    try {
      // 创建一个无效的项目来触发验证错误
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 故意不提供必填字段
          项目名称: '',
          交易类型: '',
          状态: ''
        }),
      });
      const result = await response.json();
      console.log('API错误响应:', result);
    } catch (error) {
      console.error('测试API错误失败:', error);
    }
  };

  const triggerStockPriceError = async () => {
    try {
      // 触发股价更新来测试股价获取失败的错误记录
      const response = await fetch('/api/update-prices', {
        method: 'POST'
      });
      const result = await response.json();
      console.log('股价更新结果:', result);
    } catch (error) {
      console.error('触发股价更新失败:', error);
    }
  };

  const checkServerErrors = async () => {
    await ErrorSync.syncServerErrors();
    console.log('已同步服务端错误到客户端');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">错误日志测试页面</h1>
        <div className="relative">
          <ErrorLogViewer />
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={testClientError}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-4"
        >
          测试客户端错误
        </button>

        <button
          onClick={testServerError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors mr-4"
        >
          测试服务端错误
        </button>

        <button
          onClick={testApiError}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors mr-4"
        >
          测试API验证错误
        </button>

        <button
          onClick={triggerStockPriceError}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors mr-4"
        >
          触发股价更新
        </button>

        <button
          onClick={checkServerErrors}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors mr-4"
        >
          同步服务端错误
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">说明：</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>测试客户端错误</strong>：在客户端直接添加一个错误到日志中</li>
          <li><strong>测试服务端错误</strong>：调用不存在的API端点</li>
          <li><strong>测试API验证错误</strong>：提交无效数据触发服务端验证错误</li>
          <li><strong>触发股价更新</strong>：调用股价更新API，可能会产生股价获取失败的错误</li>
          <li><strong>同步服务端错误</strong>：手动同步服务端错误到客户端日志</li>
        </ul>

        <p className="mt-4 text-gray-600">
          测试完成后，点击页面右上角的Log图标查看错误日志。
        </p>
      </div>
    </div>
  );
}