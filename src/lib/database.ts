// 数据库适配器 - 根据环境自动选择SQLite、Turso或Vercel Postgres

import { getDatabase as getSQLiteDatabase, calculateProjectStats as calculateProjectStatsSQLite, calculateTransactionDistance as calculateTransactionDistanceSQLite } from './db';
import { getVercelDatabase, calculateProjectStatsVercel, calculateTransactionDistanceVercel, initializeVercelDatabase } from './db-vercel';
import { getTursoDatabase, calculateProjectStatsTurso, calculateTransactionDistanceTurso, initializeTursoDatabase } from './db-turso';

// 判断使用哪种数据库
const isTursoEnvironment = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN &&
  process.env.TURSO_DATABASE_URL.trim() !== '' && process.env.TURSO_AUTH_TOKEN.trim() !== '';
const isVercelEnvironment = process.env.VERCEL && (process.env.POSTGRES_URL || process.env.DATABASE_URL);

// 获取适当的数据库实例
export function getDatabase() {
  if (isTursoEnvironment) {
    // 如果配置了Turso环境变量，优先使用Turso
    return getTursoDatabase();
  } else if (isVercelEnvironment) {
    // Vercel环境使用Postgres
    return getVercelDatabase();
  } else {
    // 本地开发使用SQLite
    return getSQLiteDatabase();
  }
}

// 计算项目统计
export async function calculateProjectStats(projectId: number, db?: any) {
  if (isTursoEnvironment) {
    return await calculateProjectStatsTurso(projectId, db || getTursoDatabase());
  } else if (isVercelEnvironment) {
    return await calculateProjectStatsVercel(projectId);
  } else {
    return calculateProjectStatsSQLite(projectId, db || getSQLiteDatabase());
  }
}

// 计算交易距离
export function calculateTransactionDistance(transaction: any, currentPrice: number) {
  if (isTursoEnvironment) {
    return calculateTransactionDistanceTurso(transaction, currentPrice);
  } else if (isVercelEnvironment) {
    return calculateTransactionDistanceVercel(transaction, currentPrice);
  } else {
    return calculateTransactionDistanceSQLite(transaction, currentPrice);
  }
}

// 数据库初始化
export async function initializeDatabase() {
  if (isTursoEnvironment) {
    await initializeTursoDatabase();
  } else if (isVercelEnvironment) {
    await initializeVercelDatabase();
  } else {
    // SQLite在getDatabase()时自动初始化
    getSQLiteDatabase();
  }
}

// 导出环境标识
export { isTursoEnvironment, isVercelEnvironment };