import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/utils';

export async function GET() {
  try {
    const db = getDatabase();
    const projects = db.prepare('SELECT * FROM projects ORDER BY 创建时间 DESC').all() as Project[];

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 项目名称, 项目代号, 成本价, 当前价, 股数 } = body;

    if (!项目名称) {
      return NextResponse.json(
        { success: false, error: '项目名称不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 计算相关指标
    const 成本金额 = (成本价 || 0) * (股数 || 0);
    const projectData: Partial<Project> = {
      项目名称,
      项目代号,
      成本价,
      当前价,
      股数,
      成本金额
    };

    // 计算当前金额、盈亏等指标
    const metrics = calculateProjectMetrics(projectData as Project);
    Object.assign(projectData, metrics);

    const stmt = db.prepare(`
      INSERT INTO projects (
        项目名称, 项目代号, 成本价, 当前价, 股数,
        成本金额, 当前金额, 盈亏金额, 项目盈亏率
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      项目名称,
      项目代号,
      成本价,
      当前价,
      股数,
      projectData.成本金额,
      projectData.当前金额,
      projectData.盈亏金额,
      projectData.项目盈亏率
    );

    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project;

    return NextResponse.json({ success: true, data: newProject });
  } catch (error) {
    console.error('创建项目失败:', error);
    return NextResponse.json(
      { success: false, error: '创建项目失败' },
      { status: 500 }
    );
  }
}