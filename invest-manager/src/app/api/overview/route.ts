import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Overview } from '@/lib/types';

export async function GET() {
  try {
    const db = getDatabase();

    // 获取最新的总览数据
    const overview = db.prepare('SELECT * FROM overview ORDER BY 更新时间 DESC LIMIT 1').get() as Overview;

    if (!overview) {
      // 如果没有总览数据，创建一个默认的
      return NextResponse.json({
        success: true,
        data: {
          自主总金额: 0,
          自主成本金额: 0,
          自主持仓金额: 0,
          自主盈亏金额: 0,
          自主盈亏率: 0,
          自主仓位: 0,
          基金总金额: 0,
          基金盈亏金额: 0,
          基金盈亏率: 0,
          总投资金额: 0,
          总盈亏金额: 0,
          总盈亏率: 0,
          更新时间: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    console.error('获取总览数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取总览数据失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      自主总金额,
      自主成本金额,
      自主持仓金额,
      自主盈亏金额,
      自主盈亏率,
      自主仓位,
      基金总金额,
      基金盈亏金额,
      基金盈亏率,
      总投资金额,
      总盈亏金额,
      总盈亏率
    } = body;

    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO overview (
        自主总金额, 自主成本金额, 自主持仓金额, 自主盈亏金额, 自主盈亏率, 自主仓位,
        基金总金额, 基金盈亏金额, 基金盈亏率, 总投资金额, 总盈亏金额, 总盈亏率
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      自主总金额,
      自主成本金额,
      自主持仓金额,
      自主盈亏金额,
      自主盈亏率,
      自主仓位,
      基金总金额,
      基金盈亏金额,
      基金盈亏率,
      总投资金额,
      总盈亏金额,
      总盈亏率
    );

    const newOverview = db.prepare('SELECT * FROM overview WHERE id = ?').get(result.lastInsertRowid) as Overview;

    return NextResponse.json({ success: true, data: newOverview });
  } catch (error) {
    console.error('创建总览数据失败:', error);
    return NextResponse.json(
      { success: false, error: '创建总览数据失败' },
      { status: 500 }
    );
  }
}

// 计算总览数据的端点
export async function PUT() {
  try {
    const db = getDatabase();

    // 计算自主投资数据
    const projectsData = db.prepare(`
      SELECT
        SUM(COALESCE(p.成本金额, 0)) as 自主成本金额,
        SUM(COALESCE(p.当前金额, 0)) as 自主持仓金额
      FROM projects p
      WHERE p.完成时间 IS NULL
    `).get() as any;

    // 计算基金数据
    const fundsData = db.prepare(`
      SELECT
        SUM(成本金额) as 基金成本金额,
        SUM(当前金额) as 基金当前金额
      FROM funds
    `).get() as any;

    const 自主成本金额 = projectsData?.自主成本金额 || 0;
    const 自主持仓金额 = projectsData?.自主持仓金额 || 0;
    const 自主盈亏金额 = 自主持仓金额 - 自主成本金额;
    const 自主盈亏率 = 自主成本金额 > 0 ? (自主盈亏金额 / 自主成本金额) * 100 : 0;
    const 自主总金额 = 自主成本金额; // 根据文档，自主总金额应该是投入的总成本
    const 自主仓位 = 100; // 假设自主投资的仓位为100%

    const 基金成本金额 = fundsData?.基金成本金额 || 0;
    const 基金当前金额 = fundsData?.基金当前金额 || 0;
    const 基金盈亏金额 = 基金当前金额 - 基金成本金额;
    const 基金盈亏率 = 基金成本金额 > 0 ? (基金盈亏金额 / 基金成本金额) * 100 : 0;
    const 基金总金额 = 基金成本金额;

    const 总投资金额 = 自主总金额 + 基金总金额;
    const 总盈亏金额 = 自主盈亏金额 + 基金盈亏金额;
    const 总盈亏率 = 总投资金额 > 0 ? (总盈亏金额 / 总投资金额) * 100 : 0;

    // 删除旧的总览数据
    db.prepare('DELETE FROM overview').run();

    // 插入新计算的总览数据
    const stmt = db.prepare(`
      INSERT INTO overview (
        自主总金额, 自主成本金额, 自主持仓金额, 自主盈亏金额, 自主盈亏率, 自主仓位,
        基金总金额, 基金盈亏金额, 基金盈亏率, 总投资金额, 总盈亏金额, 总盈亏率
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      自主总金额,
      自主成本金额,
      自主持仓金额,
      自主盈亏金额,
      自主盈亏率,
      自主仓位,
      基金总金额,
      基金盈亏金额,
      基金盈亏率,
      总投资金额,
      总盈亏金额,
      总盈亏率
    );

    const newOverview = db.prepare('SELECT * FROM overview WHERE id = ?').get(result.lastInsertRowid) as Overview;

    return NextResponse.json({ success: true, data: newOverview });
  } catch (error) {
    console.error('计算总览数据失败:', error);
    return NextResponse.json(
      { success: false, error: '计算总览数据失败' },
      { status: 500 }
    );
  }
}