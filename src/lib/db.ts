import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'src', 'data', 'investment.db');

    // 确保目录存在
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // 删除现有表并重新创建（仅用于开发阶段）
  try {
    database.exec('DROP TABLE IF EXISTS transactions');
    database.exec('DROP TABLE IF EXISTS projects');
    database.exec('DROP TABLE IF EXISTS fund_nav_records');
    database.exec('DROP TABLE IF EXISTS fund_transactions');
    database.exec('DROP TABLE IF EXISTS funds');
    database.exec('DROP TABLE IF EXISTS statistics');
    database.exec('DROP TABLE IF EXISTS overview');
    console.log('所有表已删除，准备重新创建');
  } catch (error) {
    console.log('清理表时出现错误:', error);
  }

  // 创建项目表
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      项目名称 TEXT NOT NULL,
      项目代号 TEXT,
      交易类型 TEXT CHECK(交易类型 IS NULL OR 交易类型 IN ('做多', '做空')),
      成本价 REAL,
      当前价 REAL,
      股数 INTEGER,
      仓位 REAL,
      成本金额 REAL,
      当前金额 REAL,
      盈亏金额 REAL,
      项目盈亏率 REAL,
      自主盈亏率 REAL,
      创建时间 DATETIME DEFAULT CURRENT_TIMESTAMP,
      完成时间 DATETIME
    )
  `);

  // 创建交易表
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      项目ID INTEGER,
      项目名称 TEXT,
      状态 TEXT CHECK(状态 IN ('计划', '完成')),
      交易名称 TEXT,
      交易类型 TEXT CHECK(交易类型 IN ('做多', '做空', '多头平仓', '空头平仓')),
      警告方向 TEXT CHECK(警告方向 IS NULL OR 警告方向 = '' OR 警告方向 IN ('向上', '向下')),
      距离 REAL,
      交易价 REAL,
      止盈价 REAL,
      止损价 REAL,
      股数 INTEGER,
      仓位 REAL,
      交易金额 REAL,
      最大亏损额 REAL,
      最大亏损率 REAL,
      最大盈利额 REAL,
      最大盈利率 REAL,
      创建时间 DATETIME DEFAULT CURRENT_TIMESTAMP,
      交易时间 DATETIME,
      FOREIGN KEY (项目ID) REFERENCES projects(id)
    )
  `);

  // 创建基金表
  database.exec(`
    CREATE TABLE IF NOT EXISTS funds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      基金名称 TEXT NOT NULL,
      成本金额 REAL,
      当前金额 REAL
    )
  `);

  // 创建基金净值记录表
  database.exec(`
    CREATE TABLE IF NOT EXISTS fund_nav_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      基金ID INTEGER,
      时间 DATETIME,
      累计净值 REAL,
      FOREIGN KEY (基金ID) REFERENCES funds(id)
    )
  `);

  // 创建基金交易记录表
  database.exec(`
    CREATE TABLE IF NOT EXISTS fund_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      基金ID INTEGER,
      交易类型 TEXT,
      交易净值 REAL,
      交易金额 REAL,
      交易时间 DATETIME,
      FOREIGN KEY (基金ID) REFERENCES funds(id)
    )
  `);

  // 创建统计表
  database.exec(`
    CREATE TABLE IF NOT EXISTS statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      年月 TEXT,
      类型 TEXT,
      自主盈亏金额 REAL,
      自主盈亏率 REAL,
      基金盈亏金额 REAL,
      基金盈亏率 REAL,
      总盈亏金额 REAL,
      总盈亏率 REAL
    )
  `);

  // 创建总览表
  database.exec(`
    CREATE TABLE IF NOT EXISTS overview (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      自主总金额 REAL,
      自主成本金额 REAL,
      自主持仓金额 REAL,
      自主盈亏金额 REAL,
      自主盈亏率 REAL,
      自主仓位 REAL,
      基金总金额 REAL,
      基金盈亏金额 REAL,
      基金盈亏率 REAL,
      总投资金额 REAL,
      总盈亏金额 REAL,
      总盈亏率 REAL,
      更新时间 DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}