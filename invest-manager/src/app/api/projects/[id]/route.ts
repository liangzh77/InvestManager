import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as Project;

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取项目详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 检查项目是否存在
    const existingProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as Project;
    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

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
      UPDATE projects SET
        项目名称 = ?, 项目代号 = ?, 成本价 = ?, 当前价 = ?,
        股数 = ?, 成本金额 = ?, 当前金额 = ?, 盈亏金额 = ?, 项目盈亏率 = ?
      WHERE id = ?
    `);

    stmt.run(
      项目名称,
      项目代号,
      成本价,
      当前价,
      股数,
      projectData.成本金额,
      projectData.当前金额,
      projectData.盈亏金额,
      projectData.项目盈亏率,
      params.id
    );

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as Project;

    return NextResponse.json({ success: true, data: updatedProject });
  } catch (error) {
    console.error('更新项目失败:', error);
    return NextResponse.json(
      { success: false, error: '更新项目失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();

    // 检查项目是否存在
    const existingProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as Project;
    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 删除相关交易记录
    db.prepare('DELETE FROM transactions WHERE 项目ID = ?').run(params.id);

    // 删除项目
    db.prepare('DELETE FROM projects WHERE id = ?').run(params.id);

    return NextResponse.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    console.error('删除项目失败:', error);
    return NextResponse.json(
      { success: false, error: '删除项目失败' },
      { status: 500 }
    );
  }
}