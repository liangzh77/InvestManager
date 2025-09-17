'use client';

import { useState, useEffect } from 'react';
import { InlineEditText } from '@/components/editable/InlineEditText';
import { InlineEditNumber } from '@/components/editable/InlineEditNumber';
import { InlineEditSelect } from '@/components/editable/InlineEditSelect';

interface Project {
  id: number;
  项目名称: string;
  项目代号: string;
  交易类型: '做多' | '做空';
  成本价: number;
  当前价: number;
  股数: number;
  仓位: number;
  成本金额: number;
  当前金额: number;
  盈亏金额: number;
  项目盈亏率: number;
  自主盈亏率: number;
  状态: '进行' | '完成';
  创建时间: string;
  完成时间?: string;
}

interface Transaction {
  id: number;
  项目ID: number;
  项目名称: string;
  状态: '计划' | '完成';
  交易名称: string;
  交易类型: '做多' | '做空' | '多头平仓' | '空头平仓';
  警告方向: '向上' | '向下';
  距离: number;
  交易价: number;
  股数: number;
  仓位: number;
  交易金额: number;
  创建时间: string;
  交易时间?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<{ [projectId: number]: Transaction[] }>({});
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
        // 为每个项目获取交易记录
        for (const project of data.data) {
          await fetchTransactionsForProject(project.id);
        }
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
    }
  };

  // 获取指定项目的交易记录
  const fetchTransactionsForProject = async (projectId: number) => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      if (data.success) {
        const projectTransactions = data.data.filter((t: Transaction) => t.项目ID === projectId);
        setTransactions(prev => ({
          ...prev,
          [projectId]: projectTransactions
        }));
      }
    } catch (error) {
      console.error(`获取项目 ${projectId} 的交易记录失败:`, error);
    }
  };

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, []);

  // 更新项目信息
  const updateProject = async (projectId: number, field: string, value: any) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地状态
        setProjects(prev => prev.map(p =>
          p.id === projectId ? { ...p, [field]: value } : p
        ));
      } else {
        console.error('更新项目失败:', data.error);
      }
    } catch (error) {
      console.error('更新项目失败:', error);
    }
  };

  // 更新交易信息
  const updateTransaction = async (transactionId: number, field: string, value: any) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地状态
        setTransactions(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(projectId => {
            updated[Number(projectId)] = updated[Number(projectId)].map(t =>
              t.id === transactionId ? { ...t, [field]: value } : t
            );
          });
          return updated;
        });

        // 重新获取项目数据以更新计算字段
        fetchProjects();
      } else {
        console.error('更新交易失败:', data.error);
      }
    } catch (error) {
      console.error('更新交易失败:', error);
    }
  };

  // 数值隐藏/显示功能
  const formatValue = (value: number, suffix = '') => {
    if (hideValues) return '****';
    return value.toLocaleString() + suffix;
  };

  // 状态颜色样式
  const getStatusColor = (status: string) => {
    return status === '进行' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50';
  };

  // 盈亏颜色样式
  const getProfitColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">项目管理</h1>
        <button
          onClick={() => setHideValues(!hideValues)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {hideValues ? '显示' : '隐藏'}
        </button>
      </div>

      <div className="space-y-8">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 项目信息表格 */}
            <div className="p-6 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold mb-4">项目信息</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">项目名称</th>
                      <th className="text-left py-2 px-3">项目代号</th>
                      <th className="text-left py-2 px-3">交易类型</th>
                      <th className="text-left py-2 px-3">成本价</th>
                      <th className="text-left py-2 px-3">当前价</th>
                      <th className="text-left py-2 px-3">股数</th>
                      <th className="text-left py-2 px-3">仓位</th>
                      <th className="text-left py-2 px-3">成本金额</th>
                      <th className="text-left py-2 px-3">当前金额</th>
                      <th className="text-left py-2 px-3">盈亏金额</th>
                      <th className="text-left py-2 px-3">项目盈亏率</th>
                      <th className="text-left py-2 px-3">自主盈亏率</th>
                      <th className="text-left py-2 px-3">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 font-medium">
                        <InlineEditText
                          value={project.项目名称}
                          onChange={(value) => updateProject(project.id, '项目名称', value)}
                          className="font-medium"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <InlineEditText
                          value={project.项目代号}
                          onChange={(value) => updateProject(project.id, '项目代号', value)}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <InlineEditSelect
                          value={project.交易类型}
                          options={[
                            { value: '做多', label: '做多' },
                            { value: '做空', label: '做空' }
                          ]}
                          onChange={(value) => updateProject(project.id, '交易类型', value)}
                        />
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? '****' : formatValue(project.成本价)}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? (
                          '****'
                        ) : (
                          <InlineEditNumber
                            value={project.当前价}
                            onChange={(value) => updateProject(project.id, '当前价', value)}
                            precision={2}
                          />
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? '****' : formatValue(project.股数)}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? '****' : formatValue(project.仓位, '%')}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? '****' : formatValue(project.成本金额)}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? '****' : formatValue(project.当前金额)}
                      </td>
                      <td className={`py-2 px-3 ${getProfitColor(project.盈亏金额)}`}>
                        {hideValues ? '****' : formatValue(project.盈亏金额)}
                      </td>
                      <td className={`py-2 px-3 ${getProfitColor(project.项目盈亏率)}`}>
                        {hideValues ? '****' : formatValue(project.项目盈亏率, '%')}
                      </td>
                      <td className={`py-2 px-3 ${getProfitColor(project.自主盈亏率)}`}>
                        {hideValues ? '****' : formatValue(project.自主盈亏率, '%')}
                      </td>
                      <td className="py-2 px-3">
                        <InlineEditSelect
                          value={project.状态}
                          options={[
                            { value: '进行', label: '进行' },
                            { value: '完成', label: '完成' }
                          ]}
                          onChange={(value) => updateProject(project.id, '状态', value)}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 交易记录表格 */}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">交易记录</h3>
              {transactions[project.id] && transactions[project.id].length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">状态</th>
                        <th className="text-left py-2 px-3">交易名称</th>
                        <th className="text-left py-2 px-3">交易类型</th>
                        <th className="text-left py-2 px-3">警告方向</th>
                        <th className="text-left py-2 px-3">距离</th>
                        <th className="text-left py-2 px-3">交易价</th>
                        <th className="text-left py-2 px-3">股数</th>
                        <th className="text-left py-2 px-3">仓位</th>
                        <th className="text-left py-2 px-3">交易金额</th>
                        <th className="text-left py-2 px-3">创建时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions[project.id].map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <InlineEditSelect
                              value={transaction.状态}
                              options={[
                                { value: '计划', label: '计划' },
                                { value: '完成', label: '完成' }
                              ]}
                              onChange={(value) => updateTransaction(transaction.id, '状态', value)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <InlineEditText
                              value={transaction.交易名称}
                              onChange={(value) => updateTransaction(transaction.id, '交易名称', value)}
                              placeholder="交易名称"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <InlineEditSelect
                              value={transaction.交易类型}
                              options={[
                                { value: '做多', label: '做多' },
                                { value: '做空', label: '做空' },
                                { value: '多头平仓', label: '多头平仓' },
                                { value: '空头平仓', label: '空头平仓' }
                              ]}
                              onChange={(value) => updateTransaction(transaction.id, '交易类型', value)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <InlineEditSelect
                              value={transaction.警告方向}
                              options={[
                                { value: '向上', label: '向上' },
                                { value: '向下', label: '向下' }
                              ]}
                              onChange={(value) => updateTransaction(transaction.id, '警告方向', value)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <InlineEditNumber
                              value={transaction.距离 || 0}
                              onChange={(value) => updateTransaction(transaction.id, '距离', value)}
                              precision={2}
                              suffix="%"
                            />
                          </td>
                          <td className="py-2 px-3">
                            {hideValues ? (
                              '****'
                            ) : (
                              <InlineEditNumber
                                value={transaction.交易价}
                                onChange={(value) => updateTransaction(transaction.id, '交易价', value)}
                                precision={2}
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {hideValues ? (
                              '****'
                            ) : (
                              <InlineEditNumber
                                value={transaction.股数}
                                onChange={(value) => updateTransaction(transaction.id, '股数', value)}
                                precision={0}
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {hideValues ? (
                              '****'
                            ) : (
                              <InlineEditNumber
                                value={transaction.仓位}
                                onChange={(value) => updateTransaction(transaction.id, '仓位', value)}
                                precision={2}
                                suffix="%"
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {hideValues ? (
                              '****'
                            ) : (
                              <InlineEditNumber
                                value={transaction.交易金额}
                                onChange={(value) => updateTransaction(transaction.id, '交易金额', value)}
                                precision={2}
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {new Date(transaction.创建时间).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  暂无交易记录
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">暂无项目</div>
          <div className="mt-4">
            <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              创建新项目
            </button>
          </div>
        </div>
      )}
    </div>
  );
}