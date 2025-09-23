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

    // 详细调试日志
    console.log('🔍 批量更新API接收到的数据:');
    console.log('- 要更新的项目数量:', projects?.length || 0);
    console.log('- 要更新的交易数量:', transactions?.length || 0);
    console.log('- 要删除的交易数量:', deletedTransactions?.length || 0);
    console.log('- 要新建的交易数量:', newTransactions?.length || 0);
    console.log('- 项目详情:', projects);
    console.log('- 交易详情:', transactions);

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
            console.log(`✅ 删除交易 ${transactionId} 成功`);
          } else {
            console.warn(`⚠️ 交易 ${transactionId} 删除无效果，可能记录不存在`);
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
            console.log(`✅ 创建交易成功，项目ID: ${newTx.项目ID}`);
          } else {
            console.warn(`⚠️ 创建交易结果未知，项目ID: ${newTx.项目ID}`);
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
            tx.交易名称,
            tx.交易类型,
            tx.警告方向,
            tx.距离,
            tx.交易价,
            tx.股数,
            tx.仓位,
            tx.交易金额,
            tx.创建时间,
            tx.状态,
            tx.id
          );
          // 检查更新是否真正成功
          if (result && typeof result === 'object' && 'changes' in result) {
            if ((result as any).changes > 0) {
              transactionsUpdated++;
              console.log(`✅ 交易 ${tx.id} 更新成功`);
            } else {
              console.warn(`⚠️ 交易 ${tx.id} 没有发生变化，可能记录不存在或数据相同`);
            }
          } else {
            console.warn(`⚠️ 交易 ${tx.id} 更新结果未知`);
          }
        } catch (err) {
          console.error(`❌ 更新交易 ${tx.id} 失败:`, err);
        }
      }
    }

    // 批量更新项目 - 支持更多字段
    if (projects && projects.length > 0) {
      console.log(`🔄 开始更新 ${projects.length} 个项目...`);

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
          console.log(`🔧 准备更新项目 ${proj.id}:`, proj);

          const result = await updateProjectStmt.run(
            proj.项目名称,
            proj.项目代号,
            proj.交易类型,
            proj.成本价,
            proj.当前价,
            proj.股数,
            proj.仓位,
            proj.成本金额,
            proj.当前金额,
            proj.盈亏金额,
            proj.项目盈亏率,
            proj.总盈亏率,
            proj.状态,
            proj.id
          );

          console.log(`📋 项目 ${proj.id} 更新结果:`, result);
          // 检查更新是否真正成功
          if (result && typeof result === 'object' && 'changes' in result) {
            if ((result as any).changes > 0) {
              projectsUpdated++;
              console.log(`✅ 项目 ${proj.id} (${proj.项目名称}) 更新成功`);
            } else {
              console.warn(`⚠️ 项目 ${proj.id} (${proj.项目名称}) 没有发生变化，可能记录不存在或数据相同`);
            }
          } else {
            console.warn(`⚠️ 项目 ${proj.id} (${proj.项目名称}) 更新结果未知`);
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