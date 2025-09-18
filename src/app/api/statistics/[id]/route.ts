import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// GET - 获取特定项目的详细统计
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的项目ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 获取项目基本信息
    const project = db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).get(id) as any;

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 获取项目的所有交易记录
    const transactions = db.prepare(`
      SELECT * FROM transactions
      WHERE 项目ID = ?
      ORDER BY 创建时间 DESC
    `).all(id);

    // 获取交易统计
    const transactionStats = db.prepare(`
      SELECT
        COUNT(*) as 总交易数,
        COUNT(CASE WHEN 状态 = '完成' THEN 1 END) as 已完成交易数,
        COUNT(CASE WHEN 状态 = '计划' THEN 1 END) as 计划交易数,
        COUNT(CASE WHEN 交易类型 = '做多' THEN 1 END) as 做多交易数,
        COUNT(CASE WHEN 交易类型 = '做空' THEN 1 END) as 做空交易数,
        COUNT(CASE WHEN 交易类型 = '多头平仓' THEN 1 END) as 多头平仓数,
        COUNT(CASE WHEN 交易类型 = '空头平仓' THEN 1 END) as 空头平仓数,
        COALESCE(SUM(CASE WHEN 状态 = '完成' THEN 交易金额 ELSE 0 END), 0) as 已完成交易总额,
        COALESCE(AVG(CASE WHEN 状态 = '完成' THEN 交易价 ELSE NULL END), 0) as 平均交易价
      FROM transactions
      WHERE 项目ID = ?
    `).get(id) as any;

    // 获取历史统计记录
    const historicalStats = db.prepare(`
      SELECT * FROM statistics
      WHERE 项目ID = ?
      ORDER BY 更新时间 DESC
      LIMIT 10
    `).all(id);

    // 计算收益表现
    const 收益表现 = {
      成本价: project.成本价 || 0,
      当前价: project.当前价 || 0,
      价格变化: project.当前价 && project.成本价
        ? ((project.当前价 - project.成本价) / project.成本价) * 100
        : 0,
      盈亏金额: project.盈亏金额 || 0,
      项目盈亏率: project.项目盈亏率 || 0,
      总盈亏率: project.总盈亏率 || 0
    };

    // 计算仓位信息
    const 仓位信息 = {
      持有股数: project.股数 || 0,
      当前仓位: project.仓位 || 0,
      成本金额: project.成本金额 || 0,
      当前金额: project.当前金额 || 0
    };

    // 计算交易活跃度
    const 交易活跃度 = {
      交易频率: transactionStats.总交易数,
      完成率: transactionStats.总交易数 > 0
        ? (transactionStats.已完成交易数 / transactionStats.总交易数) * 100
        : 0,
      平均交易金额: transactionStats.已完成交易数 > 0
        ? transactionStats.已完成交易总额 / transactionStats.已完成交易数
        : 0
    };

    const statistics = {
      项目信息: project,
      收益表现,
      仓位信息,
      交易统计: transactionStats,
      交易活跃度,
      交易记录: transactions,
      历史统计: historicalStats,
      更新时间: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('获取项目统计错误:', error);
    return NextResponse.json(
      { success: false, error: '获取项目统计失败' },
      { status: 500 }
    );
  }
}