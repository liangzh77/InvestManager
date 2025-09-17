import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Transaction } from '@/lib/types';
import { calculateTransactionMetrics } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const 项目ID = searchParams.get('项目ID');

    const db = getDatabase();
    let query = 'SELECT * FROM transactions';
    let params: any[] = [];

    if (项目ID) {
      query += ' WHERE 项目ID = ?';
      params.push(项目ID);
    }

    query += ' ORDER BY 创建时间 DESC';

    const transactions = db.prepare(query).all(...params) as Transaction[];

    // 获取总览表数据以计算最大亏损率和最大盈利率
    const overviewData = db.prepare('SELECT * FROM overview ORDER BY 更新时间 DESC LIMIT 1').get() as any;
    if (!overviewData) {
      return NextResponse.json(
        { success: false, error: '总览数据不存在' },
        { status: 500 }
      );
    }
    const 自主总金额 = overviewData.自主总金额 || 0;

    // 为每个交易计算相关指标
    const transactionsWithMetrics = transactions.map(transaction => {
      // 获取项目当前价
      const project = db.prepare('SELECT 当前价 FROM projects WHERE id = ?').get(transaction.项目ID) as any;
      const 项目当前价 = project?.当前价 || 0;

      // 计算距离
      let 距离 = 0;
      if (项目当前价 && transaction.交易价) {
        if (transaction.警告方向 === '向下') {
          距离 = -((transaction.交易价 - 项目当前价) / 项目当前价) * 100;
        } else if (transaction.警告方向 === '向上') {
          距离 = ((transaction.交易价 - 项目当前价) / 项目当前价) * 100;
        }
      }

      // 计算最大亏损额和最大盈利额
      let 最大亏损额 = 0;
      let 最大盈利额 = 0;

      if (transaction.交易价 && transaction.股数) {
        if (transaction.止损价) {
          最大亏损额 = (transaction.止损价 - transaction.交易价) * transaction.股数;
        }
        if (transaction.止盈价) {
          最大盈利额 = (transaction.止盈价 - transaction.交易价) * transaction.股数;
        }
      }

      const 最大亏损率 = 自主总金额 > 0 ? (最大亏损额 / 自主总金额) * 100 : 0;
      const 最大盈利率 = 自主总金额 > 0 ? (最大盈利额 / 自主总金额) * 100 : 0;

      return {
        ...transaction,
        距离,
        最大亏损额,
        最大亏损率,
        最大盈利额,
        最大盈利率
      };
    });

    return NextResponse.json({ success: true, data: transactionsWithMetrics });
  } catch (error) {
    console.error('获取交易列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取交易列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      项目ID,
      项目名称,
      状态,
      交易名称,
      交易类型,
      警告方向,
      交易价,
      止盈价,
      止损价,
      股数,
      创建时间,
      交易时间
    } = body;

    if (!项目ID || !状态) {
      return NextResponse.json(
        { success: false, error: '项目ID和状态不能为空' },
        { status: 400 }
      );
    }

    if (!交易价 || !股数) {
      return NextResponse.json(
        { success: false, error: '交易价和股数不能为空' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 检查项目是否存在并获取项目信息
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(项目ID) as any;
    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 获取总览数据以计算相对比率
    const overviewData = db.prepare('SELECT * FROM overview ORDER BY 更新时间 DESC LIMIT 1').get() as any;
    if (!overviewData) {
      return NextResponse.json(
        { success: false, error: '总览数据不存在' },
        { status: 500 }
      );
    }
    const 自主总金额 = overviewData.自主总金额 || 0;

    console.log('交易创建 - 总览数据:', overviewData);
    console.log('交易创建 - 自主总金额:', 自主总金额);

    // 计算所有相关指标
    const calculatedMetrics = calculateTransactionMetrics(
      交易价,
      止盈价,
      止损价,
      股数,
      交易类型,
      project.当前价,
      警告方向,
      自主总金额
    );

    const stmt = db.prepare(`
      INSERT INTO transactions (
        项目ID, 项目名称, 状态, 交易名称, 交易类型, 警告方向,
        交易价, 止盈价, 止损价, 股数, 仓位, 交易金额,
        距离, 最大亏损额, 最大亏损率, 最大盈利额, 最大盈利率,
        创建时间, 交易时间
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      项目ID,
      项目名称,
      状态,
      交易名称,
      交易类型,
      警告方向,
      交易价,
      止盈价,
      止损价,
      股数,
      calculatedMetrics.仓位,
      calculatedMetrics.交易金额,
      calculatedMetrics.距离,
      calculatedMetrics.最大亏损额,
      calculatedMetrics.最大亏损率,
      calculatedMetrics.最大盈利额,
      calculatedMetrics.最大盈利率,
      创建时间 || new Date().toISOString(),
      交易时间
    );

    const newTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as Transaction;

    return NextResponse.json({ success: true, data: newTransaction });
  } catch (error) {
    console.error('创建交易失败:', error);
    return NextResponse.json(
      { success: false, error: '创建交易失败' },
      { status: 500 }
    );
  }
}