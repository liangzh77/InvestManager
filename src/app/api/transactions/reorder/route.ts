import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, isTursoEnvironment, isVercelEnvironment } from '@/lib/database';

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

    if (isTursoEnvironment || isVercelEnvironment) {
      // 异步数据库：Turso 或 Vercel Postgres
      for (const transaction of transactions) {
        await db.prepare(
          'UPDATE transactions SET 排序顺序 = ? WHERE id = ? AND 项目ID = ?'
        ).run(transaction.排序顺序, transaction.id, projectId);
      }
    } else {
      // 同步数据库：本地 SQLite (better-sqlite3)
      const updateTransaction = (db as any).transaction(() => {
        const updateStmt = db.prepare('UPDATE transactions SET 排序顺序 = ? WHERE id = ? AND 项目ID = ?');
        for (const transaction of transactions) {
          updateStmt.run(transaction.排序顺序, transaction.id, projectId);
        }
      });
      updateTransaction();
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
