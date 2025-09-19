'use client';

import { useState, useEffect } from 'react';
import { InlineEditText } from '@/components/editable/InlineEditText';
import { InlineEditNumber } from '@/components/editable/InlineEditNumber';
import { InlineEditSelect } from '@/components/editable/InlineEditSelect';
import { InlineEditDate } from '@/components/editable/InlineEditDate';

interface Project {
  id: number;
  项目名称: string;
  项目代号: string;
  交易类型: '做多' | '做空';
  当前价: number;
  状态: '进行' | '完成';
  排序顺序?: number;
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
  排序顺序?: number;
}

export default function PlansPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [planTransactions, setPlanTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);

  // 从 localStorage 加载显示/隐藏状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHideValues = localStorage.getItem('hideValues');
      if (savedHideValues !== null) {
        setHideValues(JSON.parse(savedHideValues));
      }
    }
  }, []);

  // 保存显示/隐藏状态到 localStorage
  const toggleHideValues = () => {
    const newHideValues = !hideValues;
    setHideValues(newHideValues);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hideValues', JSON.stringify(newHideValues));
    }
  };
  const [totalAmount, setTotalAmount] = useState(100000);

  // 获取总金额
  const fetchTotalAmount = async () => {
    try {
      const response = await fetch('/api/overview');
      const data = await response.json();
      if (data.success && data.data) {
        const totalAmountValue = data.data.总金额;
        if (totalAmountValue && totalAmountValue > 0) {
          setTotalAmount(totalAmountValue);
        } else {
          setTotalAmount(100000);
        }
      } else {
        setTotalAmount(100000);
      }
    } catch (error) {
      console.error('获取总金额失败:', error);
      setTotalAmount(100000);
    }
  };

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        // 按排序顺序排序项目
        const sortedProjects = data.data.sort((a: Project, b: Project) =>
          (a.排序顺序 || 0) - (b.排序顺序 || 0)
        );
        setProjects(sortedProjects);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
    }
  };

  // 获取计划交易
  const fetchPlanTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      if (data.success) {
        // 只显示状态为"计划"的交易
        const plans = data.data.filter((t: Transaction) => t.状态 === '计划');
        setPlanTransactions(plans);
      }
    } catch (error) {
      console.error('获取计划交易失败:', error);
    }
  };

  // 按项目顺序排序计划交易
  const sortPlanTransactionsByProjectOrder = (transactions: Transaction[], projects: Project[]) => {
    // 创建项目ID到数组索引的映射（数组索引就是显示顺序）
    const projectOrderMap = new Map<number, number>();
    projects.forEach((project, index) => {
      projectOrderMap.set(project.id, index);
    });

    return transactions.sort((a, b) => {
      const projectOrderA = projectOrderMap.get(a.项目ID) ?? 999;
      const projectOrderB = projectOrderMap.get(b.项目ID) ?? 999;

      // 先按项目在数组中的位置排序
      if (projectOrderA !== projectOrderB) {
        return projectOrderA - projectOrderB;
      }

      // 同一项目内按交易排序顺序排序
      return (a.排序顺序 || 0) - (b.排序顺序 || 0);
    });
  };

  useEffect(() => {
    const loadData = async () => {
      // 1. 获取总金额
      await fetchTotalAmount();

      // 2. 获取项目数据
      const projectsResponse = await fetch('/api/projects');
      const projectsData = await projectsResponse.json();
      let fetchedProjects: Project[] = [];
      if (projectsData.success) {
        fetchedProjects = projectsData.data.sort((a: Project, b: Project) =>
          (a.排序顺序 || 0) - (b.排序顺序 || 0)
        );
        setProjects(fetchedProjects);
      }

      // 3. 获取计划交易并立即排序
      const transactionsResponse = await fetch('/api/transactions');
      const transactionsData = await transactionsResponse.json();
      if (transactionsData.success) {
        const plans = transactionsData.data.filter((t: Transaction) => t.状态 === '计划');

        // 立即排序
        if (fetchedProjects.length > 0) {
          const sortedPlans = sortPlanTransactionsByProjectOrder(plans, fetchedProjects);
          setPlanTransactions(sortedPlans);
        } else {
          setPlanTransactions(plans);
        }
      }

      setLoading(false);
    };
    loadData();
  }, []);

  // 更新交易信息
  const updateTransaction = async (transactionId: number, field: string, value: any) => {
    try {
      const currentTransaction = planTransactions.find(t => t.id === transactionId);
      if (!currentTransaction) {
        console.error('找不到交易记录');
        return;
      }

      const project = projects.find(p => p.id === currentTransaction.项目ID);
      if (!project) {
        console.error('找不到对应项目');
        return;
      }

      const currentPrice = project.当前价 || 0;
      const updateData: any = { [field]: value };

      // 根据字段进行自动计算
      switch (field) {
        case '警告方向':
          if (currentTransaction.交易价) {
            updateData.距离 = calculateDistance(value, currentTransaction.交易价, currentPrice);
          }
          break;

        case '距离':
          if (currentTransaction.警告方向) {
            updateData.交易价 = calculateTransactionPrice(currentTransaction.警告方向, value, currentPrice);
          }
          break;

        case '交易价':
          if (currentTransaction.警告方向) {
            updateData.距离 = calculateDistance(currentTransaction.警告方向, value, currentPrice);
          }
          if (currentTransaction.股数) {
            updateData.交易金额 = calculateTransactionAmount(currentTransaction.股数, value);
            updateData.仓位 = calculatePosition(currentTransaction.股数, value, totalAmount);
          }
          break;

        case '股数':
          if (currentTransaction.交易价) {
            updateData.交易金额 = calculateTransactionAmount(value, currentTransaction.交易价);
          }
          if (currentTransaction.交易价) {
            updateData.仓位 = calculatePosition(value, currentTransaction.交易价, totalAmount);
          }
          break;

        case '仓位':
          if (currentTransaction.交易价) {
            const newShares = calculateShares(value, totalAmount, currentTransaction.交易价);
            updateData.股数 = newShares;
            updateData.交易金额 = calculateTransactionAmount(newShares, currentTransaction.交易价);
          }
          break;

        case '交易金额':
          if (currentTransaction.交易价) {
            const newShares = Math.round(value / currentTransaction.交易价);
            updateData.股数 = newShares;
            const calculatedPosition = (value / totalAmount) * 100;
            updateData.仓位 = calculatedPosition;
          }
          break;
      }

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地状态
        setPlanTransactions(prev => prev.map(t =>
          t.id === transactionId ? { ...t, ...updateData } : t
        ));
      } else {
        console.error('更新交易失败:', data.error);
      }
    } catch (error) {
      console.error('更新交易失败:', error);
    }
  };

  // 计算函数
  const calculateDistance = (warningDirection: string, transactionPrice: number, currentPrice: number) => {
    if (!warningDirection || !transactionPrice || !currentPrice) return 0;

    if (warningDirection === '向下') {
      return -((transactionPrice - currentPrice) / currentPrice) * 100;
    } else if (warningDirection === '向上') {
      return ((transactionPrice - currentPrice) / currentPrice) * 100;
    }
    return 0;
  };

  const calculateTransactionPrice = (warningDirection: string, distance: number, currentPrice: number) => {
    if (!warningDirection || !distance || !currentPrice) return 0;

    if (warningDirection === '向下') {
      return currentPrice * (1 - distance / 100);
    } else if (warningDirection === '向上') {
      return currentPrice * (1 + distance / 100);
    }
    return 0;
  };

  const calculateShares = (position: number, totalAmount: number, transactionPrice: number) => {
    if (!position || !totalAmount || !transactionPrice) return 0;
    return Math.round((totalAmount * position / 100) / transactionPrice);
  };

  const calculatePosition = (shares: number, transactionPrice: number, totalAmount: number) => {
    if (!shares || !transactionPrice || !totalAmount) return 0;
    return (shares * transactionPrice / totalAmount) * 100;
  };

  const calculateTransactionAmount = (shares: number, transactionPrice: number) => {
    if (!shares || !transactionPrice) return 0;
    return shares * transactionPrice;
  };

  // 删除计划交易
  const deletePlanTransaction = async (transactionId: number) => {
    if (!confirm('确定要删除这条计划交易吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setPlanTransactions(prev => prev.filter(t => t.id !== transactionId));
      } else {
        console.error('删除计划交易失败:', data.error);
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除计划交易失败:', error);
      alert('删除失败，请重试');
    }
  };


  // 刷新数据并重新排序
  const refreshData = async () => {
    // 0. 先更新所有进行中项目的股价
    try {
      const priceUpdateRes = await fetch('/api/update-prices', { method: 'POST' });
      const priceUpdateJson = await priceUpdateRes.json();
      if (priceUpdateJson.success) {
        console.log('股价更新结果:', priceUpdateJson.data);
      }
    } catch (error) {
      console.error('更新股价失败:', error);
    }

    // 1. 获取总金额
    await fetchTotalAmount();

    // 2. 获取项目数据
    const projectsResponse = await fetch('/api/projects');
    const projectsData = await projectsResponse.json();
    let fetchedProjects: Project[] = [];
    if (projectsData.success) {
      fetchedProjects = projectsData.data.sort((a: Project, b: Project) =>
        (a.排序顺序 || 0) - (b.排序顺序 || 0)
      );
      setProjects(fetchedProjects);
    }

    // 3. 获取计划交易并立即排序
    const transactionsResponse = await fetch('/api/transactions');
    const transactionsData = await transactionsResponse.json();
    if (transactionsData.success) {
      const plans = transactionsData.data.filter((t: Transaction) => t.状态 === '计划');

      // 立即排序
      if (fetchedProjects.length > 0) {
        const sortedPlans = sortPlanTransactionsByProjectOrder(plans, fetchedProjects);
        setPlanTransactions(sortedPlans);
      } else {
        setPlanTransactions(plans);
      }
    }
  };

  // 数值隐藏/显示功能
  const formatValue = (value: number | null, suffix = '') => {
    if (value === null || value === undefined) return '-';
    if (hideValues) return '****';
    return value.toLocaleString() + suffix;
  };

  // 判断字段是否应该在隐藏状态下显示
  const shouldShowInHideMode = (fieldName: string) => {
    const alwaysVisibleFields = ['交易价', '仓位', '距离'];
    return alwaysVisibleFields.includes(fieldName);
  };

  // 格式化数值，考虑隐藏模式下的特殊显示
  const formatValueWithHideMode = (value: number | null, suffix = '', fieldName = '') => {
    if (value === null || value === undefined) return '-';
    if (hideValues && !shouldShowInHideMode(fieldName)) return '****';

    // 百分比字段统一1位小数
    const percentFields = ['仓位', '距离'];
    if (percentFields.includes(fieldName)) {
      const fixed = Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
      return fixed.toLocaleString() + suffix;
    }

    return value.toLocaleString() + suffix;
  };

  // 获取项目名称
  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.项目名称 : '未知项目';
  };

  // 获取当前价
  const getCurrentPrice = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.当前价 : 0;
  };

  // 更新项目当前价
  const updateProjectCurrentPrice = async (projectId: number, newPrice: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 当前价: newPrice }),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地项目状态
        setProjects(prev => prev.map(p =>
          p.id === projectId ? { ...p, 当前价: newPrice } : p
        ));
      } else {
        console.error('更新项目当前价失败:', data.error);
      }
    } catch (error) {
      console.error('更新项目当前价失败:', error);
    }
  };

  // 计算距离颜色
  const getDistanceColor = (distance: number) => {
    if (distance < 0) return 'text-green-600';
    if (distance > 2) return 'text-black';
    if (distance >= 1) return 'text-red-600';
    return 'text-blue-600';
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
        <h1 className="text-3xl font-bold">交易计划</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            title="刷新数据"
          >
            刷新
          </button>
          <button
            onClick={toggleHideValues}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {hideValues ? '显示' : '隐藏'}
          </button>
        </div>
      </div>

      {planTransactions.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="text-left py-3 px-4">项目名称</th>
                  <th className="text-left py-3 px-4">交易名称</th>
                  <th className="text-left py-3 px-4">交易类型</th>
                  <th className="text-left py-3 px-4">当前价</th>
                  <th className="text-left py-3 px-4">警告方向</th>
                  <th className="text-left py-3 px-4">距离</th>
                  <th className="text-left py-3 px-4">交易价</th>
                  <th className="text-left py-3 px-4">股数</th>
                  <th className="text-left py-3 px-4">仓位</th>
                  <th className="text-left py-3 px-4">交易金额</th>
                  <th className="text-left py-3 px-4">创建时间</th>
                  <th className="text-center py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {planTransactions.map((transaction, index) => {
                  // 检查当前行和下一行是否属于不同项目
                  const nextTransaction = planTransactions[index + 1];
                  const isDifferentProject = nextTransaction && nextTransaction.项目ID !== transaction.项目ID;

                  return (
                  <tr key={transaction.id} className={`${isDifferentProject ? 'border-b-2 border-blue-400' : 'border-b border-gray-200'} hover:bg-gray-50`}>
                    <td className="py-3 px-4 font-medium text-blue-600">
                      {getProjectName(transaction.项目ID)}
                    </td>
                    <td className="py-3 px-4">
                      <InlineEditText
                        value={transaction.交易名称}
                        onChange={(value) => updateTransaction(transaction.id, '交易名称', value)}
                        placeholder="交易名称"
                      />
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <InlineEditNumber
                        value={getCurrentPrice(transaction.项目ID) || 0}
                        onChange={(value) => updateProjectCurrentPrice(transaction.项目ID, value)}
                        precision={2}
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <InlineEditSelect
                        value={transaction.警告方向}
                        options={[
                          { value: '向上', label: '向上' },
                          { value: '向下', label: '向下' }
                        ]}
                        onChange={(value) => updateTransaction(transaction.id, '警告方向', value)}
                      />
                    </td>
                    <td className={`py-3 px-4 ${getDistanceColor(transaction.距离 || 0)}`}>
                      <InlineEditNumber
                        value={transaction.距离 || 0}
                        onChange={(value) => updateTransaction(transaction.id, '距离', value)}
                        precision={1}
                        suffix="%"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 px-4">
                      {hideValues && !shouldShowInHideMode('交易价') ? (
                        '****'
                      ) : (
                        <InlineEditNumber
                          value={transaction.交易价 || 0}
                          onChange={(value) => updateTransaction(transaction.id, '交易价', value)}
                          precision={2}
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {hideValues ? (
                        '****'
                      ) : (
                        <InlineEditNumber
                          value={transaction.股数 || 0}
                          onChange={(value) => updateTransaction(transaction.id, '股数', value)}
                          precision={0}
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {hideValues && !shouldShowInHideMode('仓位') ? (
                        '****'
                      ) : (
                        <InlineEditNumber
                          value={transaction.仓位 || 0}
                          onChange={(value) => updateTransaction(transaction.id, '仓位', value)}
                          precision={1}
                          suffix="%"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {hideValues ? (
                        '****'
                      ) : (
                        <InlineEditNumber
                          value={transaction.交易金额 || 0}
                          onChange={(value) => updateTransaction(transaction.id, '交易金额', value)}
                          precision={2}
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <InlineEditDate
                        value={transaction.创建时间}
                        onChange={(value) => updateTransaction(transaction.id, '创建时间', value)}
                        placeholder="选择创建时间"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => deletePlanTransaction(transaction.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                        title="删除计划"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">暂无交易计划</div>
          <div className="mt-4 text-gray-400">
            您可以在项目管理页面创建新的交易计划
          </div>
        </div>
      )}
    </div>
  );
}