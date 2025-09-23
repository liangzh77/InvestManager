'use client';

import { useState, useEffect } from 'react';
import { calculateProjectMetrics } from '@/lib/calculations';
import { InlineEditText } from '@/components/editable/InlineEditText';
import { InlineEditNumber } from '@/components/editable/InlineEditNumber';
import { InlineEditSelect } from '@/components/editable/InlineEditSelect';
import { InlineEditDate } from '@/components/editable/InlineEditDate';
import PageErrorLogViewer from '@/components/PageErrorLogViewer';
import { getPageErrorLogger } from '@/utils/pageErrorLogger';
import { api } from '@/utils/simpleCache';
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
  总盈亏率: number;
  状态: '进行' | '完成';
  排序顺序?: number;
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
  const [highlightedProjectId, setHighlightedProjectId] = useState<number | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    projects: { [id: number]: Partial<Project> },
    transactions: { [id: number]: Partial<Transaction> },
    deletedTransactions: number[],
    newTransactions: Transaction[]
  }>({ projects: {}, transactions: {}, deletedTransactions: [], newTransactions: [] });

  const pageErrorLogger = getPageErrorLogger('projects');

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
      const data = await api.overview();
      if (data.success && data.data) {
        const totalAmountValue = data.data.总金额;
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
      const errorMsg = `获取总金额失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg, '使用默认值 100000');
      pageErrorLogger.addError(errorMsg);
      setTotalAmount(100000);
    }
  };

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      const data = await api.projects();
      if (data.success) {
        // 按排序顺序排序项目
        const sortedProjects = data.data.sort((a: Project, b: Project) =>
          (a.排序顺序 || 0) - (b.排序顺序 || 0)
        );
        setProjects(sortedProjects);
      }
    } catch (error) {
      const errorMsg = `获取项目列表失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      pageErrorLogger.addError(errorMsg);
    }
  };

  // 获取所有交易记录并按项目分组
  const fetchAllTransactions = async () => {
    try {
      const data = await api.transactions();
      if (data.success) {
        // 按项目ID分组交易记录
        const transactionsByProject: { [projectId: number]: Transaction[] } = {};
        data.data.forEach((transaction: Transaction) => {
          const projectId = transaction.项目ID;
          if (!transactionsByProject[projectId]) {
            transactionsByProject[projectId] = [];
          }
          transactionsByProject[projectId].push(transaction);
        });

        // 对每个项目的交易按排序顺序排序
        Object.keys(transactionsByProject).forEach(projectId => {
          transactionsByProject[Number(projectId)].sort((a, b) =>
            (a.排序顺序 || 0) - (b.排序顺序 || 0)
          );
        });

        setTransactions(transactionsByProject);
      }
    } catch (error) {
      const errorMsg = `获取交易记录失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      pageErrorLogger.addError(errorMsg);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;

      try {
        const [overviewData, projectsData, transactionsData] = await Promise.all([
          api.overview(),
          api.projects(),
          api.transactions()
        ]);

        if (!isMounted) return;

        // 处理总金额
        if (overviewData.success && overviewData.data) {
          const totalAmountValue = overviewData.data.总金额;
          if (totalAmountValue && totalAmountValue > 0) {
            setTotalAmount(totalAmountValue);
          } else {
            setTotalAmount(100000);
          }
        } else {
          setTotalAmount(100000);
        }

        // 处理项目数据
        if (projectsData.success) {
          const sortedProjects = projectsData.data.sort((a: Project, b: Project) =>
            (a.排序顺序 || 0) - (b.排序顺序 || 0)
          );
          setProjects(sortedProjects);
        }

        // 处理交易数据
        if (transactionsData.success) {
          const transactionsByProject: { [projectId: number]: Transaction[] } = {};
          transactionsData.data.forEach((transaction: Transaction) => {
            const projectId = transaction.项目ID;
            if (!transactionsByProject[projectId]) {
              transactionsByProject[projectId] = [];
            }
            transactionsByProject[projectId].push(transaction);
          });

          // 对每个项目的交易按排序顺序排序
          Object.keys(transactionsByProject).forEach(projectId => {
            transactionsByProject[Number(projectId)].sort((a, b) =>
              (a.排序顺序 || 0) - (b.排序顺序 || 0)
            );
          });

          setTransactions(transactionsByProject);
        }

        setLoading(false);
      } catch (error) {
        if (isMounted) {
          const errorMsg = `加载数据失败: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          pageErrorLogger.addError(errorMsg);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 刷新并联动重算：计划交易仓位 + 项目仓位/盈亏率
  const refreshDataAndRecalculate = async () => {
    try {
      // 0) 先更新所有进行中项目的股价
      try {
        const priceUpdateRes = await fetch('/api/update-prices', { method: 'POST' });
        const priceUpdateJson = await priceUpdateRes.json();
        if (priceUpdateJson.success) {
          console.log('股价更新结果:', priceUpdateJson.data);

          // 检查具体的失败项目并记录错误
          if (priceUpdateJson.data?.results) {
            const results = priceUpdateJson.data.results;
            Object.keys(results).forEach(projectName => {
              const result = results[projectName];
              if (!result.success) {
                const errorMsg = `股价更新失败: ${projectName} - ${result.error}`;
                pageErrorLogger.addError(errorMsg);
              }
            });
          }
        }
      } catch (error) {
        const errorMsg = `更新股价失败: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        pageErrorLogger.addError(errorMsg);
      }

      // 1) 获取总金额
      const overviewJson = await api.overview();
      const total = overviewJson?.data?.总金额 && overviewJson.data.总金额 > 0 ? overviewJson.data.总金额 : 100000;
      setTotalAmount(total);

      // 2) 获取项目与交易 - 并行获取以提高性能
      const [projectsJson, txJson] = await Promise.all([
        api.projects(),
        api.transactions()
      ]);

      let fetchedProjects: Project[] = [];
      if (projectsJson.success) {
        fetchedProjects = projectsJson.data.sort((a: Project, b: Project) => (a.排序顺序 || 0) - (b.排序顺序 || 0));
        setProjects(fetchedProjects);
      }

      const allTx: Transaction[] = txJson.success ? txJson.data : [];
      const txByProject: { [projectId: number]: Transaction[] } = {};
      allTx.forEach(t => {
        const pid = t.项目ID as number;
        if (!txByProject[pid]) txByProject[pid] = [];
        txByProject[pid].push(t);
      });

      // 对每个项目的交易按排序顺序排序
      Object.keys(txByProject).forEach(projectId => {
        txByProject[Number(projectId)].sort((a, b) =>
          (a.排序顺序 || 0) - (b.排序顺序 || 0)
        );
      });

      setTransactions(txByProject);

      // 3) 重算所有交易（含"计划"和"完成"）的 交易金额 与 仓位（基于总金额）
      const updatedTxByProject: { [projectId: number]: Transaction[] } = {};
      const transactionUpdates: any[] = [];

      allTx.forEach(t => {
        const price = t.交易价 || 0;
        const amount = (t.交易金额 && t.交易金额 > 0)
          ? t.交易金额
          : ((t.股数 || 0) * (price || 0));
        const position = total > 0 ? (amount / total) * 100 : 0;

        // 更新交易数据
        const updatedTx = {
          ...t,
          交易金额: amount,
          仓位: position,
        };

        // 按项目分组更新后的交易数据
        const pid = t.项目ID as number;
        if (!updatedTxByProject[pid]) updatedTxByProject[pid] = [];
        updatedTxByProject[pid].push(updatedTx);

        // 收集需要更新的交易数据
        transactionUpdates.push({
          id: t.id,
          交易金额: amount,
          仓位: position,
        });
      });

      // 4) 按项目重算 仓位/项目盈亏率/总盈亏率（使用更新后的交易数据）
      const projectUpdates: any[] = [];
      fetchedProjects.forEach(p => {
        const list = updatedTxByProject[p.id] || [];
        const metrics = calculateProjectMetrics(list, p.当前价 || 0, total);
        projectUpdates.push({
          id: p.id,
          仓位: metrics.仓位,
          项目盈亏率: metrics.项目盈亏率,
          总盈亏率: metrics.总盈亏率,
        });
      });

      // 5) 批量更新数据库 - 只需要1个API调用！
      if (transactionUpdates.length > 0 || projectUpdates.length > 0) {
        console.log(`🚀 批量更新: ${transactionUpdates.length}个交易, ${projectUpdates.length}个项目`);

        try {
          const response = await fetch('/api/batch-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactions: transactionUpdates,
              projects: projectUpdates
            }),
          });

          const result = await response.json();
          if (result.success) {
            console.log(`✅ 批量更新成功: ${result.data.transactionsUpdated}个交易, ${result.data.projectsUpdated}个项目`);
          } else {
            console.error('❌ 批量更新失败:', result.error);
          }
        } catch (error) {
          console.error('❌ 批量更新请求失败:', error);
        }
      }

      // 更新本地交易状态
      setTransactions(updatedTxByProject);

      // 5) 同步本地状态中的项目派生字段
      setProjects(prev => prev.map(p => {
        const list = updatedTxByProject[p.id] || [];
        const metrics = calculateProjectMetrics(list, p.当前价 || 0, total);
        return {
          ...p,
          仓位: metrics.仓位,
          项目盈亏率: metrics.项目盈亏率,
          总盈亏率: metrics.总盈亏率,
        };
      }));
    } catch (err) {
      const errorMsg = `刷新并联动重算失败: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      pageErrorLogger.addError(errorMsg);
      // 兜底：保留原有简易刷新
      fetchTotalAmount();
      Promise.all([fetchProjects(), fetchAllTransactions()]);
    }
  };

  // 查询股价（只获取股价数据，不调用其他API）
  const queryStockPrices = async () => {
    try {
      console.log('🔍 开始查询股价...');
      const priceUpdateRes = await fetch('/api/update-prices', { method: 'POST' });
      const priceUpdateJson = await priceUpdateRes.json();

      if (priceUpdateJson.success) {
        console.log('股价查询结果:', priceUpdateJson.data);

        // 检查具体的失败项目并记录错误
        if (priceUpdateJson.data?.results) {
          const results = priceUpdateJson.data.results;
          Object.keys(results).forEach(projectName => {
            const result = results[projectName];
            if (!result.success) {
              const errorMsg = `股价查询失败: ${projectName} - ${result.error}`;
              pageErrorLogger.addError(errorMsg);
            }
          });
        }

        // 清除缓存并刷新项目数据以获取最新股价
        api.clearProjects();
        const data = await api.projects();
        if (data.success) {
          const sortedProjects = data.data.sort((a: Project, b: Project) =>
            (a.排序顺序 || 0) - (b.排序顺序 || 0)
          );

          // 检查是否有股价变化
          let hasPriceChanges = false;
          const projectUpdates: { [id: number]: Partial<Project> } = {};

          // 立即重新计算所有项目的盈亏等派生字段
          const updatedProjects = sortedProjects.map((project: Project) => {
            const oldProject = projects.find(p => p.id === project.id);
            const projectTransactions = transactions[project.id] || [];
            const metrics = calculateProjectMetrics(projectTransactions, project.当前价 || 0, totalAmount || 100000);

            // 检查当前价是否有变化
            if (oldProject && oldProject.当前价 !== project.当前价) {
              hasPriceChanges = true;
              projectUpdates[project.id] = {
                当前价: project.当前价,
                当前金额: metrics.当前金额,
                盈亏金额: metrics.盈亏金额,
                项目盈亏率: metrics.项目盈亏率,
                总盈亏率: metrics.总盈亏率,
              };

              // 有价格变化，保持原当前价，但更新其他计算字段
              return {
                ...oldProject,
                当前金额: metrics.当前金额,
                盈亏金额: metrics.盈亏金额,
                项目盈亏率: metrics.项目盈亏率,
                总盈亏率: metrics.总盈亏率,
              };
            } else {
              // 没有价格变化或oldProject不存在，正常更新
              return {
                ...project,
                当前金额: metrics.当前金额,
                盈亏金额: metrics.盈亏金额,
                项目盈亏率: metrics.项目盈亏率,
                总盈亏率: metrics.总盈亏率,
              };
            }
          });

          // 重新计算所有交易的距离
          const transactionUpdates: { [id: number]: Partial<Transaction> } = {};
          let hasTransactionChanges = false;

          updatedProjects.forEach(project => {
            const projectTransactions = transactions[project.id] || [];

            projectTransactions.forEach(transaction => {
              if (transaction.状态 === '计划' && transaction.警告方向 && transaction.交易价) {
                const newDistance = calculateDistance(
                  transaction.警告方向,
                  transaction.交易价,
                  project.当前价 || 0
                );

                if (Math.abs(newDistance - (transaction.距离 || 0)) > 0.01) {
                  transactionUpdates[transaction.id] = {
                    距离: newDistance
                  };
                  hasTransactionChanges = true;
                }
              }
            });
          });

          // 更新交易状态
          if (hasTransactionChanges) {
            setTransactions(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(projectId => {
                updated[Number(projectId)] = updated[Number(projectId)].map(t => {
                  if (transactionUpdates[t.id]) {
                    return { ...t, ...transactionUpdates[t.id] };
                  }
                  return t;
                });
              });
              return updated;
            });
          }

          // 如果有变化，设置本地修改标记
          if (hasPriceChanges || hasTransactionChanges) {
            setPendingChanges(prev => ({
              ...prev,
              projects: {
                ...prev.projects,
                ...projectUpdates
              },
              transactions: {
                ...prev.transactions,
                ...transactionUpdates
              }
            }));
            setHasLocalChanges(true);

            if (hasPriceChanges && hasTransactionChanges) {
              console.log('🔄 检测到股价变化，自动更新了交易距离，已设置为待提交状态');
            } else if (hasPriceChanges) {
              console.log('🔄 检测到股价变化，已设置为待提交状态');
            } else if (hasTransactionChanges) {
              console.log('🔄 自动更新了交易距离，已设置为待提交状态');
            }
          }

          setProjects(updatedProjects);
        }
      } else {
        const errorMsg = '股价查询失败';
        console.error(errorMsg);
        pageErrorLogger.addError(errorMsg);
      }
    } catch (error) {
      const errorMsg = `查询股价失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      pageErrorLogger.addError(errorMsg);
    }
  };

  // 提交所有本地修改
  const submitAllChanges = async () => {
    if (!hasLocalChanges) {
      console.log('没有需要提交的修改');
      return;
    }

    try {
      console.log('🚀 开始提交所有修改...');

      // 准备提交数据
      const projectsToUpdate = Object.keys(pendingChanges.projects).map(id => ({
        id: Number(id),
        ...pendingChanges.projects[Number(id)]
      }));

      const transactionsToUpdate = Object.keys(pendingChanges.transactions).map(id => ({
        id: Number(id),
        ...pendingChanges.transactions[Number(id)]
      }));

      // 准备新交易数据（移除临时ID）
      const newTransactionsToCreate = pendingChanges.newTransactions.map(({ id, ...transaction }) => transaction);

      // 调用批量更新API
      const response = await fetch('/api/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: transactionsToUpdate,
          projects: projectsToUpdate,
          deletedTransactions: pendingChanges.deletedTransactions,
          newTransactions: newTransactionsToCreate
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API请求失败:', response.status, response.statusText, errorText);
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const totalOperations =
          (result.data.transactionsDeleted || 0) +
          (result.data.transactionsCreated || 0) +
          (result.data.transactionsUpdated || 0) +
          (result.data.projectsUpdated || 0);

        console.log(`✅ 提交完成: 共 ${totalOperations} 个操作`);
        console.log(result.message);

        // 清空本地修改
        setPendingChanges({ projects: {}, transactions: {}, deletedTransactions: [], newTransactions: [] });
        setHasLocalChanges(false);

        // 清除相关缓存
        api.clearProjects();
        api.clearTransactions();
        api.clearOverview();

        // 重新加载数据（移除 fetchTotalAmount 调用）
        Promise.all([fetchProjects(), fetchAllTransactions()]);
      } else {
        const errorMsg = `提交失败: ${result.error}`;
        console.error(errorMsg);
        pageErrorLogger.addError(errorMsg);
      }

    } catch (error) {
      const errorMsg = `提交失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      pageErrorLogger.addError(errorMsg);
    }
  };

  // 更新项目信息（本地修改）
  const updateProject = (projectId: number, field: string, value: any) => {
    // 保存当前滚动位置
    saveScrollPosition();
    // 记录本地修改
    setPendingChanges(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [projectId]: {
          ...prev.projects[projectId],
          [field]: value
        }
      }
    }));
    setHasLocalChanges(true);

    // 如果修改的是当前价，则联动计算并更新本地状态
    if (field === '当前价') {
      const projectTransactions = transactions[projectId] || [];
      const metrics = calculateProjectMetrics(projectTransactions || [], value || 0, totalAmount || 100000);

      // 一次性更新相关字段
      setPendingChanges(prev => ({
        ...prev,
        projects: {
          ...prev.projects,
          [projectId]: {
            ...prev.projects[projectId],
            [field]: value,
            当前金额: metrics.当前金额,
            盈亏金额: metrics.盈亏金额,
            项目盈亏率: metrics.项目盈亏率,
            总盈亏率: metrics.总盈亏率,
          }
        }
      }));

      // 更新显示的项目状态
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          [field]: value,
          当前金额: metrics.当前金额,
          盈亏金额: metrics.盈亏金额,
          项目盈亏率: metrics.项目盈亏率,
          总盈亏率: metrics.总盈亏率,
        };
      }));
    } else {
      // 更新显示的项目状态
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, [field]: value } : p
      ));
    }

    // 恢复滚动位置
    restoreScrollPosition();
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

  // 保存和恢复滚动位置
  const saveScrollPosition = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('projectsPageScrollPosition', window.scrollY.toString());
    }
  };

  const restoreScrollPosition = () => {
    if (typeof window !== 'undefined') {
      const savedPosition = sessionStorage.getItem('projectsPageScrollPosition');
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition));
        }, 0);
      }
    }
  };

  // 更新交易信息（本地修改）
  const updateTransaction = (transactionId: number, field: string, value: any) => {
    // 保存当前滚动位置
    saveScrollPosition();
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
        }
        break;
    }

    // 记录本地修改
    Object.keys(updateData).forEach(key => {
      setPendingChanges(prev => ({
        ...prev,
        transactions: {
          ...prev.transactions,
          [transactionId]: {
            ...prev.transactions[transactionId],
            [key]: updateData[key]
          }
        }
      }));
    });
    setHasLocalChanges(true);

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

    // 恢复滚动位置
    restoreScrollPosition();
  };

  // 删除交易记录
  const deleteTransaction = (transactionId: number, projectId: number) => {
    // 如果是新增的交易（临时ID为负数），直接从newTransactions中移除
    if (transactionId < 0) {
      setPendingChanges(prev => ({
        ...prev,
        newTransactions: prev.newTransactions.filter(t => t.id !== transactionId)
      }));
    } else {
      // 如果是已存在的交易，记录到删除列表
      setPendingChanges(prev => ({
        ...prev,
        deletedTransactions: [...prev.deletedTransactions, transactionId]
      }));
    }

    // 从本地状态中移除交易记录
    setTransactions(prev => ({
      ...prev,
      [projectId]: prev[projectId]?.filter(t => t.id !== transactionId) || []
    }));

    // 标记有本地修改
    setHasLocalChanges(true);
  };

  // 创建新交易记录
  const createTransaction = (projectId: number) => {
    // 生成临时ID（负数，避免与真实ID冲突）
    const tempId = -Date.now();

    const newTransaction: Transaction = {
      id: tempId,
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
      创建时间: new Date().toISOString(),
      排序顺序: (transactions[projectId]?.length || 0)
    };

    // 记录到新增交易列表
    setPendingChanges(prev => ({
      ...prev,
      newTransactions: [...prev.newTransactions, newTransaction]
    }));

    // 将新交易添加到本地状态
    setTransactions(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), newTransaction]
    }));

    // 标记有本地修改
    setHasLocalChanges(true);
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

        // 新建项目后，设置需要提交状态
        setHasLocalChanges(true);
        // 记录新创建的项目到待提交列表
        setPendingChanges(prev => ({
          ...prev,
          projects: {
            ...prev.projects,
            [data.data.id]: {
              项目名称: data.data.项目名称
            }
          }
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
    const alwaysVisibleFields = ['成本价', '当前价', '仓位', '项目盈亏率', '总盈亏率', '交易价'];
    return alwaysVisibleFields.includes(fieldName);
  };

  // 百分比统一保留1位小数；成本价按阈值格式化
  const formatPercentToOneDecimal = (val: number) => {
    const fixed = Number.isFinite(val) ? Number(val.toFixed(1)) : 0;
    return fixed.toLocaleString();
  };

  const formatCostPrice = (val: number) => {
    if (!Number.isFinite(val)) return '-';
    if (Math.abs(val) > 999) return Number(val.toFixed(0)).toLocaleString();
    if (Math.abs(val) > 99) return Number(val.toFixed(1)).toLocaleString();
    return Number(val.toFixed(2)).toLocaleString();
  };

  // 格式化数值，考虑隐藏模式下的特殊显示
  const formatValueWithHideMode = (value: number | null, suffix = '', fieldName = '') => {
    if (value === null || value === undefined) return '-';
    if (hideValues && !shouldShowInHideMode(fieldName)) return '****';

    // 百分比字段统一1位小数
    const percentFields = ['仓位', '项目盈亏率', '总盈亏率', '距离'];
    if (percentFields.includes(fieldName)) {
      return formatPercentToOneDecimal(value) + suffix;
    }

    // 成本价按阈值格式化
    if (fieldName === '成本价') {
      return formatCostPrice(value);
    }

    return value.toLocaleString() + suffix;
  };

  // 检查值是否为 null 或 undefined
  const isNullValue = (value: any) => {
    return value === null || value === undefined;
  };

  // 获取项目字段的实际显示值（考虑本地修改）
  const getProjectFieldValue = (projectId: number, fieldName: string, defaultValue: any) => {
    const pendingProjectChanges = pendingChanges.projects[projectId];
    if (pendingProjectChanges && pendingProjectChanges.hasOwnProperty(fieldName)) {
      return (pendingProjectChanges as any)[fieldName];
    }
    return defaultValue;
  };

  // 处理交易拖拽结束
  const handleTransactionDragEnd = async (event: DragEndEvent, projectId: number) => {
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

  // 处理项目拖拽结束
  const handleProjectDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex(project => project.id === active.id);
      const newIndex = projects.findIndex(project => project.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newProjects = arrayMove(projects, oldIndex, newIndex);
        
        // 更新排序顺序
        const updatedProjects = newProjects.map((project, index) => ({
          ...project,
          排序顺序: index
        }));
        
        // 更新本地状态
        setProjects(updatedProjects);

        // 发送到服务器更新排序
        try {
          const response = await fetch('/api/projects/reorder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projects: updatedProjects.map(p => ({
                id: p.id,
                排序顺序: p.排序顺序
              }))
            }),
          });

          if (!response.ok) {
            console.error('更新项目排序失败');
            // 如果更新失败，重新获取数据
            Promise.all([fetchProjects(), fetchAllTransactions()]);
          }
        } catch (error) {
          console.error('更新项目排序失败:', error);
          // 如果更新失败，重新获取数据
          Promise.all([fetchProjects(), fetchAllTransactions()]);
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
    if (value > 0) return 'text-red-600';
    if (value < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  // 距离颜色样式
  const getDistanceColor = (distance: number) => {
    if (distance < 0) return 'text-green-600';
    if (distance > 2) return 'text-black';
    if (distance >= 1) return 'text-red-600';
    return 'text-blue-600';
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
          {transaction.状态 === '完成' ? (
            <span className="text-gray-400">-</span>
          ) : (
            <InlineEditSelect
              value={transaction.警告方向}
              options={[
                { value: '向上', label: '向上' },
                { value: '向下', label: '向下' }
              ]}
              onChange={(value) => updateTransaction(transaction.id, '警告方向', value)}
            />
          )}
        </td>
        <td className={`py-2 px-3 ${transaction.状态 === '完成' ? '' : getDistanceColor(transaction.距离 || 0)}`}>
          {transaction.状态 === '完成' ? (
            <span className="text-gray-400">-</span>
          ) : (
            <InlineEditNumber
              value={transaction.距离 || 0}
              onChange={(value) => updateTransaction(transaction.id, '距离', value)}
              precision={1}
              suffix="%"
              placeholder="0"
            />
          )}
        </td>
        <td className="py-2 px-3">
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
        <td className="py-2 px-3">
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
        <td className="py-2 px-3">
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
        <td className="py-2 px-3">
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
        <td className="py-2 px-3">
          <InlineEditDate
            value={transaction.创建时间}
            onChange={(value) => updateTransaction(transaction.id, '创建时间', value)}
            placeholder="选择创建时间"
          />
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

  // 可拖拽的项目组件
  const DraggableProject = ({ project }: { project: Project }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: project.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? 'opacity-50' : ''} bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
          highlightedProjectId === project.id
            ? 'ring-4 ring-blue-400 ring-opacity-75'
            : ''
        }`}
        id={`project-${project.id}`}
      >
        {/* 项目信息表格 */}
        <div className="p-2 bg-gray-50 border-b">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-300">
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
                  <th className="text-left py-2 px-3">总盈亏率</th>
                  <th className="text-left py-2 px-3">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
                        title="拖拽排序"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M3 12h18M3 18h18"/>
                        </svg>
                      </div>
                      <InlineEditText
                        value={project.项目名称}
                        onChange={(value) => updateProject(project.id, '项目名称', value)}
                        className="font-medium text-blue-600"
                      />
                    </div>
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
                        value={getProjectFieldValue(project.id, '当前价', project.当前价 || 0)}
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
                  <td className={`py-2 px-3 ${getProfitColor(project.总盈亏率)}`}>
                    {formatValueWithHideMode(project.总盈亏率, '%', '总盈亏率')}
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
        <div className="p-2">
          {transactions[project.id] && transactions[project.id].length > 0 ? (
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleTransactionDragEnd(event, project.id)}
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
    );
  };

  // 左侧导航中的可拖拽项目条目
  const DraggableSidebarItem = ({ project }: { project: Project }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: project.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties;

    const scrollToProject = () => {
      const el = document.getElementById(`project-${project.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 设置高亮效果
        setHighlightedProjectId(project.id);

        // 1秒后清除高亮效果
        setTimeout(() => {
          setHighlightedProjectId(null);
        }, 1000);
      }
    };

    // 获取盈亏率颜色
    const getProfitColor = (value: number) => {
      if (value > 0) return 'text-red-600';
      if (value < 0) return 'text-green-600';
      return 'text-gray-600';
    };

    // 获取状态点颜色
    const getStatusColor = (status: string) => {
      return status === '进行' ? 'bg-green-500' : 'bg-blue-500';
    };

    // 格式化百分比数值（去掉%，根据大小调整小数位）
    const formatPercentage = (value: number) => {
      const absValue = Math.abs(value);
      if (absValue >= 10) {
        return value.toFixed(0);
      } else {
        return value.toFixed(1);
      }
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center px-3 py-2 rounded cursor-pointer select-none ${isDragging ? 'opacity-50' : 'hover:bg-gray-100'}`}
        onClick={scrollToProject}
        title={`${project.项目名称} - 项目盈亏率: ${project.项目盈亏率?.toFixed(1)}%, 总盈亏率: ${project.总盈亏率?.toFixed(1)}%`}
      >
        {/* 项目名称 - 占据剩余空间 */}
        <span className="truncate text-sm flex-1 pr-2">{project.项目名称}</span>

        {/* 右侧信息区域 - 固定宽度对齐 */}
        <div className="flex items-center gap-1 text-xs w-16 justify-end">
          <span className={`${getProfitColor(project.项目盈亏率 || 0)} w-6 text-right`}>
            {formatPercentage(project.项目盈亏率 || 0)}
          </span>
          <span className={`${getProfitColor(project.总盈亏率 || 0)} w-6 text-right`}>
            {formatPercentage(project.总盈亏率 || 0)}
          </span>
          <div
            className={`w-2 h-2 rounded-full ${getStatusColor(project.状态)} ml-1`}
            title={project.状态}
          ></div>
        </div>

        {/* 拖拽按钮 */}
        <button
          {...attributes}
          {...listeners}
          className="ml-2 text-gray-400 hover:text-gray-600 p-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
          title="拖拽排序"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>
      </div>
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
    <div className="mx-auto p-6 max-w-[1700px]">
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <PageErrorLogViewer pageId="projects" />
          </div>
          <button
            onClick={queryStockPrices}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="查询最新股价"
          >
            查询
          </button>
          <button
            onClick={submitAllChanges}
            className={`px-4 py-2 rounded transition-colors ${
              hasLocalChanges
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!hasLocalChanges}
            title={hasLocalChanges ? '提交所有修改到数据库' : '没有待提交的修改'}
          >
            提交 {hasLocalChanges && '●'}
          </button>
          <button
            onClick={toggleHideValues}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            {hideValues ? '显示' : '隐藏'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧导航栏 */}
        <div className="w-60 shrink-0">
          <div className="sticky top-4 bg-white rounded-lg border shadow-sm max-h-[80vh] overflow-auto p-2">
            <div className="px-2 py-2 text-xs text-gray-500">项目导航</div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleProjectDragEnd}
            >
              <SortableContext
                items={projects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {projects.map(project => (
                    <DraggableSidebarItem key={`nav-${project.id}`} project={project} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* 右侧项目内容 */}
        <div className="flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleProjectDragEnd}
          >
            <SortableContext
              items={projects.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-8">
                {projects.map((project) => (
                  <DraggableProject
                    key={project.id}
                    project={project}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
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