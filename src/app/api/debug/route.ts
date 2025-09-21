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

    return NextResponse.json({
      success: true,
      debug
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