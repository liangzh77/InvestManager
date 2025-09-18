import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json({ success: false, error: '缺少股票代码' }, { status: 400 });
    }

    const price = await getStockPrice(symbol);

    if (price === null) {
      return NextResponse.json({ success: false, error: '无法获取股价数据' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { symbol, price }
    });
  } catch (error) {
    console.error('获取股价失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
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

// 获取股价的核心函数
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

    // 当前价通常在第3个位置 (索引2)
    const currentPrice = parseFloat(data[3]);

    if (isNaN(currentPrice) || currentPrice <= 0) {
      return null;
    }

    return currentPrice;
  } catch (error) {
    console.error(`获取股价失败 ${symbol}:`, error);
    return null;
  }
}

// 批量获取股价的API
export async function PUT(request: NextRequest) {
  try {
    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ success: false, error: '缺少股票代码数组' }, { status: 400 });
    }

    const results: { [key: string]: number | null } = {};

    // 并发获取所有股价
    await Promise.all(symbols.map(async (symbol: string) => {
      try {
        const price = await getStockPrice(symbol);
        results[symbol] = price;
      } catch (error) {
        console.error(`获取股价失败 ${symbol}:`, error);
        results[symbol] = null;
      }
    }));

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('批量获取股价失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}