import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Project } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateProjectMetrics(project: Project): Partial<Project> {
  if (!project.成本价 || !project.当前价 || !project.股数 || !project.成本金额) {
    return {};
  }

  const 当前金额 = project.当前价 * project.股数;
  const 盈亏金额 = 当前金额 - project.成本金额;
  const 项目盈亏率 = project.成本金额 > 0 ? (盈亏金额 / project.成本金额) * 100 : 0;

  return {
    当前金额,
    盈亏金额,
    项目盈亏率
  };
}

export function calculateTransactionMetrics(
  交易价: number,
  止盈价?: number,
  止损价?: number,
  股数?: number,
  交易类型?: string,
  项目当前价?: number,
  警告方向?: string,
  自主总金额?: number
) {
  if (!股数 || !交易价) return {};

  // 计算交易金额
  const 交易金额 = 交易价 * 股数;

  // 计算距离（基于项目当前价和警告方向）
  let 距离 = 0;
  if (项目当前价 && 项目当前价 > 0) {
    if (警告方向 === '向下') {
      距离 = -((交易价 - 项目当前价) / 项目当前价) * 100;
    } else if (警告方向 === '向上') {
      距离 = ((交易价 - 项目当前价) / 项目当前价) * 100;
    }
  }

  // 计算仓位（交易金额相对于自主总金额的比例）
  const 仓位 = 自主总金额 && 自主总金额 > 0 ? (交易金额 / 自主总金额) * 100 : 0;

  // 计算最大盈利额和最大亏损额
  let 最大盈利额 = 0;
  let 最大亏损额 = 0;

  if (交易类型 === '做多') {
    if (止盈价) {
      最大盈利额 = (止盈价 - 交易价) * 股数;
    }
    if (止损价) {
      最大亏损额 = (交易价 - 止损价) * 股数;
    }
  } else if (交易类型 === '做空') {
    if (止盈价) {
      最大盈利额 = (交易价 - 止盈价) * 股数;
    }
    if (止损价) {
      最大亏损额 = (止损价 - 交易价) * 股数;
    }
  } else if (交易类型 === '多头平仓') {
    // 平仓交易的盈亏计算（相对于建仓价格）
    if (止盈价) {
      最大盈利额 = (交易价 - 止盈价) * 股数;
    }
    if (止损价) {
      最大亏损额 = (止损价 - 交易价) * 股数;
    }
  } else if (交易类型 === '空头平仓') {
    if (止盈价) {
      最大盈利额 = (止盈价 - 交易价) * 股数;
    }
    if (止损价) {
      最大亏损额 = (交易价 - 止损价) * 股数;
    }
  }

  // 计算相对于自主总金额的盈亏率
  const 最大盈利率 = 自主总金额 && 自主总金额 > 0 ? (最大盈利额 / 自主总金额) * 100 : 0;
  const 最大亏损率 = 自主总金额 && 自主总金额 > 0 ? (最大亏损额 / 自主总金额) * 100 : 0;

  return {
    距离,
    仓位,
    交易金额,
    最大盈利额,
    最大亏损额,
    最大盈利率,
    最大亏损率
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount);
}

export function formatPercentage(rate: number): string {
  return `${rate.toFixed(2)}%`;
}
