import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    // 确保data目录存在
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'investment.db');
    db = new Database(dbPath);

    // 初始化数据库
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // 读取schema文件
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // 执行schema
  database.exec(schema);

  console.log('Database initialized successfully');
}

// 计算逻辑函数
export function calculateProjectStats(projectId: number, db: Database.Database) {
  // 获取项目的所有已完成交易
  const transactions = db.prepare(`
    SELECT * FROM transactions
    WHERE 项目ID = ? AND 状态 = '完成'
    ORDER BY 交易时间
  `).all(projectId);

  let 股数 = 0;
  let 成本金额 = 0;

  for (const transaction of transactions as any[]) {
    const { 交易类型, 股数: 交易股数, 交易金额 } = transaction;

    if (交易类型 === '做多' || 交易类型 === '空头平仓') {
      股数 += 交易股数 || 0;
      成本金额 += 交易金额 || 0;
    } else if (交易类型 === '做空' || 交易类型 === '多头平仓') {
      股数 -= 交易股数 || 0;
      成本金额 -= 交易金额 || 0;
    }
  }

  // 获取项目当前价和总金额（用于计算仓位）
  const project = db.prepare('SELECT 当前价 FROM projects WHERE id = ?').get(projectId) as any;
  const 当前价 = project?.当前价 || 0;

  // 从overview表获取总金额用于计算仓位
  const overview = db.prepare('SELECT 总金额 FROM overview WHERE id = 1').get() as any;
  const 总金额 = overview?.总金额 || 0;

  const 成本价 = 股数 > 0 ? 成本金额 / 股数 : 0;
  const 当前金额 = 股数 * 当前价;
  const 盈亏金额 = 当前金额 - 成本金额;
  const 项目盈亏率 = 成本金额 > 0 ? (盈亏金额 / 成本金额) * 100 : 0;

  // 计算仓位（当前金额占总投资金额的百分比）
  const 仓位 = 总金额 > 0 ? (当前金额 / 总金额) * 100 : 0;

  // 计算自主盈亏率（盈亏金额占总投资金额的百分比）
  const 自主盈亏率 = 总金额 > 0 ? (盈亏金额 / 总金额) * 100 : 0;

  return {
    成本价,
    股数,
    仓位,
    成本金额,
    当前金额,
    盈亏金额,
    项目盈亏率,
    自主盈亏率
  };
}

// 计算所有项目的总体统计
export function calculateOverallStats(db: Database.Database) {
  const projects = db.prepare('SELECT * FROM projects').all() as any[];

  let 总成本金额 = 0;
  let 总当前金额 = 0;
  let 总盈亏金额 = 0;

  for (const project of projects) {
    总成本金额 += project.成本金额 || 0;
    总当前金额 += project.当前金额 || 0;
    总盈亏金额 += project.盈亏金额 || 0;
  }

  const 总盈亏率 = 总成本金额 > 0 ? (总盈亏金额 / 总成本金额) * 100 : 0;
  const 总仓位 = 总当前金额; // 简化处理，实际应该基于自主总金额

  return {
    总金额: 总当前金额,
    成本金额: 总成本金额,
    持仓金额: 总当前金额,
    盈亏金额: 总盈亏金额,
    盈亏率: 总盈亏率,
    仓位: 总仓位
  };
}

// 更新所有项目的计算字段
export function updateAllProjectStats(db: Database.Database) {
  const projects = db.prepare('SELECT id FROM projects').all() as any[];

  for (const project of projects) {
    const stats = calculateProjectStats(project.id, db);

    db.prepare(`
      UPDATE projects SET
        成本价 = ?, 股数 = ?, 仓位 = ?, 成本金额 = ?,
        当前金额 = ?, 盈亏金额 = ?, 项目盈亏率 = ?, 自主盈亏率 = ?
      WHERE id = ?
    `).run(
      stats.成本价, stats.股数, stats.仓位, stats.成本金额,
      stats.当前金额, stats.盈亏金额, stats.项目盈亏率, stats.自主盈亏率,
      project.id
    );
  }
}

export function calculateTransactionDistance(transaction: any, currentPrice: number) {
  const { 警告方向, 交易价 } = transaction;

  if (!警告方向 || !交易价 || !currentPrice) return 0;

  if (警告方向 === '向下') {
    return -((交易价 - currentPrice) / currentPrice) * 100;
  } else if (警告方向 === '向上') {
    return ((交易价 - currentPrice) / currentPrice) * 100;
  }

  return 0;
}