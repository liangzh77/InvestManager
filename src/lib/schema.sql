-- 投资管理系统数据库Schema
-- 根据完善开发计划.md设计

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  项目名称 TEXT NOT NULL,
  项目代号 TEXT,
  交易类型 TEXT CHECK(交易类型 IN ('做多', '做空')),
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
);

-- 交易表
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  项目ID INTEGER,
  项目名称 TEXT,
  状态 TEXT CHECK(状态 IN ('计划', '完成')),
  交易名称 TEXT,
  交易类型 TEXT CHECK(交易类型 IN ('做多', '做空', '多头平仓', '空头平仓')),
  警告方向 TEXT CHECK(警告方向 IN ('向上', '向下')),
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
);

-- 基金表
CREATE TABLE IF NOT EXISTS funds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  基金名称 TEXT NOT NULL,
  成本金额 REAL,
  当前金额 REAL
);

-- 基金净值记录
CREATE TABLE IF NOT EXISTS fund_nav_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  基金ID INTEGER,
  时间 DATETIME,
  累计净值 REAL,
  FOREIGN KEY (基金ID) REFERENCES funds(id)
);

-- 基金交易记录
CREATE TABLE IF NOT EXISTS fund_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  基金ID INTEGER,
  交易类型 TEXT,
  交易净值 REAL,
  交易金额 REAL,
  交易时间 DATETIME,
  FOREIGN KEY (基金ID) REFERENCES funds(id)
);

-- 统计表
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
);

-- 总览表
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
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_projects_创建时间 ON projects(创建时间);
CREATE INDEX IF NOT EXISTS idx_transactions_项目ID ON transactions(项目ID);
CREATE INDEX IF NOT EXISTS idx_transactions_状态 ON transactions(状态);
CREATE INDEX IF NOT EXISTS idx_fund_nav_records_基金ID ON fund_nav_records(基金ID);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_基金ID ON fund_transactions(基金ID);
CREATE INDEX IF NOT EXISTS idx_statistics_年月 ON statistics(年月);
CREATE INDEX IF NOT EXISTS idx_overview_更新时间 ON overview(更新时间);

-- 数据计算逻辑说明
/*
项目 (projects) 系统计算字段：
- 成本价 = 成本金额 ÷ 股数 （股数 > 0 时）
- 股数 = ∑(交易股数) 按交易类型：做多、空头平仓(+), 做空、多头平仓(-)
- 仓位 = (当前金额 ÷ 自主总金额) × 100
- 成本金额 = ∑(交易金额) 按交易类型：做多、空头平仓(+), 做空、多头平仓(-)
- 当前金额 = 股数 × 当前价
- 盈亏金额 = 当前金额 - 成本金额
- 项目盈亏率 = (盈亏金额 ÷ 成本金额) × 100
- 自主盈亏率 = (盈亏金额 ÷ 自主总金额) × 100

交易 (transactions) 系统计算字段：
- 距离 = 根据警告方向计算与当前价的百分比差距
- 最大亏损额 = (止损价 - 交易价) × 股数
- 最大亏损率 = (最大亏损额 ÷ 自主总金额) × 100
- 最大盈利额 = (止盈价 - 交易价) × 股数
- 最大盈利率 = (最大盈利额 ÷ 自主总金额) × 100
*/