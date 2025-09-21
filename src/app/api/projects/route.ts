import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, calculateProjectStats } from '@/lib/database';
import { Project } from '@/lib/types';
import { ServerErrorLogger } from '@/utils/serverErrorLogger';

// GET - 获取所有项目
export async function GET() {
  try {
    const db = getDatabase();
    const projects = await db.prepare('SELECT * FROM projects ORDER BY 排序顺序 ASC, 创建时间 DESC').all();

    return NextResponse.json({
      success: true,
      data: projects
    });
  } catch (error) {
    const errorMsg = `获取项目列表失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('获取项目列表错误:', error);
    ServerErrorLogger.addError(errorMsg, '项目API');
    return NextResponse.json(
      { success: false, error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新项目
export async function POST(request: NextRequest) {
  try {
    const data: Partial<Project> = await request.json();


    // 验证必填字段
    if (!data.项目名称 || !data.交易类型 || !data.状态) {
      const errorMsg = `创建项目验证失败: 缺少必填字段 - 项目名称: ${data.项目名称}, 交易类型: ${data.交易类型}, 状态: ${data.状态}`;
      ServerErrorLogger.addError(errorMsg, '项目API');
      return NextResponse.json(
        { success: false, error: '项目名称、交易类型和状态为必填字段' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // 获取当前最大排序顺序
    const maxSortResult = await db.prepare('SELECT MAX(排序顺序) as maxSort FROM projects').get() as { maxSort: number | null };
    const nextSortOrder = (maxSortResult.maxSort || 0) + 1;
    
    const stmt = db.prepare(`
      INSERT INTO projects (
        项目名称, 项目代号, 交易类型, 当前价, 状态, 排序顺序, 创建时间
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = await stmt.run(
      data.项目名称,
      data.项目代号 || null,
      data.交易类型,
      data.当前价 || null,
      data.状态,
      nextSortOrder
    );

    // 获取创建的项目
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      data: project
    });
  } catch (error) {
    const errorMsg = `创建项目失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('创建项目错误:', error);
    ServerErrorLogger.addError(errorMsg, '项目API');
    return NextResponse.json(
      { success: false, error: '创建项目失败' },
      { status: 500 }
    );
  }
}