'use client';

import { useState, useEffect } from 'react';
import { InlineEditText } from '@/components/editable/InlineEditText';
import { InlineEditNumber } from '@/components/editable/InlineEditNumber';
import { InlineEditSelect } from '@/components/editable/InlineEditSelect';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  排序顺序?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<{ [projectId: number]: Transaction[] }>({});
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);
  const [totalAmount, setTotalAmount] = useState(100000); // 总投资金额

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 获取总金额
  const fetchTotalAmount = async () => {
    try {
      const response = await fetch('/api/overview');
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const totalAmountValue = data.data[0].总金额;
        if (totalAmountValue && totalAmountValue > 0) {
          setTotalAmount(totalAmountValue);
          console.log('获取总金额成功:', totalAmountValue, '类型:', typeof totalAmountValue);
        } else {
          console.warn('总金额无效:', totalAmountValue, '使用默认值 100000');
          setTotalAmount(100000);
        }
      } else {
        console.warn('API返回数据无效，使用默认值 100000');
        setTotalAmount(100000);
      }
    } catch (error) {
      console.error('获取总金额失败:', error, '使用默认值 100000');
      setTotalAmount(100000);
    }
  };

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
    const loadData = async () => {
      await Promise.all([
        fetchTotalAmount(),
        fetchProjects()
      ]);
      setLoading(false);
    };
    loadData();
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

  // 更新交易信息（带自动计算）
  const updateTransaction = async (transactionId: number, field: string, value: any) => {
    try {
      // 找到当前交易记录
      const currentTransaction = Object.values(transactions)
        .flat()
        .find(t => t.id === transactionId);
      
      if (!currentTransaction) {
        console.error('找不到交易记录');
        return;
      }

      // 找到对应的项目
      const project = projects.find(p => p.id === currentTransaction.项目ID);
      if (!project) {
        console.error('找不到对应项目');
        return;
      }

      const currentPrice = project.当前价 || 0;

      // 准备更新数据
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
            // 直接使用交易金额计算仓位，而不是通过股数和交易价
            const calculatedPosition = (value / totalAmount) * 100;
            updateData.仓位 = calculatedPosition;
            console.log('交易金额计算调试:', {
              交易金额: value,
              交易价: currentTransaction.交易价,
              股数: newShares,
              总金额: totalAmount,
              计算仓位: calculatedPosition,
              计算过程: `${value} / ${totalAmount} * 100 = ${calculatedPosition}%`
            });
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
        setTransactions(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(projectId => {
            updated[Number(projectId)] = updated[Number(projectId)].map(t =>
              t.id === transactionId ? { ...t, ...updateData } : t
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

  // 删除交易记录
  const deleteTransaction = async (transactionId: number, projectId: number) => {
    if (!confirm('确定要删除这条交易记录吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        // 从本地状态中移除交易记录
        setTransactions(prev => ({
          ...prev,
          [projectId]: prev[projectId]?.filter(t => t.id !== transactionId) || []
        }));

        // 重新获取项目数据以更新计算字段
        fetchProjects();
      } else {
        console.error('删除交易失败:', data.error);
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除交易失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 创建新交易记录
  const createTransaction = async (projectId: number) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          项目ID: projectId,
          项目名称: projects.find(p => p.id === projectId)?.项目名称 || '',
          状态: '计划',
          交易名称: '新交易',
          交易类型: '做多',
          警告方向: '向上',
          距离: 0,
          交易价: 0,
          股数: 0,
          仓位: 0,
          交易金额: 0,
          排序顺序: (transactions[projectId]?.length || 0)
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 将新交易添加到本地状态
        setTransactions(prev => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), data.data]
        }));
      } else {
        console.error('创建交易失败:', data.error);
        alert('创建交易失败，请重试');
      }
    } catch (error) {
      console.error('创建交易失败:', error);
      alert('创建交易失败，请重试');
    }
  };

  // 删除项目
  const deleteProject = async (projectId: number) => {
    if (!confirm('确定要删除这个项目吗？这将同时删除该项目的所有交易记录。')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        // 从本地状态中移除项目
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        // 从本地状态中移除该项目的交易记录
        setTransactions(prev => {
          const newTransactions = { ...prev };
          delete newTransactions[projectId];
          return newTransactions;
        });
      } else {
        console.error('删除项目失败:', data.error);
        alert('删除项目失败，请重试');
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      alert('删除项目失败，请重试');
    }
  };

  // 创建新项目
  const createProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          项目名称: '新项目',
          项目代号: '',
          交易类型: '做多',
          当前价: 0,
          状态: '进行'
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 将新项目添加到本地状态
        setProjects(prev => [data.data, ...prev]);
        
        // 初始化该项目的交易记录为空数组
        setTransactions(prev => ({
          ...prev,
          [data.data.id]: []
        }));
      } else {
        console.error('创建项目失败:', data.error);
        alert('创建项目失败，请重试');
      }
    } catch (error) {
      console.error('创建项目失败:', error);
      alert('创建项目失败，请重试');
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
    const alwaysVisibleFields = ['成本价', '当前价', '仓位', '项目盈亏率', '自主盈亏率', '交易价'];
    return alwaysVisibleFields.includes(fieldName);
  };

  // 格式化数值，考虑隐藏模式下的特殊显示
  const formatValueWithHideMode = (value: number | null, suffix = '', fieldName = '') => {
    if (value === null || value === undefined) return '-';
    if (hideValues && !shouldShowInHideMode(fieldName)) return '****';
    return value.toLocaleString() + suffix;
  };

  // 检查值是否为 null 或 undefined
  const isNullValue = (value: any) => {
    return value === null || value === undefined;
  };

  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent, projectId: number) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const projectTransactions = transactions[projectId] || [];
      const oldIndex = projectTransactions.findIndex(item => item.id === active.id);
      const newIndex = projectTransactions.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTransactions = arrayMove(projectTransactions, oldIndex, newIndex);
        
        // 更新排序顺序
        const updatedTransactions = newTransactions.map((transaction, index) => ({
          ...transaction,
          排序顺序: index
        }));

        // 更新本地状态
        setTransactions(prev => ({
          ...prev,
          [projectId]: updatedTransactions
        }));

        // 更新服务器端排序
        try {
          await fetch('/api/transactions/reorder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId,
              transactions: updatedTransactions.map(t => ({ id: t.id, 排序顺序: t.排序顺序 }))
            }),
          });
        } catch (error) {
          console.error('更新排序失败:', error);
        }
      }
    }
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

  // 可拖拽的交易行组件
  const DraggableTransactionRow = ({ transaction, projectId }: { transaction: Transaction, projectId: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: transaction.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`border-b hover:bg-gray-50 ${isDragging ? 'opacity-50' : ''}`}
      >
        <td className="py-2 px-3">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
              title="拖拽排序"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M3 2h6v1H3V2zm0 3h6v1H3V5zm0 3h6v1H3V8z"/>
              </svg>
            </button>
            <InlineEditSelect
              value={transaction.状态}
              options={[
                { value: '计划', label: '计划' },
                { value: '完成', label: '完成' }
              ]}
              onChange={(value) => updateTransaction(transaction.id, '状态', value)}
            />
          </div>
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
            placeholder="距离"
          />
        </td>
        <td className="py-2 px-3">
          {hideValues && !shouldShowInHideMode('交易价') ? (
            '****'
          ) : (
            <InlineEditNumber
              value={transaction.交易价 || 0}
              onChange={(value) => updateTransaction(transaction.id, '交易价', value)}
              precision={2}
              placeholder="交易价"
            />
          )}
        </td>
        <td className="py-2 px-3">
          {hideValues ? (
            '****'
          ) : (
            <InlineEditNumber
              value={transaction.股数 || 0}
              onChange={(value) => updateTransaction(transaction.id, '股数', value)}
              precision={0}
              placeholder="股数"
            />
          )}
        </td>
        <td className="py-2 px-3">
          {hideValues && !shouldShowInHideMode('仓位') ? (
            '****'
          ) : (
            <InlineEditNumber
              value={transaction.仓位 || 0}
              onChange={(value) => updateTransaction(transaction.id, '仓位', value)}
              precision={2}
              suffix="%"
              placeholder="仓位"
            />
          )}
        </td>
        <td className="py-2 px-3">
          {hideValues ? (
            '****'
          ) : (
            <InlineEditNumber
              value={transaction.交易金额 || 0}
              onChange={(value) => updateTransaction(transaction.id, '交易金额', value)}
              precision={2}
              placeholder="交易金额"
            />
          )}
        </td>
        <td className="py-2 px-3">
          {new Date(transaction.创建时间).toLocaleDateString()}
        </td>
        <td className="py-2 px-3 text-center">
          <button
            onClick={() => deleteTransaction(transaction.id, projectId)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
            title="删除交易记录"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/>
            </svg>
          </button>
        </td>
      </tr>
    );
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">项目管理</h1>
          <button
            onClick={createProject}
            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex items-center justify-center text-lg font-bold"
            title="添加项目"
          >
            +
          </button>
        </div>
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
                          className="font-medium text-blue-600"
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
                        {formatValueWithHideMode(project.成本价, '', '成本价')}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues && !shouldShowInHideMode('当前价') ? (
                          '****'
                        ) : (
                          <InlineEditNumber
                            value={project.当前价 || 0}
                            onChange={(value) => updateProject(project.id, '当前价', value)}
                            precision={2}
                          />
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {formatValueWithHideMode(project.股数, '', '股数')}
                      </td>
                      <td className="py-2 px-3">
                        {formatValueWithHideMode(project.仓位, '%', '仓位')}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? '****' : formatValue(project.成本金额)}
                      </td>
                      <td className="py-2 px-3">
                        {hideValues ? '****' : formatValue(project.当前金额)}
                      </td>
                      <td className={`py-2 px-3 ${getProfitColor(project.盈亏金额)}`}>
                        {formatValueWithHideMode(project.盈亏金额, '', '盈亏金额')}
                      </td>
                      <td className={`py-2 px-3 ${getProfitColor(project.项目盈亏率)}`}>
                        {formatValueWithHideMode(project.项目盈亏率, '%', '项目盈亏率')}
                      </td>
                      <td className={`py-2 px-3 ${getProfitColor(project.自主盈亏率)}`}>
                        {formatValueWithHideMode(project.自主盈亏率, '%', '自主盈亏率')}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <InlineEditSelect
                            value={project.状态}
                            options={[
                              { value: '进行', label: '进行' },
                              { value: '完成', label: '完成' }
                            ]}
                            onChange={(value) => updateProject(project.id, '状态', value)}
                          />
                          <button
                            onClick={() => deleteProject(project.id)}
                            className="w-5 h-5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded flex items-center justify-center transition-colors"
                            title="删除项目"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 交易记录表格 */}
            <div className="p-6">
              {transactions[project.id] && transactions[project.id].length > 0 ? (
                <div className="overflow-x-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, project.id)}
                  >
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
                          <th className="text-center py-2 px-3 w-16">
                            <button
                              onClick={() => createTransaction(project.id)}
                              className="text-green-500 hover:text-green-700 hover:bg-green-50 rounded p-1 transition-colors"
                              title="新增交易记录"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14"/>
                              </svg>
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <SortableContext
                        items={transactions[project.id].map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <tbody>
                          {transactions[project.id]
                            .sort((a, b) => (a.排序顺序 || 0) - (b.排序顺序 || 0))
                            .map((transaction) => (
                            <DraggableTransactionRow
                              key={transaction.id}
                              transaction={transaction}
                              projectId={project.id}
                            />
                          ))}
                        </tbody>
                      </SortableContext>
                    </table>
                  </DndContext>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-0">
                  <div className="flex items-center justify-center gap-2">
                    <span>暂无交易记录</span>
                    <button
                      onClick={() => createTransaction(project.id)}
                      className="ml-2 w-6 h-6 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center text-sm font-bold"
                      title="添加交易"
                    >
                      +
                    </button>
                  </div>
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