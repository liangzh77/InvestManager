import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { FundNavRecord } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    // 检查基金是否存在
    const fund = db.prepare('SELECT * FROM funds WHERE id = ?').get(id);
    if (!fund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    const navRecords = db.prepare('SELECT * FROM fund_nav_records WHERE 基金ID = ? ORDER BY 时间 DESC').all(id) as FundNavRecord[];

    return NextResponse.json({ success: true, data: navRecords });
  } catch (error) {
    console.error('获取基金净值记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取基金净值记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 时间, 累计净值 } = body;

    if (!时间 || !累计净值) {
      return NextResponse.json(
        { success: false, error: '时间和累计净值不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 检查基金是否存在
    const fund = db.prepare('SELECT * FROM funds WHERE id = ?').get(id);
    if (!fund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO fund_nav_records (基金ID, 时间, 累计净值)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(id, 时间, 累计净值);

    const newNavRecord = db.prepare('SELECT * FROM fund_nav_records WHERE id = ?').get(result.lastInsertRowid) as FundNavRecord;

    return NextResponse.json({ success: true, data: newNavRecord });
  } catch (error) {
    console.error('创建基金净值记录失败:', error);
    return NextResponse.json(
      { success: false, error: '创建基金净值记录失败' },
      { status: 500 }
    );
  }
}