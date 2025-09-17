import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Fund } from '@/lib/types';

export async function GET() {
  try {
    const db = getDatabase();
    const funds = db.prepare('SELECT * FROM funds ORDER BY id DESC').all() as Fund[];

    return NextResponse.json({ success: true, data: funds });
  } catch (error) {
    console.error('获取基金列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取基金列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 基金名称, 成本金额, 当前金额 } = body;

    if (!基金名称) {
      return NextResponse.json(
        { success: false, error: '基金名称不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO funds (基金名称, 成本金额, 当前金额)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(基金名称, 成本金额, 当前金额);

    const newFund = db.prepare('SELECT * FROM funds WHERE id = ?').get(result.lastInsertRowid) as Fund;

    return NextResponse.json({ success: true, data: newFund });
  } catch (error) {
    console.error('创建基金失败:', error);
    return NextResponse.json(
      { success: false, error: '创建基金失败' },
      { status: 500 }
    );
  }
}