import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { ServerErrorLogger } from '@/utils/serverErrorLogger';

// GET - 获取总览统计
export async function GET() {
  try {
    const db = getDatabase();

    // 首先尝试从overview表获取已保存的总金额
    const existingOverview = await db.prepare('SELECT 总金额 FROM overview WHERE id = 1').get() as any;
    const 保存的总金额 = existingOverview?.总金额 || 0;

    // 计算所有项目的总体统计
    const projectStats = await db.prepare(`
      SELECT
        COALESCE(SUM(成本金额), 0) as 总成本金额,
        COALESCE(SUM(当前金额), 0) as 总当前金额,
        COALESCE(SUM(盈亏金额), 0) as 总盈亏金额,
        COUNT(*) as 项目总数,
        COUNT(CASE WHEN 状态 = '进行' THEN 1 END) as 进行中项目,
        COUNT(CASE WHEN 状态 = '完成' THEN 1 END) as 已完成项目
      FROM projects
    `).get() as any;

    // 计算总盈亏率（基于总投资金额）
    const 总盈亏率 = 保存的总金额 > 0
      ? (projectStats.总盈亏金额 / 保存的总金额) * 100
      : 0;

    // 使用保存的总金额计算总仓位
    const 总仓位 = 保存的总金额 > 0
      ? (projectStats.总当前金额 / 保存的总金额) * 100
      : 0;

    // 获取最近的交易活动
    const recentTransactions = await db.prepare(`
      SELECT COUNT(*) as 交易总数,
        COUNT(CASE WHEN 状态 = '计划' THEN 1 END) as 计划中交易,
        COUNT(CASE WHEN 状态 = '完成' THEN 1 END) as 已完成交易
      FROM transactions
    `).get() as any;

    // 构建总览数据
    const overview = {
      总金额: 保存的总金额,  // 使用保存的总金额而不是总当前金额
      成本金额: projectStats.总成本金额,
      持仓金额: projectStats.总当前金额,
      盈亏金额: projectStats.总盈亏金额,
      盈亏率: 总盈亏率,
      仓位: 总仓位,
      更新时间: new Date().toISOString(),

      // 额外统计信息
      项目统计: {
        项目总数: projectStats.项目总数,
        进行中项目: projectStats.进行中项目,
        已完成项目: projectStats.已完成项目
      },
      交易统计: {
        交易总数: recentTransactions.交易总数,
        计划中交易: recentTransactions.计划中交易,
        已完成交易: recentTransactions.已完成交易
      }
    };

    // 保存到overview表（保持总金额不变）
    await db.prepare(`
      INSERT OR REPLACE INTO overview (
        id, 总金额, 成本金额, 持仓金额, 盈亏金额, 盈亏率, 仓位, 更新时间
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      1,
      overview.总金额,
      overview.成本金额,
      overview.持仓金额,
      overview.盈亏金额,
      overview.盈亏率,
      overview.仓位
    );

    return NextResponse.json({
      success: true,
      data: overview
    });
  } catch (error) {
    const errorMsg = `获取总览统计失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('获取总览统计错误:', error);
    ServerErrorLogger.addError(errorMsg, '总览API');
    return NextResponse.json(
      { success: false, error: '获取总览统计失败' },
      { status: 500 }
    );
  }
}

// POST - 手动更新总览统计（可选）
export async function POST() {
  try {
    // 直接调用GET方法重新计算
    return await GET();
  } catch (error) {
    const errorMsg = `手动更新总览统计失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('更新总览统计错误:', error);
    ServerErrorLogger.addError(errorMsg, '总览API');
    return NextResponse.json(
      { success: false, error: '更新总览统计失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新总金额
export async function PUT(request: NextRequest) {
  try {
    const { 总金额 } = await request.json();

    if (!总金额 || isNaN(总金额) || 总金额 <= 0) {
      const errorMsg = `更新总金额验证失败: 总金额 ${总金额} 不是有效的正数`;
      ServerErrorLogger.addError(errorMsg, '总览API');
      return NextResponse.json(
        { success: false, error: '总金额必须是有效的正数' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 获取当前项目统计
    const projectStats = await db.prepare(`
      SELECT
        COALESCE(SUM(成本金额), 0) as 总成本金额,
        COALESCE(SUM(当前金额), 0) as 总当前金额,
        COALESCE(SUM(盈亏金额), 0) as 总盈亏金额,
        COUNT(*) as 项目总数
      FROM projects
    `).get() as any;

    // 基于新的总金额重新计算相关指标
    const 新总仓位 = 总金额 > 0 ? (projectStats.总当前金额 / 总金额) * 100 : 0;
    const 新盈亏率 = 总金额 > 0
      ? (projectStats.总盈亏金额 / 总金额) * 100
      : 0;

    // 更新总览表
    const updateResult = await db.prepare(`
      INSERT OR REPLACE INTO overview (
        id, 总金额, 成本金额, 持仓金额, 盈亏金额, 盈亏率, 仓位, 更新时间
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      1,
      总金额,
      projectStats.总成本金额,
      projectStats.总当前金额,
      projectStats.总盈亏金额,
      新盈亏率,
      新总仓位
    );

    // 获取更新后的数据
    const updatedOverview = await db.prepare('SELECT * FROM overview WHERE id = 1').get();

    return NextResponse.json({
      success: true,
      message: '总金额更新成功',
      data: {
        ...(updatedOverview as object),
        项目统计: {
          项目总数: projectStats.项目总数,
          总成本金额: projectStats.总成本金额,
          总当前金额: projectStats.总当前金额,
          总盈亏金额: projectStats.总盈亏金额
        }
      }
    });
  } catch (error) {
    const errorMsg = `更新总金额失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('更新总金额错误:', error);
    ServerErrorLogger.addError(errorMsg, '总览API');
    return NextResponse.json(
      { success: false, error: '更新总金额失败' },
      { status: 500 }
    );
  }
}