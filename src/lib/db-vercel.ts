import { sql } from '@vercel/postgres';

// Vercel Postgres 数据库操作类
export class VercelDatabase {
  // 模拟 SQLite 的 prepare 方法接口
  prepare(sqlQuery: string) {
    return {
      get: async (...params: any[]) => {
        const result = await sql.query(sqlQuery, params);
        return result.rows[0] || null;
      },
      all: async (...params: any[]) => {
        const result = await sql.query(sqlQuery, params);
        return result.rows;
      },
      run: async (...params: any[]) => {
        const result = await sql.query(sqlQuery, params);
        return {
          lastInsertRowid: result.rows[0]?.id || 0,
          changes: result.rowCount || 0
        };
      }
    };
  }

  // 执行 SQL 语句
  async exec(sqlQuery: string) {
    try {
      await sql.query(sqlQuery);
    } catch (error) {
      console.error('Database exec error:', error);
      throw error;
    }
  }

  // 事务支持（简化版）
  transaction(fn: () => Promise<void>) {
    return async () => {
      try {
        await fn();
      } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
      }
    };
  }
}

// 数据库初始化
export async function initializeVercelDatabase() {
  try {
    // 创建 overview 表
    await sql`
      CREATE TABLE IF NOT EXISTS overview (
        id SERIAL PRIMARY KEY,
        总金额 DECIMAL(15,2) DEFAULT 0,
        成本金额 DECIMAL(15,2) DEFAULT 0,
        持仓金额 DECIMAL(15,2) DEFAULT 0,
        盈亏金额 DECIMAL(15,2) DEFAULT 0,
        盈亏率 DECIMAL(8,2) DEFAULT 0,
        仓位 DECIMAL(8,2) DEFAULT 0,
        更新时间 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建 projects 表
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        项目名称 VARCHAR(100) NOT NULL,
        项目代号 VARCHAR(50),
        交易类型 VARCHAR(10) CHECK(交易类型 IN ('做多', '做空')),
        成本价 DECIMAL(15,2) DEFAULT 0,
        当前价 DECIMAL(15,2) DEFAULT 0,
        股数 INTEGER DEFAULT 0,
        仓位 DECIMAL(8,2) DEFAULT 0,
        成本金额 DECIMAL(15,2) DEFAULT 0,
        当前金额 DECIMAL(15,2) DEFAULT 0,
        盈亏金额 DECIMAL(15,2) DEFAULT 0,
        项目盈亏率 DECIMAL(8,2) DEFAULT 0,
        总盈亏率 DECIMAL(8,2) DEFAULT 0,
        状态 VARCHAR(10) CHECK(状态 IN ('进行', '完成')),
        排序顺序 INTEGER DEFAULT 0,
        创建时间 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        完成时间 TIMESTAMP
      )
    `;

    // 创建 transactions 表
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        项目ID INTEGER REFERENCES projects(id),
        项目名称 VARCHAR(100),
        状态 VARCHAR(10) CHECK(状态 IN ('计划', '完成')),
        交易名称 VARCHAR(100),
        交易类型 VARCHAR(20) CHECK(交易类型 IN ('做多', '做空', '多头平仓', '空头平仓')),
        警告方向 VARCHAR(10) CHECK(警告方向 IN ('向上', '向下')),
        距离 DECIMAL(8,2) DEFAULT 0,
        交易价 DECIMAL(15,2) DEFAULT 0,
        股数 INTEGER DEFAULT 0,
        仓位 DECIMAL(8,2) DEFAULT 0,
        交易金额 DECIMAL(15,2) DEFAULT 0,
        排序顺序 INTEGER DEFAULT 0,
        创建时间 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        交易时间 TIMESTAMP
      )
    `;

    // 初始化 overview 数据（如果不存在）
    const existingOverview = await sql`SELECT id FROM overview WHERE id = 1`;
    if (existingOverview.rows.length === 0) {
      await sql`
        INSERT INTO overview (id, 总金额, 成本金额, 持仓金额, 盈亏金额, 盈亏率, 仓位)
        VALUES (1, 100000, 0, 0, 0, 0, 0)
      `;
    }

    console.log('Vercel database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Vercel database:', error);
    throw error;
  }
}

// 获取数据库实例
let dbInstance: VercelDatabase | null = null;

export function getVercelDatabase() {
  if (!dbInstance) {
    dbInstance = new VercelDatabase();
    console.log('Vercel database instance created');
  }
  return dbInstance;
}

// 数据迁移：从SQLite导入数据到Vercel Postgres
export async function migrateFromSQLite() {
  // 这个函数将在需要时手动执行，用于从本地SQLite导入数据
  console.log('Migration from SQLite to Vercel Postgres should be done manually');
}

// 计算函数（与SQLite版本保持一致）
export async function calculateProjectStatsVercel(projectId: number) {
  const transactions = await sql`
    SELECT * FROM transactions
    WHERE 项目ID = ${projectId} AND 状态 = '完成'
    ORDER BY 交易时间
  `;

  let 股数 = 0;
  let 成本金额 = 0;

  for (const transaction of transactions.rows) {
    const { 交易类型, 股数: 交易股数, 交易金额 } = transaction;

    if (交易类型 === '做多' || 交易类型 === '空头平仓') {
      股数 += 交易股数 || 0;
      成本金额 += 交易金额 || 0;
    } else if (交易类型 === '做空' || 交易类型 === '多头平仓') {
      股数 -= 交易股数 || 0;
      成本金额 -= 交易金额 || 0;
    }
  }

  const project = await sql`SELECT 当前价 FROM projects WHERE id = ${projectId}`;
  const 当前价 = project.rows[0]?.当前价 || 0;

  const overview = await sql`SELECT 总金额 FROM overview WHERE id = 1`;
  const 总金额 = overview.rows[0]?.总金额 || 0;

  const 成本价 = 股数 > 0 ? 成本金额 / 股数 : 0;
  const 当前金额 = 股数 * 当前价;
  const 盈亏金额 = 当前金额 - 成本金额;
  const 项目盈亏率 = 成本金额 > 0 ? (盈亏金额 / 成本金额) * 100 : 0;
  const 仓位 = 总金额 > 0 ? (当前金额 / 总金额) * 100 : 0;
  const 总盈亏率 = 总金额 > 0 ? (盈亏金额 / 总金额) * 100 : 0;

  return {
    成本价,
    股数,
    仓位,
    成本金额,
    当前金额,
    盈亏金额,
    项目盈亏率,
    总盈亏率
  };
}

export function calculateTransactionDistanceVercel(transaction: any, currentPrice: number) {
  const { 警告方向, 交易价 } = transaction;

  if (!警告方向 || !交易价 || !currentPrice) return 0;

  if (警告方向 === '向下') {
    return -((交易价 - currentPrice) / currentPrice) * 100;
  } else if (警告方向 === '向上') {
    return ((交易价 - currentPrice) / currentPrice) * 100;
  }

  return 0;
}