import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Fund } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const fund = db.prepare('SELECT * FROM funds WHERE id = ?').get(id) as Fund;

    if (!fund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: fund });
  } catch (error) {
    console.error('获取基金详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取基金详情失败' },
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
    const { 基金名称, 成本金额, 当前金额 } = body;

    if (!基金名称) {
      return NextResponse.json(
        { success: false, error: '基金名称不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 检查基金是否存在
    const existingFund = db.prepare('SELECT * FROM funds WHERE id = ?').get(id) as Fund;
    if (!existingFund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    const stmt = db.prepare(`
      UPDATE funds SET 基金名称 = ?, 成本金额 = ?, 当前金额 = ?
      WHERE id = ?
    `);

    stmt.run(基金名称, 成本金额, 当前金额, id);

    const updatedFund = db.prepare('SELECT * FROM funds WHERE id = ?').get(id) as Fund;

    return NextResponse.json({ success: true, data: updatedFund });
  } catch (error) {
    console.error('更新基金失败:', error);
    return NextResponse.json(
      { success: false, error: '更新基金失败' },
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

    // 检查基金是否存在
    const existingFund = db.prepare('SELECT * FROM funds WHERE id = ?').get(id) as Fund;
    if (!existingFund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    // 删除相关记录
    db.prepare('DELETE FROM fund_nav_records WHERE 基金ID = ?').run(id);
    db.prepare('DELETE FROM fund_transactions WHERE 基金ID = ?').run(id);

    // 删除基金
    db.prepare('DELETE FROM funds WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: '基金删除成功' });
  } catch (error) {
    console.error('删除基金失败:', error);
    return NextResponse.json(
      { success: false, error: '删除基金失败' },
      { status: 500 }
    );
  }
}