import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET - 获取所有项目的统计信息
export async function GET() {
  try {
    const db = getDatabase();

    // 获取所有项目的详细统计
    const projectStatistics = db.prepare(`
      SELECT
        id as 项目ID,
        项目名称,
        项目代号,
        交易类型,
        成本价,
        当前价,
        股数,
        仓位,
        成本金额,
        当前金额,
        盈亏金额,
        项目盈亏率,
        总盈亏率,
        状态,
        创建时间,
        完成时间
      FROM projects
      ORDER BY 创建时间 DESC
    `).all();

    // 获取每个项目的交易统计
    const transactionStatistics = db.prepare(`
      SELECT
        项目ID,
        COUNT(*) as 交易次数,
        COUNT(CASE WHEN 状态 = '完成' THEN 1 END) as 已完成交易,
        COUNT(CASE WHEN 状态 = '计划' THEN 1 END) as 计划中交易,
        COALESCE(SUM(CASE WHEN 状态 = '完成' THEN 交易金额 ELSE 0 END), 0) as 已完成交易金额
      FROM transactions
      WHERE 项目ID IS NOT NULL
      GROUP BY 项目ID
    `).all() as any[];

    // 合并项目和交易统计
    const combinedStatistics = (projectStatistics as any[]).map(project => {
      const transactionStat = transactionStatistics.find(
        stat => stat.项目ID === project.项目ID
      ) || {
        交易次数: 0,
        已完成交易: 0,
        计划中交易: 0,
        已完成交易金额: 0
      };

      return {
        ...project,
        交易统计: transactionStat
      };
    });

    // 计算整体统计
    const overallStats = {
      总项目数: projectStatistics.length,
      进行中项目: (projectStatistics as any[]).filter(p => p.状态 === '进行').length,
      已完成项目: (projectStatistics as any[]).filter(p => p.状态 === '完成').length,
      总成本金额: (projectStatistics as any[]).reduce((sum, p) => sum + (p.成本金额 || 0), 0),
      总当前金额: (projectStatistics as any[]).reduce((sum, p) => sum + (p.当前金额 || 0), 0),
      总盈亏金额: (projectStatistics as any[]).reduce((sum, p) => sum + (p.盈亏金额 || 0), 0),
      更新时间: new Date().toISOString()
    };

    // 更新统计表
    for (const project of projectStatistics as any[]) {
      db.prepare(`
        INSERT OR REPLACE INTO statistics (
          项目ID, 盈亏金额, 盈亏率, 更新时间
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        project.项目ID,
        project.盈亏金额,
        project.项目盈亏率
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        项目统计: combinedStatistics,
        整体统计: overallStats
      }
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    return NextResponse.json(
      { success: false, error: '获取统计信息失败' },
      { status: 500 }
    );
  }
}