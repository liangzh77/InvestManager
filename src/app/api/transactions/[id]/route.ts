import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Transaction } from '@/lib/types';
import { calculateTransactionMetrics } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: '交易不存在' },
        { status: 404 }
      );
    }

    // 获取总览表数据以计算最大亏损率和最大盈利率
    const overviewData = db.prepare('SELECT * FROM overview ORDER BY 更新时间 DESC LIMIT 1').get() as any;
    const 自主总金额 = overviewData?.自主总金额 || 0;

    // 获取项目当前价
    const project = db.prepare('SELECT 当前价 FROM projects WHERE id = ?').get(transaction.项目ID) as any;
    const 项目当前价 = project?.当前价 || 0;

    // 计算距离
    let 距离 = 0;
    if (项目当前价 && transaction.交易价) {
      if (transaction.警告方向 === '向下') {
        距离 = -((transaction.交易价 - 项目当前价) / 项目当前价) * 100;
      } else if (transaction.警告方向 === '向上') {
        距离 = ((transaction.交易价 - 项目当前价) / 项目当前价) * 100;
      }
    }

    // 计算最大亏损额和最大盈利额
    let 最大亏损额 = 0;
    let 最大盈利额 = 0;

    if (transaction.交易价 && transaction.股数) {
      if (transaction.止损价) {
        最大亏损额 = (transaction.止损价 - transaction.交易价) * transaction.股数;
      }
      if (transaction.止盈价) {
        最大盈利额 = (transaction.止盈价 - transaction.交易价) * transaction.股数;
      }
    }

    const 最大亏损率 = 自主总金额 > 0 ? (最大亏损额 / 自主总金额) * 100 : 0;
    const 最大盈利率 = 自主总金额 > 0 ? (最大盈利额 / 自主总金额) * 100 : 0;

    const transactionWithMetrics = {
      ...transaction,
      距离,
      最大亏损额,
      最大亏损率,
      最大盈利额,
      最大盈利率
    };

    return NextResponse.json({ success: true, data: transactionWithMetrics });
  } catch (error) {
    console.error('获取交易详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取交易详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      项目ID,
      项目名称,
      状态,
      交易名称,
      交易类型,
      警告方向,
      交易价,
      止盈价,
      止损价,
      股数,
      仓位,
      交易金额,
      交易时间
    } = body;

    const db = getDatabase();

    // 检查交易是否存在
    const existingTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: '交易不存在' },
        { status: 404 }
      );
    }

    // 确定最终的交易数据
    const final项目ID = 项目ID || existingTransaction.项目ID;
    const final交易价 = 交易价 !== undefined ? 交易价 : existingTransaction.交易价;
    const final止盈价 = 止盈价 !== undefined ? 止盈价 : existingTransaction.止盈价;
    const final止损价 = 止损价 !== undefined ? 止损价 : existingTransaction.止损价;
    const final股数 = 股数 !== undefined ? 股数 : existingTransaction.股数;
    const final交易类型 = 交易类型 || existingTransaction.交易类型;
    const final警告方向 = 警告方向 || existingTransaction.警告方向;

    // 获取项目信息（用于计算）
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(final项目ID) as any;
    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 获取总览数据以计算相对比率
    const overviewData = db.prepare('SELECT * FROM overview ORDER BY 更新时间 DESC LIMIT 1').get() as any;
    const 自主总金额 = overviewData?.自主总金额 || 0;

    // 重新计算所有指标（如果有必要的数据）
    let calculatedMetrics = { 距离: 0, 仓位: 0, 交易金额: 0, 最大亏损额: 0, 最大亏损率: 0, 最大盈利额: 0, 最大盈利率: 0 };
    if (final交易价 && final股数) {
      calculatedMetrics = calculateTransactionMetrics(
        final交易价,
        final止盈价,
        final止损价,
        final股数,
        final交易类型,
        project.当前价,
        final警告方向,
        自主总金额
      );
    }

    const stmt = db.prepare(`
      UPDATE transactions SET
        项目ID = ?, 项目名称 = ?, 状态 = ?, 交易名称 = ?, 交易类型 = ?,
        警告方向 = ?, 交易价 = ?, 止盈价 = ?, 止损价 = ?, 股数 = ?,
        仓位 = ?, 交易金额 = ?, 距离 = ?, 最大亏损额 = ?, 最大亏损率 = ?,
        最大盈利额 = ?, 最大盈利率 = ?, 交易时间 = ?
      WHERE id = ?
    `);

    stmt.run(
      final项目ID,
      项目名称 || existingTransaction.项目名称,
      状态 || existingTransaction.状态,
      交易名称 || existingTransaction.交易名称,
      final交易类型,
      final警告方向,
      final交易价,
      final止盈价,
      final止损价,
      final股数,
      calculatedMetrics.仓位,
      calculatedMetrics.交易金额,
      calculatedMetrics.距离,
      calculatedMetrics.最大亏损额,
      calculatedMetrics.最大亏损率,
      calculatedMetrics.最大盈利额,
      calculatedMetrics.最大盈利率,
      交易时间 || existingTransaction.交易时间,
      id
    );

    const updatedTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;

    return NextResponse.json({ success: true, data: updatedTransaction });
  } catch (error) {
    console.error('更新交易失败:', error);
    return NextResponse.json(
      { success: false, error: '更新交易失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    // 检查交易是否存在
    const existingTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: '交易不存在' },
        { status: 404 }
      );
    }

    // 删除交易
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: '交易删除成功' });
  } catch (error) {
    console.error('删除交易失败:', error);
    return NextResponse.json(
      { success: false, error: '删除交易失败' },
      { status: 500 }
    );
  }
}