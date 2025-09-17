import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, calculateProjectStats } from '@/lib/db';
import { Project } from '@/lib/types';

// GET - 获取单个项目
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的项目ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('获取项目错误:', error);
    return NextResponse.json(
      { success: false, error: '获取项目失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新项目
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的项目ID' },
        { status: 400 }
      );
    }

    const data: Partial<Project> = await request.json();
    const db = getDatabase();

    // 检查项目是否存在
    const existingProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 更新项目基本信息
    const stmt = db.prepare(`
      UPDATE projects SET
        项目名称 = COALESCE(?, 项目名称),
        项目代号 = COALESCE(?, 项目代号),
        交易类型 = COALESCE(?, 交易类型),
        当前价 = COALESCE(?, 当前价),
        状态 = COALESCE(?, 状态),
        完成时间 = CASE WHEN ? = '完成' THEN CURRENT_TIMESTAMP ELSE 完成时间 END
      WHERE id = ?
    `);

    stmt.run(
      data.项目名称 || null,
      data.项目代号 || null,
      data.交易类型 || null,
      data.当前价 || null,
      data.状态 || null,
      data.状态,
      id
    );

    // 重新计算项目统计数据
    const stats = calculateProjectStats(id, db);

    // 更新计算字段
    const updateStatsStmt = db.prepare(`
      UPDATE projects SET
        成本价 = ?,
        股数 = ?,
        仓位 = ?,
        成本金额 = ?,
        当前金额 = ?,
        盈亏金额 = ?,
        项目盈亏率 = ?,
        自主盈亏率 = ?
      WHERE id = ?
    `);

    updateStatsStmt.run(
      stats.成本价,
      stats.股数,
      stats.仓位,
      stats.成本金额,
      stats.当前金额,
      stats.盈亏金额,
      stats.项目盈亏率,
      stats.自主盈亏率,
      id
    );

    // 获取更新后的项目
    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    return NextResponse.json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    console.error('更新项目错误:', error);
    return NextResponse.json(
      { success: false, error: '更新项目失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的项目ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 检查项目是否存在
    const existingProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 使用事务确保数据一致性
    const deleteTransaction = db.transaction(() => {
      // 删除相关的交易记录
      db.prepare('DELETE FROM transactions WHERE 项目ID = ?').run(id);

      // 删除相关的统计记录
      db.prepare('DELETE FROM statistics WHERE 项目ID = ?').run(id);

      // 删除项目
      db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    });

    deleteTransaction();

    return NextResponse.json({
      success: true,
      message: '项目删除成功'
    });
  } catch (error) {
    console.error('删除项目错误:', error);
    return NextResponse.json(
      { success: false, error: '删除项目失败' },
      { status: 500 }
    );
  }
}