import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { projectId, transactions } = await request.json();

    if (!projectId || !Array.isArray(transactions)) {
      return NextResponse.json(
        { success: false, error: '无效的参数' },
        { status: 400 }
      );
    }

    // 获取数据库连接
    const db = getDatabase();

    // 更新每个交易的排序顺序
    for (const transaction of transactions) {
      db.prepare(
        'UPDATE transactions SET 排序顺序 = ? WHERE id = ? AND 项目ID = ?'
      ).run(transaction.排序顺序, transaction.id, projectId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新交易排序失败:', error);
    return NextResponse.json(
      { success: false, error: '更新排序失败' },
      { status: 500 }
    );
  }
}
