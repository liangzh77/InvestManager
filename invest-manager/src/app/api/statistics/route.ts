import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Statistics } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const 年月 = searchParams.get('年月');
    const 类型 = searchParams.get('类型');

    const db = getDatabase();
    let query = 'SELECT * FROM statistics';
    let params: any[] = [];
    const conditions: string[] = [];

    if (年月) {
      conditions.push('年月 = ?');
      params.push(年月);
    }

    if (类型) {
      conditions.push('类型 = ?');
      params.push(类型);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY 年月 DESC, 类型';

    const statistics = db.prepare(query).all(...params) as Statistics[];

    return NextResponse.json({ success: true, data: statistics });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      年月,
      类型,
      自主盈亏金额,
      自主盈亏率,
      基金盈亏金额,
      基金盈亏率,
      总盈亏金额,
      总盈亏率
    } = body;

    if (!年月 || !类型) {
      return NextResponse.json(
        { success: false, error: '年月和类型不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 检查是否已存在相同年月和类型的记录
    const existing = db.prepare('SELECT * FROM statistics WHERE 年月 = ? AND 类型 = ?').get(年月, 类型);
    if (existing) {
      return NextResponse.json(
        { success: false, error: '该年月和类型的统计记录已存在' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO statistics (
        年月, 类型, 自主盈亏金额, 自主盈亏率, 基金盈亏金额, 基金盈亏率, 总盈亏金额, 总盈亏率
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      年月,
      类型,
      自主盈亏金额,
      自主盈亏率,
      基金盈亏金额,
      基金盈亏率,
      总盈亏金额,
      总盈亏率
    );

    const newStatistics = db.prepare('SELECT * FROM statistics WHERE id = ?').get(result.lastInsertRowid) as Statistics;

    return NextResponse.json({ success: true, data: newStatistics });
  } catch (error) {
    console.error('创建统计记录失败:', error);
    return NextResponse.json(
      { success: false, error: '创建统计记录失败' },
      { status: 500 }
    );
  }
}

// 计算统计数据的端点
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 年月, 类型 = '月度' } = body;

    if (!年月) {
      return NextResponse.json(
        { success: false, error: '年月不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 计算自主投资盈亏
    const projectsData = db.prepare(`
      SELECT
        SUM(CASE WHEN p.完成时间 IS NOT NULL AND strftime('%Y-%m', p.完成时间) = ? THEN p.盈亏金额 ELSE 0 END) as 自主盈亏金额
      FROM projects p
    `).get(年月) as any;

    // 计算基金盈亏 (这里需要根据实际业务逻辑计算)
    const fundsData = db.prepare(`
      SELECT
        SUM(f.当前金额 - f.成本金额) as 基金盈亏金额
      FROM funds f
    `).get() as any;

    const 自主盈亏金额 = projectsData?.自主盈亏金额 || 0;
    const 基金盈亏金额 = fundsData?.基金盈亏金额 || 0;
    const 总盈亏金额 = 自主盈亏金额 + 基金盈亏金额;

    // 获取总投资金额计算盈亏率
    const overviewData = db.prepare('SELECT * FROM overview ORDER BY 更新时间 DESC LIMIT 1').get() as any;
    const 自主总金额 = overviewData?.自主总金额 || 0;
    const 基金总金额 = overviewData?.基金总金额 || 0;
    const 总投资金额 = 自主总金额 + 基金总金额;

    const 自主盈亏率 = 自主总金额 > 0 ? (自主盈亏金额 / 自主总金额) * 100 : 0;
    const 基金盈亏率 = 基金总金额 > 0 ? (基金盈亏金额 / 基金总金额) * 100 : 0;
    const 总盈亏率 = 总投资金额 > 0 ? (总盈亏金额 / 总投资金额) * 100 : 0;

    // 删除已存在的记录
    db.prepare('DELETE FROM statistics WHERE 年月 = ? AND 类型 = ?').run(年月, 类型);

    // 插入新计算的统计数据
    const stmt = db.prepare(`
      INSERT INTO statistics (
        年月, 类型, 自主盈亏金额, 自主盈亏率, 基金盈亏金额, 基金盈亏率, 总盈亏金额, 总盈亏率
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      年月,
      类型,
      自主盈亏金额,
      自主盈亏率,
      基金盈亏金额,
      基金盈亏率,
      总盈亏金额,
      总盈亏率
    );

    const newStatistics = db.prepare('SELECT * FROM statistics WHERE id = ?').get(result.lastInsertRowid) as Statistics;

    return NextResponse.json({ success: true, data: newStatistics });
  } catch (error) {
    console.error('计算统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '计算统计数据失败' },
      { status: 500 }
    );
  }
}