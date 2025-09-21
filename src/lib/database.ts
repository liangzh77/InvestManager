// 数据库适配器 - 根据环境自动选择SQLite或Vercel Postgres

import { getDatabase as getSQLiteDatabase, calculateProjectStats as calculateProjectStatsSQLite, calculateTransactionDistance as calculateTransactionDistanceSQLite } from './db';
import { getVercelDatabase, calculateProjectStatsVercel, calculateTransactionDistanceVercel, initializeVercelDatabase } from './db-vercel';

// 判断是否在Vercel环境
const isVercelEnvironment = process.env.VERCEL || process.env.NODE_ENV === 'production';

// 获取适当的数据库实例
export function getDatabase() {
  if (isVercelEnvironment) {
    // Vercel环境使用Postgres
    return getVercelDatabase();
  } else {
    // 本地开发使用SQLite
    return getSQLiteDatabase();
  }
}

// 计算项目统计
export async function calculateProjectStats(projectId: number, db?: any) {
  if (isVercelEnvironment) {
    return await calculateProjectStatsVercel(projectId);
  } else {
    return calculateProjectStatsSQLite(projectId, db || getSQLiteDatabase());
  }
}

// 计算交易距离
export function calculateTransactionDistance(transaction: any, currentPrice: number) {
  if (isVercelEnvironment) {
    return calculateTransactionDistanceVercel(transaction, currentPrice);
  } else {
    return calculateTransactionDistanceSQLite(transaction, currentPrice);
  }
}

// 数据库初始化
export async function initializeDatabase() {
  if (isVercelEnvironment) {
    await initializeVercelDatabase();
  } else {
    // SQLite在getDatabase()时自动初始化
    getSQLiteDatabase();
  }
}

// 导出环境标识
export { isVercelEnvironment };