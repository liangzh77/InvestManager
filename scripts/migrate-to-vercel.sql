-- 导出SQLite数据到Vercel Postgres的SQL脚本
-- 这个脚本需要手动执行，用于将本地SQLite数据迁移到Vercel Postgres

-- 1. 创建overview表并插入数据
-- 从SQLite导出: sqlite3 data/investment.db ".mode insert overview" ".output overview_data.sql" "SELECT * FROM overview;"
-- 然后手动转换为PostgreSQL INSERT语句

-- 示例overview数据（需要根据实际数据调整）
INSERT INTO overview (id, 总金额, 成本金额, 持仓金额, 盈亏金额, 盈亏率, 仓位, 更新时间) VALUES
(1, 100000.00, 0.00, 0.00, 0.00, 0.00, 0.00, CURRENT_TIMESTAMP);

-- 2. 创建projects表并插入数据
-- 从SQLite导出: sqlite3 data/investment.db ".mode insert projects" ".output projects_data.sql" "SELECT * FROM projects;"

-- 示例projects数据（需要根据实际数据调整）
-- INSERT INTO projects (项目名称, 项目代号, 交易类型, 成本价, 当前价, 股数, 仓位, 成本金额, 当前金额, 盈亏金额, 项目盈亏率, 总盈亏率, 状态, 排序顺序, 创建时间, 完成时间) VALUES
-- ('泡泡玛特', '9992', '做多', 0, 271.4, 0, 0, 0, 0, 0, 0, 0, '进行', 0, CURRENT_TIMESTAMP, NULL);

-- 3. 创建transactions表并插入数据
-- 从SQLite导出: sqlite3 data/investment.db ".mode insert transactions" ".output transactions_data.sql" "SELECT * FROM transactions;"

-- 示例transactions数据（需要根据实际数据调整）
-- INSERT INTO transactions (项目ID, 项目名称, 状态, 交易名称, 交易类型, 警告方向, 距离, 交易价, 股数, 仓位, 交易金额, 排序顺序, 创建时间, 交易时间) VALUES
-- (1, '泡泡玛特', '计划', '第一手', '做多', '向上', 8.33, 1300, 80, 10.4, 104000, 0, CURRENT_TIMESTAMP, NULL);

-- 注意事项：
-- 1. PostgreSQL使用SERIAL类型作为自增主键，而不是INTEGER PRIMARY KEY AUTOINCREMENT
-- 2. DATETIME类型在PostgreSQL中是TIMESTAMP
-- 3. 外键引用需要明确指定REFERENCES table(column)
-- 4. CHECK约束语法相同
-- 5. 需要手动转换SQLite的".mode insert"输出为PostgreSQL兼容的INSERT语句