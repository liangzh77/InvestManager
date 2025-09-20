import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { ServerErrorLogger } from '@/utils/serverErrorLogger';

const DB_PATH = path.join(process.cwd(), 'data', 'investment.db');

export async function POST(request: NextRequest) {
  let db;

  try {
    // 打开数据库连接
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    // 获取所有进行中的项目
    const activeProjects = await db.all(`
      SELECT id, 项目名称, 项目代号
      FROM projects
      WHERE 状态 = '进行'
    `);

    if (activeProjects.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: '没有进行中的项目需要更新价格' }
      });
    }

    const results: { [key: string]: { success: boolean, price?: number, error?: string } } = {};

    // 为每个项目获取股价并更新数据库
    for (const project of activeProjects) {
      const symbol = project.项目代号;

      if (!symbol) {
        const errorMsg = `项目 ${project.项目名称} 缺少股票代码`;
        ServerErrorLogger.addError(errorMsg, '股价更新');
        results[project.项目名称] = { success: false, error: '缺少股票代码' };
        continue;
      }

      try {
        // 调用股价获取函数
        const price = await getStockPrice(symbol);

        if (price === null) {
          const errorMsg = `获取股价失败: ${project.项目名称} (${symbol}) - 无法从API获取有效股价数据`;
          console.log(`[股价更新失败] ${project.项目名称} (${symbol}): 无法获取股价`);
          ServerErrorLogger.addError(errorMsg, '股价更新');
          results[project.项目名称] = { success: false, error: '无法获取股价' };
          continue;
        }

        // 更新数据库中的当前价
        await db.run(`
          UPDATE projects
          SET 当前价 = ?
          WHERE id = ?
        `, [price, project.id]);

        // 打印股价到终端用于调试
        console.log(`[股价更新] ${project.项目名称} (${symbol}): ${price}`);

        results[project.项目名称] = { success: true, price };

      } catch (error) {
        const errorMsg = `更新项目 ${project.项目名称} (${symbol}) 价格失败: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`更新项目 ${project.项目名称} 价格失败:`, error);
        ServerErrorLogger.addError(errorMsg, '股价更新');
        results[project.项目名称] = { success: false, error: '更新失败' };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        updated: activeProjects.length,
        results
      }
    });

  } catch (error) {
    const errorMsg = `批量更新股价失败: ${error instanceof Error ? error.message : String(error)}`;
    console.error('更新价格失败:', error);
    ServerErrorLogger.addError(errorMsg, '股价更新');
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  } finally {
    if (db) {
      await db.close();
    }
  }
}

// 转换股票代码格式到腾讯财经API格式
function convertSymbolToTencentFormat(symbol: string): string {
  // HK.9992 -> hk09992
  if (symbol.startsWith('HK.')) {
    const code = symbol.substring(3);
    return 'hk' + code.padStart(5, '0');
  }

  // HSTECH -> hkHSTECH (恒生科技指数)
  if (symbol === 'HSTECH') {
    return 'hk' + symbol;
  }

  // 300866.SZ -> sz300866, 002594.SZ -> sz002594
  if (symbol.endsWith('.SZ')) {
    const code = symbol.replace('.SZ', '');
    return 'sz' + code;
  }

  // TSLA -> usTSLA, NDX -> usNDX
  if (symbol.length <= 4 && !symbol.includes('.')) {
    return 'us' + symbol;
  }

  // TSM -> usTSM, NDX -> usNDX
  if (symbol === 'TSM' || symbol === 'NDX') {
    return 'us' + symbol;
  }

  // 其他情况直接返回原代码
  return symbol;
}

// 获取股价的核心函数（与stock-price API相同）
async function getStockPrice(symbol: string): Promise<number | null> {
  try {
    // 转换代码格式
    const tencentSymbol = convertSymbolToTencentFormat(symbol);
    console.log(`Converting ${symbol} to ${tencentSymbol}`);

    // 腾讯财经API
    const response = await fetch(`https://qt.gtimg.cn/q=${tencentSymbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();

    // 检查是否返回无匹配数据
    if (text.includes('v_pv_none_match')) {
      return null;
    }

    // 解析腾讯财经返回的数据格式
    // 格式: v_symbol="数据~字段1~字段2~当前价~...";
    const match = text.match(/v_[^=]+="([^"]+)"/);
    if (!match) {
      return null;
    }

    const data = match[1].split('~');

    // 当前价通常在第3个位置 (索引3)
    const currentPrice = parseFloat(data[3]);

    if (isNaN(currentPrice) || currentPrice <= 0) {
      return null;
    }

    return currentPrice;
  } catch (error) {
    const errorMsg = `获取股价API调用失败 ${symbol}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`获取股价失败 ${symbol}:`, error);
    ServerErrorLogger.addError(errorMsg, '股价API');
    return null;
  }
}