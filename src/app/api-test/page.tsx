'use client';

import { useState, useEffect } from 'react';

export default function ApiTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 项目相关的表单状态
  const [projectForm, setProjectForm] = useState({
    项目名称: '',
    项目代号: '',
    交易类型: '做多' as '做多' | '做空',
    当前价: '',
    状态: '进行' as '进行' | '完成'
  });

  // 交易相关的表单状态
  const [transactionForm, setTransactionForm] = useState({
    项目ID: '',
    交易名称: '',
    状态: '计划' as '计划' | '完成',
    交易类型: '做多' as '做多' | '做空' | '多头平仓' | '空头平仓',
    警告方向: '向上' as '向上' | '向下',
    交易价: '',
    股数: '',
    仓位: '',
    交易金额: ''
  });

  const [totalAmount, setTotalAmount] = useState('100000'); // 总金额，用于计算仓位

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState('');

  // 从localStorage加载缓存数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem('apiTestFormData');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed.projectForm) setProjectForm(parsed.projectForm);
          if (parsed.transactionForm) setTransactionForm(parsed.transactionForm);
          if (parsed.totalAmount) setTotalAmount(parsed.totalAmount);
          if (parsed.selectedProjectId) setSelectedProjectId(parsed.selectedProjectId);
          if (parsed.selectedTransactionId) setSelectedTransactionId(parsed.selectedTransactionId);
        } catch (error) {
          console.error('Failed to load cached data:', error);
        }
      }
    }
  }, []);

  // 保存数据到localStorage
  const saveToCache = () => {
    if (typeof window !== 'undefined') {
      const dataToCache = {
        projectForm,
        transactionForm,
        totalAmount,
        selectedProjectId,
        selectedTransactionId
      };
      localStorage.setItem('apiTestFormData', JSON.stringify(dataToCache));
    }
  };

  // 清除缓存
  const clearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apiTestFormData');
    }
  };

  // 计算交易金额和仓位
  const calculateTransactionValues = (股数: string, 交易价: string, 总金额: string) => {
    const shares = parseFloat(股数) || 0;
    const price = parseFloat(交易价) || 0;
    const total = parseFloat(总金额) || 0;

    const 交易金额 = shares * price;
    const 仓位 = total > 0 ? (交易金额 / total) * 100 : 0;

    return {
      交易金额: 交易金额.toFixed(2),
      仓位: 仓位.toFixed(2)
    };
  };

  // 更新交易表单的股数时自动计算
  const updateTransactionShares = (股数: string) => {
    const calculated = calculateTransactionValues(股数, transactionForm.交易价, totalAmount);
    setTransactionForm(prev => ({
      ...prev,
      股数,
      交易金额: calculated.交易金额,
      仓位: calculated.仓位
    }));
  };

  // 更新交易价时自动计算
  const updateTransactionPrice = (交易价: string) => {
    const calculated = calculateTransactionValues(transactionForm.股数, 交易价, totalAmount);
    setTransactionForm(prev => ({
      ...prev,
      交易价,
      交易金额: calculated.交易金额,
      仓位: calculated.仓位
    }));
  };

  const apiCall = async (url: string, options: RequestInit = {}) => {
    setLoading(true);
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      const data = await response.json();
      setResult({ url, status: response.status, data });
    } catch (error: any) {
      setResult({ url, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4 text-center">投资管理API测试页面</h1>

        {/* 缓存控制按钮 */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={saveToCache}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            缓存表单数据
          </button>
          <button
            onClick={clearCache}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            清除缓存
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          {/* 左侧控制面板 */}
          <div className="overflow-y-auto h-full bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4 sticky top-0 bg-white pb-2 border-b">API测试控制面板</h2>

            <div className="space-y-6">
              {/* 项目管理 API */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="text-lg font-semibold mb-4 text-blue-800">项目管理 API</h3>

                {/* 项目表单 */}
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    placeholder="项目名称 *"
                    value={projectForm.项目名称}
                    onChange={(e) => setProjectForm({ ...projectForm, 项目名称: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="项目代号"
                    value={projectForm.项目代号}
                    onChange={(e) => setProjectForm({ ...projectForm, 项目代号: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <select
                    value={projectForm.交易类型}
                    onChange={(e) => setProjectForm({ ...projectForm, 交易类型: e.target.value as '做多' | '做空' })}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="做多">做多</option>
                    <option value="做空">做空</option>
                  </select>
                  <input
                    type="number"
                    placeholder="当前价"
                    value={projectForm.当前价}
                    onChange={(e) => setProjectForm({ ...projectForm, 当前价: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <select
                    value={projectForm.状态}
                    onChange={(e) => setProjectForm({ ...projectForm, 状态: e.target.value as '进行' | '完成' })}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="进行">进行</option>
                    <option value="完成">完成</option>
                  </select>
                  <input
                    type="text"
                    placeholder="项目ID (用于更新/删除)"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-yellow-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => apiCall('/api/projects')}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    获取所有项目
                  </button>
                  <button
                    onClick={() => apiCall('/api/projects', {
                      method: 'POST',
                      body: JSON.stringify(projectForm)
                    })}
                    className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    创建项目
                  </button>
                  <button
                    onClick={() => selectedProjectId && apiCall(`/api/projects/${selectedProjectId}`)}
                    className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors disabled:bg-gray-300"
                    disabled={!selectedProjectId}
                  >
                    获取单个项目
                  </button>
                  <button
                    onClick={() => selectedProjectId && apiCall(`/api/projects/${selectedProjectId}`, {
                      method: 'PUT',
                      body: JSON.stringify(projectForm)
                    })}
                    className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors disabled:bg-gray-300"
                    disabled={!selectedProjectId}
                  >
                    更新项目
                  </button>
                  <button
                    onClick={() => selectedProjectId && apiCall(`/api/projects/${selectedProjectId}`, {
                      method: 'DELETE'
                    })}
                    className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors disabled:bg-gray-300"
                    disabled={!selectedProjectId}
                  >
                    删除项目
                  </button>
                </div>
              </div>

              {/* 交易管理 API */}
              <div className="border rounded-lg p-4 bg-green-50">
                <h3 className="text-lg font-semibold mb-4 text-green-800">交易管理 API</h3>

                {/* 交易表单 */}
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    placeholder="项目ID"
                    value={transactionForm.项目ID}
                    onChange={(e) => setTransactionForm({ ...transactionForm, 项目ID: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="交易名称"
                    value={transactionForm.交易名称}
                    onChange={(e) => setTransactionForm({ ...transactionForm, 交易名称: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <select
                    value={transactionForm.状态}
                    onChange={(e) => setTransactionForm({ ...transactionForm, 状态: e.target.value as '计划' | '完成' })}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="计划">计划</option>
                    <option value="完成">完成</option>
                  </select>
                  <select
                    value={transactionForm.交易类型}
                    onChange={(e) => setTransactionForm({ ...transactionForm, 交易类型: e.target.value as any })}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="做多">做多</option>
                    <option value="做空">做空</option>
                    <option value="多头平仓">多头平仓</option>
                    <option value="空头平仓">空头平仓</option>
                  </select>
                  <select
                    value={transactionForm.警告方向}
                    onChange={(e) => setTransactionForm({ ...transactionForm, 警告方向: e.target.value as '向上' | '向下' })}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="向上">向上</option>
                    <option value="向下">向下</option>
                  </select>

                  {/* 计算相关的输入框 */}
                  <div className="bg-blue-50 p-3 rounded border">
                    <div className="text-xs text-blue-800 mb-2 font-medium">💰 自动计算区域</div>
                    <input
                      type="number"
                      placeholder="总金额 (用于计算仓位)"
                      value={totalAmount}
                      onChange={(e) => {
                        setTotalAmount(e.target.value);
                        // 重新计算仓位
                        const calculated = calculateTransactionValues(transactionForm.股数, transactionForm.交易价, e.target.value);
                        setTransactionForm(prev => ({ ...prev, 仓位: calculated.仓位 }));
                      }}
                      className="w-full p-2 border rounded text-sm mb-2 bg-blue-100"
                    />
                    <input
                      type="number"
                      placeholder="交易价 *"
                      value={transactionForm.交易价}
                      onChange={(e) => updateTransactionPrice(e.target.value)}
                      className="w-full p-2 border rounded text-sm mb-2 border-blue-300"
                    />
                    <input
                      type="number"
                      placeholder="股数 *"
                      value={transactionForm.股数}
                      onChange={(e) => updateTransactionShares(e.target.value)}
                      className="w-full p-2 border rounded text-sm mb-2 border-blue-300"
                    />
                    <input
                      type="number"
                      placeholder="交易金额 (自动计算)"
                      value={transactionForm.交易金额}
                      readOnly
                      className="w-full p-2 border rounded text-sm mb-2 bg-gray-100 text-gray-700"
                    />
                    <input
                      type="number"
                      placeholder="仓位% (自动计算)"
                      value={transactionForm.仓位}
                      readOnly
                      className="w-full p-2 border rounded text-sm bg-gray-100 text-gray-700"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="交易ID (用于更新/删除)"
                    value={selectedTransactionId}
                    onChange={(e) => setSelectedTransactionId(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-yellow-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => apiCall('/api/transactions')}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    获取所有交易
                  </button>
                  <button
                    onClick={() => apiCall('/api/transactions', {
                      method: 'POST',
                      body: JSON.stringify(transactionForm)
                    })}
                    className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    创建交易
                  </button>
                  <button
                    onClick={() => selectedTransactionId && apiCall(`/api/transactions/${selectedTransactionId}`)}
                    className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors disabled:bg-gray-300"
                    disabled={!selectedTransactionId}
                  >
                    获取单个交易
                  </button>
                  <button
                    onClick={() => selectedTransactionId && apiCall(`/api/transactions/${selectedTransactionId}`, {
                      method: 'PUT',
                      body: JSON.stringify(transactionForm)
                    })}
                    className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors disabled:bg-gray-300"
                    disabled={!selectedTransactionId}
                  >
                    更新交易
                  </button>
                  <button
                    onClick={() => selectedTransactionId && apiCall(`/api/transactions/${selectedTransactionId}`, {
                      method: 'DELETE'
                    })}
                    className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors disabled:bg-gray-300"
                    disabled={!selectedTransactionId}
                  >
                    删除交易
                  </button>
                  <button
                    onClick={() => transactionForm.项目ID && apiCall(`/api/transactions?projectId=${transactionForm.项目ID}`)}
                    className="px-3 py-2 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 transition-colors disabled:bg-gray-300"
                    disabled={!transactionForm.项目ID}
                  >
                    按项目查询交易
                  </button>
                </div>
              </div>

              {/* 统计 API */}
              <div className="border rounded-lg p-4 bg-purple-50">
                <h3 className="text-lg font-semibold mb-4 text-purple-800">统计 API</h3>

                {/* 总金额更新 */}
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-purple-700">
                    总投资金额（用于计算总仓位）
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="总投资金额"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => apiCall('/api/overview', {
                        method: 'PUT',
                        body: JSON.stringify({ 总金额: parseFloat(totalAmount) || 0 })
                      })}
                      className="px-3 py-2 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 transition-colors"
                    >
                      更新总金额
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => apiCall('/api/overview')}
                    className="px-3 py-2 bg-cyan-500 text-white rounded text-sm hover:bg-cyan-600 transition-colors"
                  >
                    获取总览统计
                  </button>
                  <button
                    onClick={() => apiCall('/api/overview', { method: 'POST' })}
                    className="px-3 py-2 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 transition-colors"
                  >
                    刷新总览统计
                  </button>
                  <button
                    onClick={() => apiCall('/api/statistics')}
                    className="px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                  >
                    获取所有统计
                  </button>
                  <button
                    onClick={() => selectedProjectId && apiCall(`/api/statistics/${selectedProjectId}`)}
                    className="px-3 py-2 bg-pink-500 text-white rounded text-sm hover:bg-pink-600 transition-colors disabled:bg-gray-300"
                    disabled={!selectedProjectId}
                  >
                    获取项目详细统计
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧结果显示 */}
          <div className="h-full bg-white rounded-lg shadow">
            <div className="sticky top-0 bg-white p-4 border-b rounded-t-lg">
              <h2 className="text-xl font-semibold">API 返回结果</h2>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
              {loading && (
                <div className="flex items-center justify-center p-8">
                  <div className="text-lg text-blue-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    请求中...
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <strong className="text-blue-800">请求URL:</strong>
                    <span className="ml-2 text-blue-700 font-mono text-sm">{result.url}</span>
                  </div>

                  {result.status && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <strong className="text-gray-800">状态码:</strong>
                      <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                        result.status >= 200 && result.status < 300
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                  )}

                  {result.error && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <strong className="text-red-800">错误:</strong>
                      <span className="ml-2 text-red-700">{result.error}</span>
                    </div>
                  )}

                  {result.data && (
                    <div className="bg-gray-50 border rounded-lg">
                      <div className="bg-gray-100 px-4 py-3 border-b rounded-t-lg">
                        <strong className="text-gray-800">响应数据:</strong>
                      </div>
                      <div className="p-4">
                        <pre className="text-sm overflow-auto bg-white p-4 rounded border border-gray-200 shadow-inner font-mono leading-relaxed">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!result && !loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">🚀</div>
                    <div className="text-lg font-medium">点击左侧按钮测试API</div>
                    <div className="text-sm text-gray-400 mt-2">API响应结果将在这里显示</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}