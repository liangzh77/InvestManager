import { NextResponse } from 'next/server';
import { ServerErrorLogger } from '@/utils/serverErrorLogger';

export async function GET() {
  try {
    const errors = ServerErrorLogger.getErrors();
    return NextResponse.json({
      success: true,
      data: errors
    });
  } catch (error) {
    console.error('获取服务端错误日志失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取错误日志失败'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    ServerErrorLogger.clearErrors();
    return NextResponse.json({
      success: true,
      message: '服务端错误日志已清空'
    });
  } catch (error) {
    console.error('清空服务端错误日志失败:', error);
    return NextResponse.json({
      success: false,
      error: '清空错误日志失败'
    }, { status: 500 });
  }
}