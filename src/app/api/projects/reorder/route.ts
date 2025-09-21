import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, isTursoEnvironment, isVercelEnvironment } from '@/lib/database';

// POST - 更新项目排序
export async function POST(request: NextRequest) {
  try {
    const { projects } = await request.json();

    if (!Array.isArray(projects)) {
      return NextResponse.json(
        { success: false, error: '项目数据格式错误' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    if (isTursoEnvironment || isVercelEnvironment) {
      // 异步数据库：Turso 或 Vercel Postgres
      for (const project of projects as { id: number; 排序顺序: number }[]) {
        await db.prepare('UPDATE projects SET 排序顺序 = ? WHERE id = ?').run(
          project.排序顺序,
          project.id
        );
      }
    } else {
      // 同步数据库：本地 SQLite (better-sqlite3)
      const updateTransaction = db.transaction(() => {
        const updateStmt = db.prepare('UPDATE projects SET 排序顺序 = ? WHERE id = ?');
        for (const project of projects as { id: number; 排序顺序: number }[]) {
          updateStmt.run(project.排序顺序, project.id);
        }
      });
      updateTransaction();
    }

    return NextResponse.json({
      success: true,
      message: '项目排序更新成功'
    });
  } catch (error) {
    console.error('更新项目排序错误:', error);
    return NextResponse.json(
      { success: false, error: '更新项目排序失败' },
      { status: 500 }
    );
  }
}
