import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    // 在 Vercel 环境中使用内存数据库
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      console.log('Creating in-memory database for Vercel environment');
      db = new Database(':memory:');

      // 初始化内存数据库
      initializeDatabase(db);

      // 插入一些示例数据
      initializeSampleData(db);
    } else {
      // 本地开发环境使用文件数据库
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const dbPath = path.join(dataDir, 'investment.db');
      db = new Database(dbPath);
      initializeDatabase(db);
    }
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // 创建表结构
  database.exec(`
    -- 项目表
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
      创建时间 DATETIME DEFAULT CURRENT_TIMESTAMP,
      完成时间 DATETIME
    );

    -- 交易表
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
      创建时间 DATETIME DEFAULT CURRENT_TIMESTAMP,
      交易时间 DATETIME,
      FOREIGN KEY (项目ID) REFERENCES projects(id)
    );

    -- 总览表
    CREATE TABLE IF NOT EXISTS overview (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      总金额 REAL DEFAULT 100000,
      成本金额 REAL DEFAULT 0,
      持仓金额 REAL DEFAULT 0,
      盈亏金额 REAL DEFAULT 0,
      盈亏率 REAL DEFAULT 0,
      仓位 REAL DEFAULT 0,
      更新时间 DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 插入默认的总览数据
  const existingOverview = database.prepare('SELECT id FROM overview WHERE id = 1').get();
  if (!existingOverview) {
    database.prepare(`
      INSERT INTO overview (id, 总金额, 成本金额, 持仓金额, 盈亏金额, 盈亏率, 仓位)
      VALUES (1, 100000, 0, 0, 0, 0, 0)
    `).run();
  }

  console.log('Database initialized successfully');
}

function initializeSampleData(database: Database.Database) {
  // 检查是否已有数据
  const existingProjects = database.prepare('SELECT COUNT(*) as count FROM projects').get() as any;

  if (existingProjects.count === 0) {
    console.log('Inserting sample data for demo purposes');

    // 插入示例项目
    database.prepare(`
      INSERT INTO projects (
        项目名称, 项目代号, 交易类型, 当前价, 成本价, 股数, 成本金额, 当前金额, 盈亏金额, 项目盈亏率, 总盈亏率, 仓位, 状态
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('泡泡玛特', '9992', '做多', 1200, 1100, 100, 110000, 120000, 10000, 9.09, 10.0, 12.0, '进行');

    database.prepare(`
      INSERT INTO projects (
        项目名称, 项目代号, 交易类型, 当前价, 成本价, 股数, 成本金额, 当前金额, 盈亏金额, 项目盈亏率, 总盈亏率, 仓位, 状态
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('安克创新', '300866', '做多', 800, 850, 50, 42500, 40000, -2500, -5.88, -2.5, 4.0, '进行');

    // 插入示例交易
    database.prepare(`
      INSERT INTO transactions (
        项目ID, 项目名称, 状态, 交易名称, 交易类型, 警告方向, 距离, 交易价, 股数, 仓位, 交易金额
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(1, '泡泡玛特', '计划', '第一手', '做多', '向上', 8.33, 1300, 80, 10.4, 104000);

    database.prepare(`
      INSERT INTO transactions (
        项目ID, 项目名称, 状态, 交易名称, 交易类型, 警告方向, 距离, 交易价, 股数, 仓位, 交易金额
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(2, '安克创新', '计划', '止损', '多头平仓', '向下', -6.25, 750, 50, 3.75, 37500);

    console.log('Sample data inserted successfully');
  }
}

// 导出原有的计算函数（为了兼容性）
export function calculateProjectStats(projectId: number, db: Database.Database) {
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

  const project = db.prepare('SELECT 当前价 FROM projects WHERE id = ?').get(projectId) as any;
  const 当前价 = project?.当前价 || 0;

  const overview = db.prepare('SELECT 总金额 FROM overview WHERE id = 1').get() as any;
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

  return {
    总金额: 总当前金额,
    成本金额: 总成本金额,
    持仓金额: 总当前金额,
    盈亏金额: 总盈亏金额,
    盈亏率: 总盈亏率,
    仓位: 总当前金额
  };
}

export function updateAllProjectStats(db: Database.Database) {
  const projects = db.prepare('SELECT id FROM projects').all() as any[];

  for (const project of projects) {
    const stats = calculateProjectStats(project.id, db);

    db.prepare(`
      UPDATE projects SET
        成本价 = ?, 股数 = ?, 仓位 = ?, 成本金额 = ?,
        当前金额 = ?, 盈亏金额 = ?, 项目盈亏率 = ?, 总盈亏率 = ?
      WHERE id = ?
    `).run(
      stats.成本价, stats.股数, stats.仓位, stats.成本金额,
      stats.当前金额, stats.盈亏金额, stats.项目盈亏率, stats.总盈亏率,
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