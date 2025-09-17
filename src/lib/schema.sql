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
  状态 TEXT CHECK(状态 IN ('进行', '完成')),
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
  股数 INTEGER,
  仓位 REAL,
  交易金额 REAL,
  创建时间 DATETIME DEFAULT CURRENT_TIMESTAMP,
  交易时间 DATETIME,
  FOREIGN KEY (项目ID) REFERENCES projects(id)
);

-- 总览表
CREATE TABLE IF NOT EXISTS overview (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  总金额 REAL,
  成本金额 REAL,
  持仓金额 REAL,
  盈亏金额 REAL,
  盈亏率 REAL,
  仓位 REAL,
  更新时间 DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 统计表
CREATE TABLE IF NOT EXISTS statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  项目ID INTEGER,
  盈亏金额 REAL,
  盈亏率 REAL,
  更新时间 DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (项目ID) REFERENCES projects(id)
);