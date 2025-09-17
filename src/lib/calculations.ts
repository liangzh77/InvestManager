// 计算距离
export function calculateDistance(
  交易价: number,
  项目当前价: number,
  警告方向: '向上' | '向下'
): number {
  if (项目当前价 === 0) return 0;

  const distancePercent = ((交易价 - 项目当前价) / 项目当前价) * 100;

  if (警告方向 === '向下') {
    return -distancePercent;
  }
  return distancePercent;
}

// 根据距离计算交易价
export function calculatePriceFromDistance(
  距离: number,
  项目当前价: number,
  警告方向: '向上' | '向下'
): number {
  const distanceDecimal = 距离 / 100;

  if (警告方向 === '向下') {
    return 项目当前价 * (1 - Math.abs(distanceDecimal));
  } else {
    return 项目当前价 * (1 + distanceDecimal);
  }
}

// 根据股数计算交易金额和仓位
export function calculateFromShares(
  股数: number,
  交易价: number,
  总金额: number
): { 交易金额: number; 仓位: number } {
  const 交易金额 = 股数 * 交易价;
  const 仓位 = 总金额 > 0 ? (交易金额 / 总金额) * 100 : 0;

  return { 交易金额, 仓位 };
}

// 根据仓位计算股数和交易金额
export function calculateFromPosition(
  仓位: number,
  总金额: number,
  交易价: number
): { 股数: number; 交易金额: number } {
  const 交易金额 = (仓位 / 100) * 总金额;
  const 股数 = 交易价 > 0 ? Math.floor(交易金额 / 交易价) : 0;

  return { 股数, 交易金额 };
}

// 根据交易金额计算股数和仓位
export function calculateFromAmount(
  交易金额: number,
  交易价: number,
  总金额: number
): { 股数: number; 仓位: number } {
  const 股数 = 交易价 > 0 ? Math.floor(交易金额 / 交易价) : 0;
  const 仓位 = 总金额 > 0 ? (交易金额 / 总金额) * 100 : 0;

  return { 股数, 仓位 };
}

// 项目计算逻辑
export interface ProjectCalculationResult {
  成本价: number;
  股数: number;
  仓位: number;
  成本金额: number;
  当前金额: number;
  盈亏金额: number;
  项目盈亏率: number;
  自主盈亏率: number;
}

export function calculateProjectMetrics(
  transactions: any[],
  当前价: number,
  自主总金额: number = 100000
): ProjectCalculationResult {
  let 总股数 = 0;
  let 总成本金额 = 0;

  // 计算总股数和总成本金额
  transactions.forEach(transaction => {
    if (transaction.状态 === '完成') {
      const { 交易类型, 股数, 交易金额 } = transaction;

      if (交易类型 === '做多' || 交易类型 === '空头平仓') {
        总股数 += 股数;
        总成本金额 += 交易金额;
      } else if (交易类型 === '做空' || 交易类型 === '多头平仓') {
        总股数 -= 股数;
        总成本金额 -= 交易金额;
      }
    }
  });

  const 成本价 = 总股数 > 0 ? 总成本金额 / 总股数 : 0;
  const 当前金额 = 总股数 * 当前价;
  const 盈亏金额 = 当前金额 - 总成本金额;
  const 项目盈亏率 = 总成本金额 > 0 ? (盈亏金额 / 总成本金额) * 100 : 0;
  const 仓位 = 自主总金额 > 0 ? (当前金额 / 自主总金额) * 100 : 0;
  const 自主盈亏率 = 自主总金额 > 0 ? (盈亏金额 / 自主总金额) * 100 : 0;

  return {
    成本价,
    股数: 总股数,
    仓位,
    成本金额: 总成本金额,
    当前金额,
    盈亏金额,
    项目盈亏率,
    自主盈亏率
  };
}