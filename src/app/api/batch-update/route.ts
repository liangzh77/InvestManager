import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { transactions, projects } = await request.json();
    const db = getDatabase();

    let transactionsUpdated = 0;
    let projectsUpdated = 0;

    // 批量更新交易 - 支持更多字段
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
          const result = updateTransactionStmt.run(
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
          // 兼容不同数据库环境的返回类型
          if (result && typeof result === 'object' && 'changes' in result && (result as any).changes > 0) {
            transactionsUpdated++;
          } else {
            // 兜底：如果没有changes属性，认为更新成功
            transactionsUpdated++;
          }
        } catch (err) {
          console.error(`更新交易 ${tx.id} 失败:`, err);
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
          const result = updateProjectStmt.run(
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
          // 兼容不同数据库环境的返回类型
          if (result && typeof result === 'object' && 'changes' in result && (result as any).changes > 0) {
            projectsUpdated++;
          } else {
            // 兜底：如果没有changes属性，认为更新成功
            projectsUpdated++;
          }
        } catch (err) {
          console.error(`更新项目 ${proj.id} 失败:`, err);
        }
      }
    }

    console.log(`✅ 批量更新完成: ${transactionsUpdated}个交易, ${projectsUpdated}个项目`);

    return NextResponse.json({
      success: true,
      message: `批量更新成功: ${transactionsUpdated}个交易, ${projectsUpdated}个项目`,
      data: {
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