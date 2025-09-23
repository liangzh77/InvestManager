import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      transactions,
      projects,
      deletedTransactions,
      newTransactions
    } = await request.json();

    // 简化日志
    console.log(`🔄 批量更新: ${projects?.length || 0}个项目, ${transactions?.length || 0}个交易, ${deletedTransactions?.length || 0}个删除, ${newTransactions?.length || 0}个新建`);

    const db = getDatabase();

    let transactionsUpdated = 0;
    let projectsUpdated = 0;
    let transactionsDeleted = 0;
    let transactionsCreated = 0;

    // 1. 批量删除交易
    if (deletedTransactions && deletedTransactions.length > 0) {
      const deleteTransactionStmt = db.prepare('DELETE FROM transactions WHERE id = ?');

      for (const transactionId of deletedTransactions) {
        try {
          const result = await deleteTransactionStmt.run(transactionId);
          if (result && typeof result === 'object' && 'changes' in result && (result as any).changes > 0) {
            transactionsDeleted++;
          }
        } catch (err) {
          console.error(`❌ 删除交易 ${transactionId} 失败:`, err);
        }
      }
    }

    // 2. 批量创建新交易
    if (newTransactions && newTransactions.length > 0) {
      const createTransactionStmt = db.prepare(`
        INSERT INTO transactions (
          项目ID, 项目名称, 状态, 交易名称, 交易类型, 警告方向,
          距离, 交易价, 股数, 仓位, 交易金额, 创建时间, 排序顺序
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const newTx of newTransactions) {
        try {
          const result = await createTransactionStmt.run(
            newTx.项目ID,
            newTx.项目名称,
            newTx.状态,
            newTx.交易名称,
            newTx.交易类型,
            newTx.警告方向,
            newTx.距离,
            newTx.交易价,
            newTx.股数,
            newTx.仓位,
            newTx.交易金额,
            newTx.创建时间,
            newTx.排序顺序
          );
          if (result && typeof result === 'object' && 'changes' in result && (result as any).changes > 0) {
            transactionsCreated++;
          }
        } catch (err) {
          console.error(`❌ 创建交易失败，项目ID: ${newTx.项目ID}:`, err);
        }
      }
    }

    // 3. 批量更新交易 - 支持更多字段
    if (transactions && transactions.length > 0) {

      const updateTransactionStmt = db.prepare(`
        UPDATE transactions
        SET
          交易名称 = COALESCE(?, 交易名称),
          交易类型 = COALESCE(?, 交易类型),
          警告方向 = COALESCE(?, 警告方向),
          距离 = COALESCE(?, 距离),
          交易价 = COALESCE(?, 交易价),
          股数 = COALESCE(?, 股数),
          仓位 = COALESCE(?, 仓位),
          交易金额 = COALESCE(?, 交易金额),
          创建时间 = COALESCE(?, 创建时间),
          状态 = COALESCE(?, 状态)
        WHERE id = ?
      `);

      for (const tx of transactions) {
        try {
          const result = await updateTransactionStmt.run(
            tx.交易名称 || null,
            tx.交易类型 || null,
            tx.警告方向 || null,
            tx.距离 || null,
            tx.交易价 || null,
            tx.股数 || null,
            tx.仓位 || null,
            tx.交易金额 || null,
            tx.创建时间 || null,
            tx.状态 || null,
            tx.id
          );

          // 检查更新是否真正成功
          if (result && typeof result === 'object' && 'changes' in result && (result as any).changes > 0) {
            transactionsUpdated++;
          }
        } catch (err) {
          console.error(`❌ 更新交易 ${tx.id} 失败:`, err);
        }
      }
    }

    // 批量更新项目 - 支持更多字段
    if (projects && projects.length > 0) {

      const updateProjectStmt = db.prepare(`
        UPDATE projects
        SET
          项目名称 = COALESCE(?, 项目名称),
          项目代号 = COALESCE(?, 项目代号),
          交易类型 = COALESCE(?, 交易类型),
          成本价 = COALESCE(?, 成本价),
          当前价 = COALESCE(?, 当前价),
          股数 = COALESCE(?, 股数),
          仓位 = COALESCE(?, 仓位),
          成本金额 = COALESCE(?, 成本金额),
          当前金额 = COALESCE(?, 当前金额),
          盈亏金额 = COALESCE(?, 盈亏金额),
          项目盈亏率 = COALESCE(?, 项目盈亏率),
          总盈亏率 = COALESCE(?, 总盈亏率),
          状态 = COALESCE(?, 状态)
        WHERE id = ?
      `);

      for (const proj of projects) {
        try {
          const result = await updateProjectStmt.run(
            proj.项目名称 || null,
            proj.项目代号 || null,
            proj.交易类型 || null,
            proj.成本价 || null,
            proj.当前价 || null,
            proj.股数 || null,
            proj.仓位 || null,
            proj.成本金额 || null,
            proj.当前金额 || null,
            proj.盈亏金额 || null,
            proj.项目盈亏率 || null,
            proj.总盈亏率 || null,
            proj.状态 || null,
            proj.id
          );

          // 检查更新是否真正成功
          if (result && typeof result === 'object' && 'changes' in result && (result as any).changes > 0) {
            projectsUpdated++;
          }
        } catch (err) {
          console.error(`❌ 更新项目 ${proj.id} (${proj.项目名称}) 失败:`, err);
        }
      }
    }

    console.log(`✅ 批量操作完成: 删除${transactionsDeleted}个交易, 创建${transactionsCreated}个交易, 更新${transactionsUpdated}个交易, 更新${projectsUpdated}个项目`);

    return NextResponse.json({
      success: true,
      message: `批量操作成功: 删除${transactionsDeleted}个交易, 创建${transactionsCreated}个交易, 更新${transactionsUpdated}个交易, 更新${projectsUpdated}个项目`,
      data: {
        transactionsDeleted,
        transactionsCreated,
        transactionsUpdated,
        projectsUpdated
      }
    });

  } catch (error) {
    console.error('❌ 批量更新失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量更新失败'
      },
      { status: 500 }
    );
  }
}