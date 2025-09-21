import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, calculateTransactionDistance, calculateProjectStats } from '@/lib/database';
import { Transaction } from '@/lib/types';
import { ServerErrorLogger } from '@/utils/serverErrorLogger';

// GET - 获取所有交易
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const db = getDatabase();
    let query = 'SELECT * FROM transactions ORDER BY 创建时间 DESC';
    let params: any[] = [];

    if (projectId) {
      query = 'SELECT * FROM transactions WHERE 项目ID = ? ORDER BY 创建时间 DESC';
      params = [parseInt(projectId)];
    }

    const transactions = db.prepare(query).all(...params);

    return NextResponse.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    const errorMsg = `获取交易列表失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('获取交易列表错误:', error);
    ServerErrorLogger.addError(errorMsg, '交易API');
    return NextResponse.json(
      { success: false, error: '获取交易列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新交易
export async function POST(request: NextRequest) {
  try {
    const data: Partial<Transaction> = await request.json();

    // 验证必填字段
    if (!data.交易类型 || !data.状态) {
      const errorMsg = `创建交易验证失败: 缺少必填字段 - 交易类型: ${data.交易类型}, 状态: ${data.状态}`;
      ServerErrorLogger.addError(errorMsg, '交易API');
      return NextResponse.json(
        { success: false, error: '交易类型和状态为必填字段' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 如果提供了项目ID，验证项目是否存在并获取项目名称
    let 项目名称 = data.项目名称;
    if (data.项目ID) {
      const project = await db.prepare('SELECT 项目名称, 当前价 FROM projects WHERE id = ?').get(data.项目ID) as any;
      if (project) {
        项目名称 = project.项目名称;

        // 计算距离
        if (data.警告方向 && data.交易价) {
          data.距离 = calculateTransactionDistance(data, project.当前价);
        }
      } else {
        const errorMsg = `创建交易失败: 指定的项目ID ${data.项目ID} 不存在`;
        ServerErrorLogger.addError(errorMsg, '交易API');
        return NextResponse.json(
          { success: false, error: '指定的项目不存在' },
          { status: 400 }
        );
      }
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (
        项目ID, 项目名称, 状态, 交易名称, 交易类型, 警告方向, 距离,
        交易价, 股数, 仓位, 交易金额, 创建时间, 交易时间, 排序顺序
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `);

    const result = await stmt.run(
      data.项目ID || null,
      项目名称 || null,
      data.状态,
      data.交易名称 || null,
      data.交易类型,
      data.警告方向 || null,
      data.距离 || null,
      data.交易价 || null,
      data.股数 || null,
      data.仓位 || null,
      data.交易金额 || null,
      data.交易时间 || null,
      data.排序顺序 || 0
    );

    // 如果交易状态为'完成'，更新相关项目的统计数据
    if (data.状态 === '完成' && data.项目ID) {
      const stats = await calculateProjectStats(data.项目ID, db);
      await db.prepare(`
        UPDATE projects SET
          成本价 = ?, 股数 = ?, 仓位 = ?, 成本金额 = ?,
          当前金额 = ?, 盈亏金额 = ?, 项目盈亏率 = ?, 总盈亏率 = ?
        WHERE id = ?
      `).run(
        stats.成本价, stats.股数, stats.仓位, stats.成本金额,
        stats.当前金额, stats.盈亏金额, stats.项目盈亏率, stats.总盈亏率,
        data.项目ID
      );
    }

    // 获取创建的交易
    const transaction = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    const errorMsg = `创建交易失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('创建交易错误:', error);
    ServerErrorLogger.addError(errorMsg, '交易API');
    return NextResponse.json(
      { success: false, error: '创建交易失败' },
      { status: 500 }
    );
  }
}