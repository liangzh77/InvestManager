import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, initializeDatabase, isTursoEnvironment, isVercelEnvironment } from '@/lib/database';

export async function GET() {
  try {
    const debug = {
      environment: {
        VERCEL: !!process.env.VERCEL,
        TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
        TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        isTursoEnvironment,
        isVercelEnvironment
      },
      tables: {} as any
    };

    const db = getDatabase();

    // 检查各个表是否存在和有数据
    try {
      const projects = await db.prepare('SELECT COUNT(*) as count FROM projects').get() as any;
      debug.tables.projects = { exists: true, count: projects?.count || 0 };
    } catch (error) {
      debug.tables.projects = { exists: false, error: (error as Error).message };
    }

    try {
      const transactions = await db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any;
      debug.tables.transactions = { exists: true, count: transactions?.count || 0 };
    } catch (error) {
      debug.tables.transactions = { exists: false, error: (error as Error).message };
    }

    try {
      const overview = await db.prepare('SELECT COUNT(*) as count FROM overview').get() as any;
      debug.tables.overview = { exists: true, count: overview?.count || 0 };
    } catch (error) {
      debug.tables.overview = { exists: false, error: (error as Error).message };
    }

    // 额外测试：尝试执行overview API的关键查询
    let overviewTest = {};
    try {
      // 测试overview表查询
      const existingOverview = await db.prepare('SELECT 总金额 FROM overview WHERE id = 1').get() as any;
      overviewTest = {
        existingOverview: existingOverview,
        保存的总金额: existingOverview?.总金额 || 0,
        step1: 'overview表查询成功'
      };

      // 测试项目统计查询
      const projectStats = await db.prepare(`
        SELECT
          COALESCE(SUM(成本金额), 0) as 总成本金额,
          COALESCE(SUM(当前金额), 0) as 总当前金额,
          COALESCE(SUM(盈亏金额), 0) as 总盈亏金额,
          COUNT(*) as 项目总数,
          COUNT(CASE WHEN 状态 = '进行' THEN 1 END) as 进行中项目,
          COUNT(CASE WHEN 状态 = '完成' THEN 1 END) as 已完成项目
        FROM projects
      `).get() as any;

      overviewTest = {
        ...overviewTest,
        projectStats,
        step2: '项目统计查询成功'
      };

      // 测试交易统计查询
      const recentTransactions = await db.prepare(`
        SELECT COUNT(*) as 交易总数,
          COUNT(CASE WHEN 状态 = '计划' THEN 1 END) as 计划中交易,
          COUNT(CASE WHEN 状态 = '完成' THEN 1 END) as 已完成交易
        FROM transactions
      `).get() as any;

      overviewTest = {
        ...overviewTest,
        recentTransactions,
        step3: '交易统计查询成功'
      };

    } catch (testError) {
      overviewTest = {
        error: (testError as Error).message,
        stack: (testError as Error).stack
      };
    }

    return NextResponse.json({
      success: true,
      debug,
      overviewTest
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('手动初始化数据库...');

    // 先检查当前环境
    const envInfo = {
      VERCEL: !!process.env.VERCEL,
      TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
      isTursoEnvironment,
      isVercelEnvironment
    };

    console.log('环境信息:', envInfo);

    await initializeDatabase();

    return NextResponse.json({
      success: true,
      message: '数据库初始化完成',
      environment: envInfo
    });
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack,
      environment: {
        VERCEL: !!process.env.VERCEL,
        TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
        TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
        isTursoEnvironment,
        isVercelEnvironment
      }
    }, { status: 500 });
  }
}