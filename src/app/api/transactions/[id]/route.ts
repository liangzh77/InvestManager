import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, calculateTransactionDistance, calculateProjectStats } from '@/lib/database';
import { Transaction } from '@/lib/types';
import { ServerErrorLogger } from '@/utils/serverErrorLogger';

// GET - 获取单个交易
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的交易ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const transaction = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: '交易不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    const errorMsg = `获取交易失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('获取交易错误:', error);
    ServerErrorLogger.addError(errorMsg, 'Transactions API');
    return NextResponse.json(
      { success: false, error: '获取交易失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新交易
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的交易ID' },
        { status: 400 }
      );
    }

    const data: Partial<Transaction> = await request.json();
    const db = getDatabase();

    // 检查交易是否存在
    const existingTransaction = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: '交易不存在' },
        { status: 404 }
      );
    }

    // 获取项目信息用于计算距离
    let 项目名称 = data.项目名称 || null;
    let 距离 = data.距离 || null;

    if (data.项目ID || existingTransaction.项目ID) {
      const projectId = data.项目ID || existingTransaction.项目ID;
      const project = await db.prepare('SELECT 项目名称, 当前价 FROM projects WHERE id = ?').get(projectId) as any;

      if (project) {
        项目名称 = project.项目名称;

        // 重新计算距离
        const transactionForCalc = {
          警告方向: data.警告方向 || existingTransaction.警告方向,
          交易价: data.交易价 || existingTransaction.交易价
        };

        if (transactionForCalc.警告方向 && transactionForCalc.交易价) {
          距离 = calculateTransactionDistance(transactionForCalc, project.当前价);
        }
      }
    }

    // 更新交易
    const stmt = db.prepare(`
      UPDATE transactions SET
        项目ID = COALESCE(?, 项目ID),
        项目名称 = COALESCE(?, 项目名称),
        状态 = COALESCE(?, 状态),
        交易名称 = COALESCE(?, 交易名称),
        交易类型 = COALESCE(?, 交易类型),
        警告方向 = COALESCE(?, 警告方向),
        距离 = COALESCE(?, 距离),
        交易价 = COALESCE(?, 交易价),
        股数 = COALESCE(?, 股数),
        仓位 = COALESCE(?, 仓位),
        交易金额 = COALESCE(?, 交易金额),
        创建时间 = COALESCE(?, 创建时间),
        交易时间 = CASE WHEN ? = '完成' THEN COALESCE(?, CURRENT_TIMESTAMP) ELSE 交易时间 END
      WHERE id = ?
    `);

    await stmt.run(
      data.项目ID || null,
      项目名称 || null,
      data.状态 || null,
      data.交易名称 || null,
      data.交易类型 || null,
      data.警告方向 || null,
      距离 || null,
      data.交易价 || null,
      data.股数 || null,
      data.仓位 || null,
      data.交易金额 || null,
      data.创建时间 || null,
      data.状态 || null,
      data.交易时间 || null,
      id
    );

    // 重新计算相关项目的统计数据
    const updatedTransaction = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;

    // 需要重新计算的项目ID集合
    const projectsToUpdate = new Set<number>();

    // 如果当前交易有项目ID，加入重新计算列表
    if (updatedTransaction.项目ID) {
      projectsToUpdate.add(updatedTransaction.项目ID);
    }

    // 如果原交易有不同的项目ID，也要重新计算
    if (existingTransaction.项目ID && existingTransaction.项目ID !== updatedTransaction.项目ID) {
      projectsToUpdate.add(existingTransaction.项目ID);
    }

    // 简化逻辑：如果交易涉及任何已完成状态（更新前或更新后），就重新计算
    const shouldRecalculate = projectsToUpdate.size > 0 && (
      existingTransaction.状态 === '完成' ||
      updatedTransaction.状态 === '完成'
    );

    if (shouldRecalculate) {
      console.log('重新计算项目统计，影响的项目:', Array.from(projectsToUpdate));

      // 重新计算所有相关项目的统计数据
      for (const projectId of Array.from(projectsToUpdate)) {
        const stats = await calculateProjectStats(projectId, db);
        console.log(`项目 ${projectId} 统计更新:`, stats);

        await db.prepare(`
          UPDATE projects SET
            成本价 = ?, 股数 = ?, 仓位 = ?, 成本金额 = ?,
            当前金额 = ?, 盈亏金额 = ?, 项目盈亏率 = ?, 总盈亏率 = ?
          WHERE id = ?
        `).run(
          stats.成本价, stats.股数, stats.仓位, stats.成本金额,
          stats.当前金额, stats.盈亏金额, stats.项目盈亏率, stats.总盈亏率,
          projectId
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    const errorMsg = `更新交易失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('更新交易错误:', error);
    ServerErrorLogger.addError(errorMsg, 'Transactions API');
    return NextResponse.json(
      { success: false, error: '更新交易失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除交易
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的交易ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 检查交易是否存在
    const existingTransaction = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: '交易不存在' },
        { status: 404 }
      );
    }

    // 删除交易
    await db.prepare('DELETE FROM transactions WHERE id = ?').run(id);

    // 如果被删除的交易状态为'完成'，重新计算相关项目统计
    if (existingTransaction.状态 === '完成' && existingTransaction.项目ID) {
      const stats = await calculateProjectStats(existingTransaction.项目ID, db);
      await db.prepare(`
        UPDATE projects SET
          成本价 = ?, 股数 = ?, 仓位 = ?, 成本金额 = ?,
          当前金额 = ?, 盈亏金额 = ?, 项目盈亏率 = ?, 总盈亏率 = ?
        WHERE id = ?
      `).run(
        stats.成本价, stats.股数, stats.仓位, stats.成本金额,
        stats.当前金额, stats.盈亏金额, stats.项目盈亏率, stats.总盈亏率,
        existingTransaction.项目ID
      );
    }

    return NextResponse.json({
      success: true,
      message: '交易删除成功'
    });
  } catch (error) {
    const errorMsg = `删除交易失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('删除交易错误:', error);
    ServerErrorLogger.addError(errorMsg, 'Transactions API');
    return NextResponse.json(
      { success: false, error: '删除交易失败' },
      { status: 500 }
    );
  }
}