import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { FundTransaction } from '@/lib/types';

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

    const fundTransactions = db.prepare('SELECT * FROM fund_transactions WHERE 基金ID = ? ORDER BY 交易时间 DESC').all(id) as FundTransaction[];

    return NextResponse.json({ success: true, data: fundTransactions });
  } catch (error) {
    console.error('获取基金交易记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取基金交易记录失败' },
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
    const { 交易类型, 交易净值, 交易金额, 交易时间 } = body;

    if (!交易类型 || !交易净值 || !交易金额 || !交易时间) {
      return NextResponse.json(
        { success: false, error: '交易类型、交易净值、交易金额和交易时间不能为空' },
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
      INSERT INTO fund_transactions (基金ID, 交易类型, 交易净值, 交易金额, 交易时间)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(id, 交易类型, 交易净值, 交易金额, 交易时间);

    const newFundTransaction = db.prepare('SELECT * FROM fund_transactions WHERE id = ?').get(result.lastInsertRowid) as FundTransaction;

    return NextResponse.json({ success: true, data: newFundTransaction });
  } catch (error) {
    console.error('创建基金交易记录失败:', error);
    return NextResponse.json(
      { success: false, error: '创建基金交易记录失败' },
      { status: 500 }
    );
  }
}