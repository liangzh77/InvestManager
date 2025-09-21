// 数据导出脚本 - 将SQLite数据导出为PostgreSQL兼容的SQL语句
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'investment.db');
const outputPath = path.join(process.cwd(), 'scripts', 'exported-data.sql');

try {
  const db = new Database(dbPath);

  let sql = `-- 导出的数据 (${new Date().toISOString()})\n\n`;

  // 导出overview数据
  const overview = db.prepare('SELECT * FROM overview').all();
  sql += `-- Overview数据\n`;
  sql += `DELETE FROM overview;\n`;
  for (const row of overview) {
    sql += `INSERT INTO overview (id, 总金额, 成本金额, 持仓金额, 盈亏金额, 盈亏率, 仓位, 更新时间) VALUES (${row.id}, ${row.总金额}, ${row.成本金额}, ${row.持仓金额}, ${row.盈亏金额}, ${row.盈亏率}, ${row.仓位}, '${row.更新时间}');\n`;
  }
  sql += `\n`;

  // 导出projects数据
  const projects = db.prepare('SELECT * FROM projects ORDER BY id').all();
  sql += `-- Projects数据\n`;
  sql += `DELETE FROM projects;\n`;
  for (const row of projects) {
    const completedTime = row.完成时间 ? `'${row.完成时间}'` : 'NULL';
    sql += `INSERT INTO projects (id, 项目名称, 项目代号, 交易类型, 成本价, 当前价, 股数, 仓位, 成本金额, 当前金额, 盈亏金额, 项目盈亏率, 总盈亏率, 状态, 排序顺序, 创建时间, 完成时间) VALUES (${row.id}, '${row.项目名称}', '${row.项目代号 || ''}', '${row.交易类型}', ${row.成本价}, ${row.当前价}, ${row.股数}, ${row.仓位}, ${row.成本金额}, ${row.当前金额}, ${row.盈亏金额}, ${row.项目盈亏率}, ${row.总盈亏率}, '${row.状态}', ${row.排序顺序}, '${row.创建时间}', ${completedTime});\n`;
  }
  sql += `\n`;

  // 导出transactions数据
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY id').all();
  sql += `-- Transactions数据\n`;
  sql += `DELETE FROM transactions;\n`;
  for (const row of transactions) {
    const transactionTime = row.交易时间 ? `'${row.交易时间}'` : 'NULL';
    sql += `INSERT INTO transactions (id, 项目ID, 项目名称, 状态, 交易名称, 交易类型, 警告方向, 距离, 交易价, 股数, 仓位, 交易金额, 排序顺序, 创建时间, 交易时间) VALUES (${row.id}, ${row.项目ID}, '${row.项目名称}', '${row.状态}', '${row.交易名称}', '${row.交易类型}', '${row.警告方向}', ${row.距离}, ${row.交易价}, ${row.股数}, ${row.仓位}, ${row.交易金额}, ${row.排序顺序}, '${row.创建时间}', ${transactionTime});\n`;
  }
  sql += `\n`;

  // 重置序列（PostgreSQL需要）
  sql += `-- 重置序列\n`;
  const maxProjectId = Math.max(...projects.map(p => p.id), 0);
  const maxTransactionId = Math.max(...transactions.map(t => t.id), 0);
  sql += `SELECT setval('projects_id_seq', ${maxProjectId + 1}, false);\n`;
  sql += `SELECT setval('transactions_id_seq', ${maxTransactionId + 1}, false);\n`;
  sql += `SELECT setval('overview_id_seq', 2, false);\n`;

  fs.writeFileSync(outputPath, sql);
  console.log(`数据导出完成！文件保存在: ${outputPath}`);
  console.log(`项目数量: ${projects.length}`);
  console.log(`交易数量: ${transactions.length}`);
  console.log(`总览记录: ${overview.length}`);

  db.close();
} catch (error) {
  console.error('导出失败:', error);
}