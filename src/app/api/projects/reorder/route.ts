import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

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

    // 使用事务确保数据一致性
    const updateTransaction = db.transaction(() => {
      projects.forEach((project: { id: number; 排序顺序: number }) => {
        db.prepare('UPDATE projects SET 排序顺序 = ? WHERE id = ?').run(
          project.排序顺序,
          project.id
        );
      });
    });

    updateTransaction();

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
