import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/utils';

export async function GET() {
  try {
    const db = getDatabase();
    const projects = db.prepare('SELECT * FROM projects ORDER BY 创建时间 DESC').all() as Project[];

    // 获取总览表数据以计算自主盈亏率和仓位
    const overviewData = db.prepare('SELECT * FROM overview ORDER BY 更新时间 DESC LIMIT 1').get() as any;
    const 自主总金额 = overviewData?.自主总金额 || 0;

    // 为每个项目计算相关指标
    const projectsWithMetrics = projects.map(project => {
      // 计算该项目的交易汇总数据
      const transactionSummary = db.prepare(`
        SELECT
          SUM(CASE
            WHEN 交易类型 IN ('做多', '空头平仓') THEN 交易金额
            WHEN 交易类型 IN ('做空', '多头平仓') THEN -交易金额
            ELSE 0
          END) as 成本金额,
          SUM(CASE
            WHEN 交易类型 IN ('做多', '空头平仓') THEN 股数
            WHEN 交易类型 IN ('做空', '多头平仓') THEN -股数
            ELSE 0
          END) as 股数
        FROM transactions
        WHERE 项目ID = ? AND 状态 = '完成'
      `).get(project.id) as any;

      const 成本金额 = transactionSummary?.成本金额 || 0;
      const 股数 = transactionSummary?.股数 || 0;
      const 成本价 = 股数 > 0 ? 成本金额 / 股数 : 0;
      const 当前金额 = (project.当前价 || 0) * 股数;
      const 盈亏金额 = 当前金额 - 成本金额;
      const 项目盈亏率 = 成本金额 > 0 ? (盈亏金额 / 成本金额) * 100 : 0;
      const 自主盈亏率 = 自主总金额 > 0 ? (盈亏金额 / 自主总金额) * 100 : 0;
      const 仓位 = 自主总金额 > 0 ? (当前金额 / 自主总金额) * 100 : 0;

      return {
        ...project,
        成本价,
        股数,
        仓位,
        成本金额,
        当前金额,
        盈亏金额,
        项目盈亏率,
        自主盈亏率
      };
    });

    return NextResponse.json({ success: true, data: projectsWithMetrics });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 项目名称, 项目代号, 交易类型, 当前价, 创建时间, 完成时间 } = body;

    if (!项目名称) {
      return NextResponse.json(
        { success: false, error: '项目名称不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO projects (
        项目名称, 项目代号, 交易类型, 当前价, 创建时间, 完成时间
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      项目名称,
      项目代号,
      交易类型,
      当前价,
      创建时间 || new Date().toISOString(),
      完成时间
    );

    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project;

    return NextResponse.json({ success: true, data: newProject });
  } catch (error) {
    console.error('创建项目失败:', error);
    return NextResponse.json(
      { success: false, error: '创建项目失败' },
      { status: 500 }
    );
  }
}