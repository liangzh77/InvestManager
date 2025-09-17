export interface Project {
  id?: number;
  项目名称: string;
  项目代号?: string;
  交易类型?: '做多' | '做空';
  成本价?: number;
  当前价?: number;
  股数?: number;
  仓位?: number;
  成本金额?: number;
  当前金额?: number;
  盈亏金额?: number;
  项目盈亏率?: number;
  自主盈亏率?: number;
  创建时间?: string;
  完成时间?: string;
}

export interface Transaction {
  id?: number;
  项目ID?: number;
  项目名称?: string;
  状态: '计划' | '完成';
  交易名称?: string;
  交易类型?: '做多' | '做空' | '多头平仓' | '空头平仓';
  警告方向?: '向上' | '向下';
  距离?: number;
  交易价?: number;
  止盈价?: number;
  止损价?: number;
  股数?: number;
  仓位?: number;
  交易金额?: number;
  最大亏损额?: number;
  最大亏损率?: number;
  最大盈利额?: number;
  最大盈利率?: number;
  创建时间?: string;
  交易时间?: string;
}

export interface Fund {
  id?: number;
  基金名称: string;
  成本金额?: number;
  当前金额?: number;
}

export interface FundNavRecord {
  id?: number;
  基金ID: number;
  时间: string;
  累计净值: number;
}

export interface FundTransaction {
  id?: number;
  基金ID: number;
  交易类型: string;
  交易净值: number;
  交易金额: number;
  交易时间: string;
}

export interface Statistics {
  id?: number;
  年月: string;
  类型: string;
  自主盈亏金额?: number;
  自主盈亏率?: number;
  基金盈亏金额?: number;
  基金盈亏率?: number;
  总盈亏金额?: number;
  总盈亏率?: number;
}

export interface Overview {
  id?: number;
  自主总金额?: number;
  自主成本金额?: number;
  自主持仓金额?: number;
  自主盈亏金额?: number;
  自主盈亏率?: number;
  自主仓位?: number;
  基金总金额?: number;
  基金盈亏金额?: number;
  基金盈亏率?: number;
  总投资金额?: number;
  总盈亏金额?: number;
  总盈亏率?: number;
  更新时间?: string;
}