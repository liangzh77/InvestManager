import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Statistics } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const statistics = db.prepare('SELECT * FROM statistics WHERE id = ?').get(id) as Statistics;

    if (!statistics) {
      return NextResponse.json(
        { success: false, error: '统计记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: statistics });
  } catch (error) {
    console.error('获取统计记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取统计记录失败' },
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
      年月,
      类型,
      自主盈亏金额,
      自主盈亏率,
      基金盈亏金额,
      基金盈亏率,
      总盈亏金额,
      总盈亏率
    } = body;

    const db = getDatabase();

    // 检查统计记录是否存在
    const existingStatistics = db.prepare('SELECT * FROM statistics WHERE id = ?').get(id) as Statistics;
    if (!existingStatistics) {
      return NextResponse.json(
        { success: false, error: '统计记录不存在' },
        { status: 404 }
      );
    }

    const stmt = db.prepare(`
      UPDATE statistics SET
        年月 = ?, 类型 = ?, 自主盈亏金额 = ?, 自主盈亏率 = ?,
        基金盈亏金额 = ?, 基金盈亏率 = ?, 总盈亏金额 = ?, 总盈亏率 = ?
      WHERE id = ?
    `);

    stmt.run(
      年月 || existingStatistics.年月,
      类型 || existingStatistics.类型,
      自主盈亏金额 !== undefined ? 自主盈亏金额 : existingStatistics.自主盈亏金额,
      自主盈亏率 !== undefined ? 自主盈亏率 : existingStatistics.自主盈亏率,
      基金盈亏金额 !== undefined ? 基金盈亏金额 : existingStatistics.基金盈亏金额,
      基金盈亏率 !== undefined ? 基金盈亏率 : existingStatistics.基金盈亏率,
      总盈亏金额 !== undefined ? 总盈亏金额 : existingStatistics.总盈亏金额,
      总盈亏率 !== undefined ? 总盈亏率 : existingStatistics.总盈亏率,
      id
    );

    const updatedStatistics = db.prepare('SELECT * FROM statistics WHERE id = ?').get(id) as Statistics;

    return NextResponse.json({ success: true, data: updatedStatistics });
  } catch (error) {
    console.error('更新统计记录失败:', error);
    return NextResponse.json(
      { success: false, error: '更新统计记录失败' },
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

    // 检查统计记录是否存在
    const existingStatistics = db.prepare('SELECT * FROM statistics WHERE id = ?').get(id) as Statistics;
    if (!existingStatistics) {
      return NextResponse.json(
        { success: false, error: '统计记录不存在' },
        { status: 404 }
      );
    }

    // 删除统计记录
    db.prepare('DELETE FROM statistics WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: '统计记录删除成功' });
  } catch (error) {
    console.error('删除统计记录失败:', error);
    return NextResponse.json(
      { success: false, error: '删除统计记录失败' },
      { status: 500 }
    );
  }
}