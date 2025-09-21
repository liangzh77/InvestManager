import { createClient } from '@libsql/client';

// Turso数据库配置
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// Turso数据库操作类 - 兼容SQLite接口
export class TursoDatabase {
  // 模拟 SQLite 的 prepare 方法接口
  prepare(sql: string) {
    return {
      get: async (...params: any[]) => {
        try {
          const result = await client.execute({
            sql,
            args: params
          });
          return result.rows[0] ? this.convertRow(result.rows[0]) : null;
        } catch (error) {
          console.error('Turso query error:', error);
          throw error;
        }
      },
      all: async (...params: any[]) => {
        try {
          const result = await client.execute({
            sql,
            args: params
          });
          return result.rows.map(row => this.convertRow(row));
        } catch (error) {
          console.error('Turso query error:', error);
          throw error;
        }
      },
      run: async (...params: any[]) => {
        try {
          const result = await client.execute({
            sql,
            args: params
          });
          return {
            lastInsertRowid: Number(result.lastInsertRowid) || 0,
            changes: result.rowsAffected || 0
          };
        } catch (error) {
          console.error('Turso query error:', error);
          throw error;
        }
      }
    };
  }

  // 将Turso行数据转换为SQLite兼容格式
  private convertRow(row: any): any {
    const converted: any = {};
    for (const [key, value] of Object.entries(row)) {
      converted[key] = value;
    }
    return converted;
  }

  // 执行SQL语句
  async exec(sql: string) {
    try {
      await client.execute(sql);
    } catch (error) {
      console.error('Turso exec error:', error);
      throw error;
    }
  }

  // 事务支持
  transaction(fn: () => Promise<void>) {
    return async () => {
      try {
        await client.batch([]);
        await fn();
      } catch (error) {
        console.error('Turso transaction failed:', error);
        throw error;
      }
    };
  }
}

// 初始化Turso数据库（创建表结构）
export async function initializeTursoDatabase() {
  try {
    console.log('Initializing Turso database...');

    // 创建overview表
    await client.execute(`
      CREATE TABLE IF NOT EXISTS overview (
        id INTEGER PRIMARY KEY,
        总金额 REAL DEFAULT 0,
        成本金额 REAL DEFAULT 0,
        持仓金额 REAL DEFAULT 0,
        盈亏金额 REAL DEFAULT 0,
        盈亏率 REAL DEFAULT 0,
        仓位 REAL DEFAULT 0,
        更新时间 TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建projects表
    await client.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        项目名称 TEXT NOT NULL,
        项目代号 TEXT,
        交易类型 TEXT CHECK(交易类型 IN ('做多', '做空')),
        成本价 REAL DEFAULT 0,
        当前价 REAL DEFAULT 0,
        股数 INTEGER DEFAULT 0,
        仓位 REAL DEFAULT 0,
        成本金额 REAL DEFAULT 0,
        当前金额 REAL DEFAULT 0,
        盈亏金额 REAL DEFAULT 0,
        项目盈亏率 REAL DEFAULT 0,
        总盈亏率 REAL DEFAULT 0,
        状态 TEXT CHECK(状态 IN ('进行', '完成')) DEFAULT '进行',
        排序顺序 INTEGER DEFAULT 0,
        创建时间 TEXT DEFAULT CURRENT_TIMESTAMP,
        完成时间 TEXT
      )
    `);

    // 创建transactions表
    await client.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        项目ID INTEGER,
        项目名称 TEXT,
        状态 TEXT CHECK(状态 IN ('计划', '完成')) DEFAULT '计划',
        交易名称 TEXT,
        交易类型 TEXT CHECK(交易类型 IN ('做多', '做空', '多头平仓', '空头平仓')),
        警告方向 TEXT CHECK(警告方向 IN ('向上', '向下')),
        距离 REAL DEFAULT 0,
        交易价 REAL DEFAULT 0,
        股数 INTEGER DEFAULT 0,
        仓位 REAL DEFAULT 0,
        交易金额 REAL DEFAULT 0,
        排序顺序 INTEGER DEFAULT 0,
        创建时间 TEXT DEFAULT CURRENT_TIMESTAMP,
        交易时间 TEXT,
        FOREIGN KEY (项目ID) REFERENCES projects (id)
      )
    `);

    // 检查overview是否有初始数据
    const existingOverview = await client.execute('SELECT id FROM overview WHERE id = 1');
    if (existingOverview.rows.length === 0) {
      await client.execute(`
        INSERT INTO overview (id, 总金额, 成本金额, 持仓金额, 盈亏金额, 盈亏率, 仓位)
        VALUES (1, 100000, 0, 0, 0, 0, 0)
      `);
    }

    console.log('Turso database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Turso database:', error);
    throw error;
  }
}

// 获取Turso数据库实例
let dbInstance: TursoDatabase | null = null;

export function getTursoDatabase() {
  if (!dbInstance) {
    dbInstance = new TursoDatabase();
    console.log('Turso database instance created');
  }
  return dbInstance;
}

// 计算函数（与SQLite版本完全一致）
export async function calculateProjectStatsTurso(projectId: number, db: TursoDatabase) {
  const transactions = await db.prepare(`
    SELECT * FROM transactions
    WHERE 项目ID = ? AND 状态 = '完成'
    ORDER BY 交易时间
  `).all(projectId);

  let 股数 = 0;
  let 成本金额 = 0;

  for (const transaction of transactions) {
    const { 交易类型, 股数: 交易股数, 交易金额 } = transaction;

    if (交易类型 === '做多' || 交易类型 === '空头平仓') {
      股数 += 交易股数 || 0;
      成本金额 += 交易金额 || 0;
    } else if (交易类型 === '做空' || 交易类型 === '多头平仓') {
      股数 -= 交易股数 || 0;
      成本金额 -= 交易金额 || 0;
    }
  }

  const project = await db.prepare('SELECT 当前价 FROM projects WHERE id = ?').get(projectId);
  const 当前价 = project?.当前价 || 0;

  const overview = await db.prepare('SELECT 总金额 FROM overview WHERE id = 1').get();
  const 总金额 = overview?.总金额 || 0;

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

export function calculateTransactionDistanceTurso(transaction: any, currentPrice: number) {
  const { 警告方向, 交易价 } = transaction;

  if (!警告方向 || !交易价 || !currentPrice) return 0;

  if (警告方向 === '向下') {
    return -((交易价 - currentPrice) / currentPrice) * 100;
  } else if (警告方向 === '向上') {
    return ((交易价 - currentPrice) / currentPrice) * 100;
  }

  return 0;
}