// 数据库表类型定义

export interface Project {
  id?: number;
  项目名称: string;
  项目代号?: string;
  交易类型: '做多' | '做空';
  成本价?: number;
  当前价?: number;
  股数?: number;
  仓位?: number;
  成本金额?: number;
  当前金额?: number;
  盈亏金额?: number;
  项目盈亏率?: number;
  自主盈亏率?: number;
  状态: '进行' | '完成';
  创建时间?: string;
  完成时间?: string;
}

export interface Transaction {
  id?: number;
  项目ID?: number;
  项目名称?: string;
  状态: '计划' | '完成';
  交易名称?: string;
  交易类型: '做多' | '做空' | '多头平仓' | '空头平仓';
  警告方向?: '向上' | '向下';
  距离?: number;
  交易价?: number;
  股数?: number;
  仓位?: number;
  交易金额?: number;
  创建时间?: string;
  交易时间?: string;
}

export interface Overview {
  id?: number;
  总金额?: number;
  成本金额?: number;
  持仓金额?: number;
  盈亏金额?: number;
  盈亏率?: number;
  仓位?: number;
  更新时间?: string;
}

export interface Statistics {
  id?: number;
  项目ID?: number;
  盈亏金额?: number;
  盈亏率?: number;
  更新时间?: string;
}