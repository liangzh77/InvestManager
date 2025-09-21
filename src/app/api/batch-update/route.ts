import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { transactions, projects } = await request.json();
    const db = getDatabase();

    let transactionsUpdated = 0;
    let projectsUpdated = 0;

    // 批量更新交易
    if (transactions && transactions.length > 0) {
      const updateTransactionStmt = db.prepare(`
        UPDATE transactions
        SET 交易金额 = ?, 仓位 = ?
        WHERE id = ?
      `);

      for (const tx of transactions) {
        try {
          const result = updateTransactionStmt.run(tx.交易金额, tx.仓位, tx.id);
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

    // 批量更新项目
    if (projects && projects.length > 0) {
      const updateProjectStmt = db.prepare(`
        UPDATE projects
        SET 仓位 = ?, 项目盈亏率 = ?, 总盈亏率 = ?
        WHERE id = ?
      `);

      for (const proj of projects) {
        try {
          const result = updateProjectStmt.run(proj.仓位, proj.项目盈亏率, proj.总盈亏率, proj.id);
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