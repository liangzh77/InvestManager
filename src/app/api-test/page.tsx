'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ApiTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleApiCall = async (url: string, method: string = 'GET', body?: any) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      let data;

      // 首先获取响应文本，然后尝试解析JSON
      const responseText = await response.text();

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // 如果无法解析JSON，返回原始文本
        data = { error: '无法解析响应JSON', rawResponse: responseText };
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        url,
        method,
        requestBody: body,
        data,
        timestamp: new Date().toISOString(),
        success: response.ok
      });
    } catch (error) {
      setResult({
        error: `网络错误: ${error.message}`,
        url,
        method,
        requestBody: body,
        timestamp: new Date().toISOString(),
        success: false
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API 测试工具</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：API测试区域 */}
          <div className="space-y-6">
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-6 pr-4">
                {/* 项目管理API */}
                <ProjectApiTest onApiCall={handleApiCall} />

                {/* 交易管理API */}
                <TransactionApiTest onApiCall={handleApiCall} />

                {/* 基金管理API */}
                <FundApiTest onApiCall={handleApiCall} />

                {/* 统计API */}
                <StatisticsApiTest onApiCall={handleApiCall} />

                {/* 总览API */}
                <OverviewApiTest onApiCall={handleApiCall} />
              </div>
            </ScrollArea>
          </div>

          {/* 右侧：结果显示区域 */}
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-120px)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>API 返回结果</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : result ? (
                    <div className="space-y-4">
                      {/* 请求信息 */}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-800">请求:</span>
                          <span className="text-blue-600">{result.method || 'GET'}</span>
                          <span className="text-blue-600 text-sm">{result.url}</span>
                        </div>
                        {result.requestBody && (
                          <div className="mt-2">
                            <span className="text-sm text-blue-700">请求体:</span>
                            <pre className="mt-1 p-2 bg-blue-100 rounded text-xs overflow-auto">
                              {JSON.stringify(result.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* 响应状态 */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">响应状态:</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          result.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status ? `${result.status} ${result.statusText}` : '网络错误'}
                        </span>
                      </div>

                      {/* 时间戳 */}
                      {result.timestamp && (
                        <div className="text-sm text-gray-500">
                          时间: {new Date(result.timestamp).toLocaleString()}
                        </div>
                      )}

                      <Separator />

                      {/* 错误详情 */}
                      {!result.success && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <Label className="font-semibold text-red-800">错误详情:</Label>
                          {result.error && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-red-700 text-sm">
                              {result.error}
                            </div>
                          )}
                          {result.data && result.data.error && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-red-700 text-sm">
                              服务器错误: {result.data.error}
                            </div>
                          )}
                          {result.data && result.data.rawResponse && (
                            <div className="mt-2">
                              <span className="text-sm text-red-700">原始响应:</span>
                              <pre className="mt-1 p-2 bg-red-100 rounded text-xs overflow-auto text-red-600">
                                {result.data.rawResponse}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 响应数据 */}
                      <div>
                        <Label className="font-semibold">
                          {result.success ? '响应数据:' : '完整响应:'}
                        </Label>
                        <pre className={`mt-2 p-4 rounded-lg text-sm overflow-auto ${
                          result.success ? 'bg-green-50 border border-green-200' : 'bg-gray-100'
                        }`}>
                          {JSON.stringify(result.data || result.error || result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      选择一个API进行测试
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// 项目管理API测试组件
function ProjectApiTest({ onApiCall }: { onApiCall: (url: string, method?: string, body?: any) => void }) {
  const [projectData, setProjectData] = useState({
    项目名称: '',
    项目代号: '',
    交易类型: '',
    当前价: '',
    创建时间: '',
    完成时间: ''
  });
  const [projectId, setProjectId] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>项目管理 API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 获取项目列表 */}
        <div>
          <Button
            onClick={() => onApiCall('/api/projects')}
            className="w-full"
          >
            获取所有项目 (GET /api/projects)
          </Button>
        </div>

        <Separator />

        {/* 创建项目 */}
        <div className="space-y-3">
          <Label className="font-semibold">创建新项目</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="项目名称"
              value={projectData.项目名称}
              onChange={(e) => setProjectData({...projectData, 项目名称: e.target.value})}
            />
            <Input
              placeholder="项目代号"
              value={projectData.项目代号}
              onChange={(e) => setProjectData({...projectData, 项目代号: e.target.value})}
            />
            <Select value={projectData.交易类型} onValueChange={(value) => setProjectData({...projectData, 交易类型: value})}>
              <SelectTrigger>
                <SelectValue placeholder="交易类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="做多">做多</SelectItem>
                <SelectItem value="做空">做空</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="当前价"
              type="number"
              value={projectData.当前价}
              onChange={(e) => setProjectData({...projectData, 当前价: e.target.value})}
            />
            <Input
              placeholder="创建时间"
              type="datetime-local"
              value={projectData.创建时间}
              onChange={(e) => setProjectData({...projectData, 创建时间: e.target.value})}
            />
            <Input
              placeholder="完成时间"
              type="datetime-local"
              value={projectData.完成时间}
              onChange={(e) => setProjectData({...projectData, 完成时间: e.target.value})}
            />
          </div>
          <Button
            onClick={() => onApiCall('/api/projects', 'POST', {
              ...projectData,
              当前价: projectData.当前价 ? Number(projectData.当前价) : undefined,
              创建时间: projectData.创建时间 || undefined,
              完成时间: projectData.完成时间 || undefined
            })}
            className="w-full"
          >
            创建项目 (POST /api/projects)
          </Button>
        </div>

        <Separator />

        {/* 项目操作 */}
        <div className="space-y-3">
          <Label className="font-semibold">项目操作</Label>
          <Input
            placeholder="项目ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => onApiCall(`/api/projects/${projectId}`)}
              disabled={!projectId}
              size="sm"
            >
              获取详情
            </Button>
            <Button
              onClick={() => onApiCall(`/api/projects/${projectId}`, 'PUT', {
                ...projectData,
                当前价: projectData.当前价 ? Number(projectData.当前价) : undefined,
                完成时间: projectData.完成时间 || undefined
              })}
              disabled={!projectId}
              size="sm"
            >
              更新项目
            </Button>
            <Button
              onClick={() => onApiCall(`/api/projects/${projectId}`, 'DELETE')}
              disabled={!projectId}
              variant="destructive"
              size="sm"
            >
              删除项目
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 交易管理API测试组件
function TransactionApiTest({ onApiCall }: { onApiCall: (url: string, method?: string, body?: any) => void }) {
  const [transactionData, setTransactionData] = useState({
    项目ID: '',
    项目名称: '',
    状态: '',
    交易名称: '',
    交易类型: '',
    警告方向: '',
    交易价: '',
    止盈价: '',
    止损价: '',
    股数: '',
    仓位: '',
    交易金额: '',
    创建时间: '',
    交易时间: ''
  });
  const [transactionId, setTransactionId] = useState('');
  const [queryProjectId, setQueryProjectId] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>交易管理 API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 获取交易列表 */}
        <div className="space-y-2">
          <Input
            placeholder="按项目ID筛选（可选）"
            value={queryProjectId}
            onChange={(e) => setQueryProjectId(e.target.value)}
          />
          <Button
            onClick={() => onApiCall(`/api/transactions${queryProjectId ? `?项目ID=${queryProjectId}` : ''}`)}
            className="w-full"
          >
            获取交易列表 (GET /api/transactions)
          </Button>
        </div>

        <Separator />

        {/* 创建交易 */}
        <div className="space-y-3">
          <Label className="font-semibold">创建新交易</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="项目ID *"
              value={transactionData.项目ID}
              onChange={(e) => setTransactionData({...transactionData, 项目ID: e.target.value})}
            />
            <Input
              placeholder="项目名称"
              value={transactionData.项目名称}
              onChange={(e) => setTransactionData({...transactionData, 项目名称: e.target.value})}
            />
            <Select value={transactionData.状态} onValueChange={(value) => setTransactionData({...transactionData, 状态: value})}>
              <SelectTrigger>
                <SelectValue placeholder="状态 *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="计划">计划</SelectItem>
                <SelectItem value="完成">完成</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="交易名称"
              value={transactionData.交易名称}
              onChange={(e) => setTransactionData({...transactionData, 交易名称: e.target.value})}
            />
            <Select value={transactionData.交易类型} onValueChange={(value) => setTransactionData({...transactionData, 交易类型: value})}>
              <SelectTrigger>
                <SelectValue placeholder="交易类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="做多">做多</SelectItem>
                <SelectItem value="做空">做空</SelectItem>
                <SelectItem value="多头平仓">多头平仓</SelectItem>
                <SelectItem value="空头平仓">空头平仓</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transactionData.警告方向} onValueChange={(value) => setTransactionData({...transactionData, 警告方向: value})}>
              <SelectTrigger>
                <SelectValue placeholder="警告方向" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="向上">向上</SelectItem>
                <SelectItem value="向下">向下</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="交易价 *"
              type="number"
              step="0.01"
              value={transactionData.交易价}
              onChange={(e) => setTransactionData({...transactionData, 交易价: e.target.value})}
            />
            <Input
              placeholder="止盈价"
              type="number"
              step="0.01"
              value={transactionData.止盈价}
              onChange={(e) => setTransactionData({...transactionData, 止盈价: e.target.value})}
            />
            <Input
              placeholder="止损价"
              type="number"
              step="0.01"
              value={transactionData.止损价}
              onChange={(e) => setTransactionData({...transactionData, 止损价: e.target.value})}
            />
            <Input
              placeholder="股数 *"
              type="number"
              value={transactionData.股数}
              onChange={(e) => setTransactionData({...transactionData, 股数: e.target.value})}
            />
            <Input
              placeholder="交易时间"
              type="datetime-local"
              value={transactionData.交易时间}
              onChange={(e) => setTransactionData({...transactionData, 交易时间: e.target.value})}
            />
          </div>
          <div className="text-sm text-blue-600 p-3 bg-blue-50 rounded-lg">
            <strong>自动计算字段：</strong>距离、仓位、交易金额、最大亏损额、最大亏损率、最大盈利额、最大盈利率
            <br />
            <strong>必填字段：</strong>带 * 的字段为必填
          </div>
          <Button
            onClick={() => onApiCall('/api/transactions', 'POST', {
              ...transactionData,
              项目ID: transactionData.项目ID ? Number(transactionData.项目ID) : undefined,
              交易价: transactionData.交易价 ? Number(transactionData.交易价) : undefined,
              止盈价: transactionData.止盈价 ? Number(transactionData.止盈价) : undefined,
              止损价: transactionData.止损价 ? Number(transactionData.止损价) : undefined,
              股数: transactionData.股数 ? Number(transactionData.股数) : undefined,
              仓位: transactionData.仓位 ? Number(transactionData.仓位) : undefined,
              交易金额: transactionData.交易金额 ? Number(transactionData.交易金额) : undefined,
              交易时间: transactionData.交易时间 || undefined
            })}
            className="w-full"
          >
            创建交易 (POST /api/transactions)
          </Button>
        </div>

        <Separator />

        {/* 交易操作 */}
        <div className="space-y-3">
          <Label className="font-semibold">交易操作</Label>
          <Input
            placeholder="交易ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => onApiCall(`/api/transactions/${transactionId}`)}
              disabled={!transactionId}
              size="sm"
            >
              获取详情
            </Button>
            <Button
              onClick={() => onApiCall(`/api/transactions/${transactionId}`, 'PUT', {
                ...transactionData,
                项目ID: transactionData.项目ID ? Number(transactionData.项目ID) : undefined,
                交易价: transactionData.交易价 ? Number(transactionData.交易价) : undefined,
                止盈价: transactionData.止盈价 ? Number(transactionData.止盈价) : undefined,
                止损价: transactionData.止损价 ? Number(transactionData.止损价) : undefined,
                股数: transactionData.股数 ? Number(transactionData.股数) : undefined,
                仓位: transactionData.仓位 ? Number(transactionData.仓位) : undefined,
                交易金额: transactionData.交易金额 ? Number(transactionData.交易金额) : undefined,
                交易时间: transactionData.交易时间 || undefined
              })}
              disabled={!transactionId}
              size="sm"
            >
              更新交易
            </Button>
            <Button
              onClick={() => onApiCall(`/api/transactions/${transactionId}`, 'DELETE')}
              disabled={!transactionId}
              variant="destructive"
              size="sm"
            >
              删除交易
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 基金管理API测试组件
function FundApiTest({ onApiCall }: { onApiCall: (url: string, method?: string, body?: any) => void }) {
  const [fundData, setFundData] = useState({
    基金名称: '',
    成本金额: '',
    当前金额: ''
  });
  const [fundId, setFundId] = useState('');
  const [navRecord, setNavRecord] = useState({
    时间: '',
    累计净值: ''
  });
  const [fundTransaction, setFundTransaction] = useState({
    交易类型: '',
    交易净值: '',
    交易金额: '',
    交易时间: ''
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>基金管理 API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 获取基金列表 */}
        <div>
          <Button
            onClick={() => onApiCall('/api/funds')}
            className="w-full"
          >
            获取所有基金 (GET /api/funds)
          </Button>
        </div>

        <Separator />

        {/* 创建基金 */}
        <div className="space-y-3">
          <Label className="font-semibold">创建新基金</Label>
          <div className="grid grid-cols-1 gap-2">
            <Input
              placeholder="基金名称"
              value={fundData.基金名称}
              onChange={(e) => setFundData({...fundData, 基金名称: e.target.value})}
            />
            <Input
              placeholder="成本金额"
              type="number"
              value={fundData.成本金额}
              onChange={(e) => setFundData({...fundData, 成本金额: e.target.value})}
            />
            <Input
              placeholder="当前金额"
              type="number"
              value={fundData.当前金额}
              onChange={(e) => setFundData({...fundData, 当前金额: e.target.value})}
            />
          </div>
          <Button
            onClick={() => onApiCall('/api/funds', 'POST', {
              ...fundData,
              成本金额: fundData.成本金额 ? Number(fundData.成本金额) : undefined,
              当前金额: fundData.当前金额 ? Number(fundData.当前金额) : undefined
            })}
            className="w-full"
          >
            创建基金 (POST /api/funds)
          </Button>
        </div>

        <Separator />

        {/* 基金操作 */}
        <div className="space-y-3">
          <Label className="font-semibold">基金操作</Label>
          <Input
            placeholder="基金ID"
            value={fundId}
            onChange={(e) => setFundId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onApiCall(`/api/funds/${fundId}`)}
              disabled={!fundId}
              size="sm"
            >
              获取详情
            </Button>
            <Button
              onClick={() => onApiCall(`/api/funds/${fundId}`, 'PUT', {
                ...fundData,
                成本金额: fundData.成本金额 ? Number(fundData.成本金额) : undefined,
                当前金额: fundData.当前金额 ? Number(fundData.当前金额) : undefined
              })}
              disabled={!fundId}
              size="sm"
            >
              更新基金
            </Button>
            <Button
              onClick={() => onApiCall(`/api/funds/${fundId}`, 'DELETE')}
              disabled={!fundId}
              variant="destructive"
              size="sm"
            >
              删除基金
            </Button>
            <Button
              onClick={() => onApiCall(`/api/funds/${fundId}/nav-records`)}
              disabled={!fundId}
              size="sm"
            >
              净值记录
            </Button>
          </div>
        </div>

        <Separator />

        {/* 净值记录 */}
        <div className="space-y-3">
          <Label className="font-semibold">添加净值记录</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="时间"
              type="datetime-local"
              value={navRecord.时间}
              onChange={(e) => setNavRecord({...navRecord, 时间: e.target.value})}
            />
            <Input
              placeholder="累计净值"
              type="number"
              step="0.0001"
              value={navRecord.累计净值}
              onChange={(e) => setNavRecord({...navRecord, 累计净值: e.target.value})}
            />
          </div>
          <Button
            onClick={() => onApiCall(`/api/funds/${fundId}/nav-records`, 'POST', {
              时间: navRecord.时间,
              累计净值: navRecord.累计净值 ? Number(navRecord.累计净值) : undefined
            })}
            disabled={!fundId}
            className="w-full"
          >
            添加净值记录
          </Button>
        </div>

        <Separator />

        {/* 基金交易记录 */}
        <div className="space-y-3">
          <Label className="font-semibold">添加基金交易记录</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="交易类型"
              value={fundTransaction.交易类型}
              onChange={(e) => setFundTransaction({...fundTransaction, 交易类型: e.target.value})}
            />
            <Input
              placeholder="交易净值"
              type="number"
              step="0.0001"
              value={fundTransaction.交易净值}
              onChange={(e) => setFundTransaction({...fundTransaction, 交易净值: e.target.value})}
            />
            <Input
              placeholder="交易金额"
              type="number"
              value={fundTransaction.交易金额}
              onChange={(e) => setFundTransaction({...fundTransaction, 交易金额: e.target.value})}
            />
            <Input
              placeholder="交易时间"
              type="datetime-local"
              value={fundTransaction.交易时间}
              onChange={(e) => setFundTransaction({...fundTransaction, 交易时间: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onApiCall(`/api/funds/${fundId}/transactions`, 'POST', {
                交易类型: fundTransaction.交易类型,
                交易净值: fundTransaction.交易净值 ? Number(fundTransaction.交易净值) : undefined,
                交易金额: fundTransaction.交易金额 ? Number(fundTransaction.交易金额) : undefined,
                交易时间: fundTransaction.交易时间
              })}
              disabled={!fundId}
              size="sm"
            >
              添加交易记录
            </Button>
            <Button
              onClick={() => onApiCall(`/api/funds/${fundId}/transactions`)}
              disabled={!fundId}
              size="sm"
            >
              查看交易记录
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 统计API测试组件
function StatisticsApiTest({ onApiCall }: { onApiCall: (url: string, method?: string, body?: any) => void }) {
  const [queryParams, setQueryParams] = useState({
    年月: '',
    类型: ''
  });
  const [statsData, setStatsData] = useState({
    年月: '',
    类型: '',
    自主盈亏金额: '',
    自主盈亏率: '',
    基金盈亏金额: '',
    基金盈亏率: '',
    总盈亏金额: '',
    总盈亏率: ''
  });
  const [statsId, setStatsId] = useState('');
  const [calculateData, setCalculateData] = useState({
    年月: '',
    类型: '月度'
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>统计 API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 查询统计 */}
        <div className="space-y-2">
          <Label className="font-semibold">查询统计数据</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="年月 (如: 2024-01)"
              value={queryParams.年月}
              onChange={(e) => setQueryParams({...queryParams, 年月: e.target.value})}
            />
            <Input
              placeholder="类型"
              value={queryParams.类型}
              onChange={(e) => setQueryParams({...queryParams, 类型: e.target.value})}
            />
          </div>
          <Button
            onClick={() => {
              const params = new URLSearchParams();
              if (queryParams.年月) params.append('年月', queryParams.年月);
              if (queryParams.类型) params.append('类型', queryParams.类型);
              onApiCall(`/api/statistics${params.toString() ? '?' + params.toString() : ''}`);
            }}
            className="w-full"
          >
            查询统计数据 (GET /api/statistics)
          </Button>
        </div>

        <Separator />

        {/* 计算统计 */}
        <div className="space-y-3">
          <Label className="font-semibold">计算统计数据</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="年月 (如: 2024-01)"
              value={calculateData.年月}
              onChange={(e) => setCalculateData({...calculateData, 年月: e.target.value})}
            />
            <Input
              placeholder="类型"
              value={calculateData.类型}
              onChange={(e) => setCalculateData({...calculateData, 类型: e.target.value})}
            />
          </div>
          <Button
            onClick={() => onApiCall('/api/statistics', 'PUT', calculateData)}
            className="w-full"
          >
            计算统计数据 (PUT /api/statistics)
          </Button>
        </div>

        <Separator />

        {/* 创建统计记录 */}
        <div className="space-y-3">
          <Label className="font-semibold">手动创建统计记录</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="年月"
              value={statsData.年月}
              onChange={(e) => setStatsData({...statsData, 年月: e.target.value})}
            />
            <Input
              placeholder="类型"
              value={statsData.类型}
              onChange={(e) => setStatsData({...statsData, 类型: e.target.value})}
            />
            <Input
              placeholder="自主盈亏金额"
              type="number"
              value={statsData.自主盈亏金额}
              onChange={(e) => setStatsData({...statsData, 自主盈亏金额: e.target.value})}
            />
            <Input
              placeholder="自主盈亏率"
              type="number"
              value={statsData.自主盈亏率}
              onChange={(e) => setStatsData({...statsData, 自主盈亏率: e.target.value})}
            />
            <Input
              placeholder="基金盈亏金额"
              type="number"
              value={statsData.基金盈亏金额}
              onChange={(e) => setStatsData({...statsData, 基金盈亏金额: e.target.value})}
            />
            <Input
              placeholder="基金盈亏率"
              type="number"
              value={statsData.基金盈亏率}
              onChange={(e) => setStatsData({...statsData, 基金盈亏率: e.target.value})}
            />
            <Input
              placeholder="总盈亏金额"
              type="number"
              value={statsData.总盈亏金额}
              onChange={(e) => setStatsData({...statsData, 总盈亏金额: e.target.value})}
            />
            <Input
              placeholder="总盈亏率"
              type="number"
              value={statsData.总盈亏率}
              onChange={(e) => setStatsData({...statsData, 总盈亏率: e.target.value})}
            />
          </div>
          <Button
            onClick={() => onApiCall('/api/statistics', 'POST', {
              ...statsData,
              自主盈亏金额: statsData.自主盈亏金额 ? Number(statsData.自主盈亏金额) : undefined,
              自主盈亏率: statsData.自主盈亏率 ? Number(statsData.自主盈亏率) : undefined,
              基金盈亏金额: statsData.基金盈亏金额 ? Number(statsData.基金盈亏金额) : undefined,
              基金盈亏率: statsData.基金盈亏率 ? Number(statsData.基金盈亏率) : undefined,
              总盈亏金额: statsData.总盈亏金额 ? Number(statsData.总盈亏金额) : undefined,
              总盈亏率: statsData.总盈亏率 ? Number(statsData.总盈亏率) : undefined
            })}
            className="w-full"
          >
            创建统计记录 (POST /api/statistics)
          </Button>
        </div>

        <Separator />

        {/* 统计记录操作 */}
        <div className="space-y-3">
          <Label className="font-semibold">统计记录操作</Label>
          <Input
            placeholder="统计记录ID"
            value={statsId}
            onChange={(e) => setStatsId(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => onApiCall(`/api/statistics/${statsId}`)}
              disabled={!statsId}
              size="sm"
            >
              获取详情
            </Button>
            <Button
              onClick={() => onApiCall(`/api/statistics/${statsId}`, 'PUT', {
                ...statsData,
                自主盈亏金额: statsData.自主盈亏金额 ? Number(statsData.自主盈亏金额) : undefined,
                自主盈亏率: statsData.自主盈亏率 ? Number(statsData.自主盈亏率) : undefined,
                基金盈亏金额: statsData.基金盈亏金额 ? Number(statsData.基金盈亏金额) : undefined,
                基金盈亏率: statsData.基金盈亏率 ? Number(statsData.基金盈亏率) : undefined,
                总盈亏金额: statsData.总盈亏金额 ? Number(statsData.总盈亏金额) : undefined,
                总盈亏率: statsData.总盈亏率 ? Number(statsData.总盈亏率) : undefined
              })}
              disabled={!statsId}
              size="sm"
            >
              更新记录
            </Button>
            <Button
              onClick={() => onApiCall(`/api/statistics/${statsId}`, 'DELETE')}
              disabled={!statsId}
              variant="destructive"
              size="sm"
            >
              删除记录
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 总览API测试组件
function OverviewApiTest({ onApiCall }: { onApiCall: (url: string, method?: string, body?: any) => void }) {
  const [overviewData, setOverviewData] = useState({
    自主总金额: '',
    自主成本金额: '',
    自主持仓金额: '',
    自主盈亏金额: '',
    自主盈亏率: '',
    自主仓位: '',
    基金总金额: '',
    基金盈亏金额: '',
    基金盈亏率: '',
    总投资金额: '',
    总盈亏金额: '',
    总盈亏率: ''
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>总览 API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 获取总览 */}
        <div>
          <Button
            onClick={() => onApiCall('/api/overview')}
            className="w-full"
          >
            获取总览数据 (GET /api/overview)
          </Button>
        </div>

        <Separator />

        {/* 计算总览 */}
        <div>
          <Button
            onClick={() => onApiCall('/api/overview', 'PUT')}
            className="w-full"
          >
            重新计算总览数据 (PUT /api/overview)
          </Button>
        </div>

        <Separator />

        {/* 手动创建总览 */}
        <div className="space-y-3">
          <Label className="font-semibold">手动创建总览数据</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="自主总金额"
              type="number"
              value={overviewData.自主总金额}
              onChange={(e) => setOverviewData({...overviewData, 自主总金额: e.target.value})}
            />
            <Input
              placeholder="自主成本金额"
              type="number"
              value={overviewData.自主成本金额}
              onChange={(e) => setOverviewData({...overviewData, 自主成本金额: e.target.value})}
            />
            <Input
              placeholder="自主持仓金额"
              type="number"
              value={overviewData.自主持仓金额}
              onChange={(e) => setOverviewData({...overviewData, 自主持仓金额: e.target.value})}
            />
            <Input
              placeholder="自主盈亏金额"
              type="number"
              value={overviewData.自主盈亏金额}
              onChange={(e) => setOverviewData({...overviewData, 自主盈亏金额: e.target.value})}
            />
            <Input
              placeholder="自主盈亏率"
              type="number"
              value={overviewData.自主盈亏率}
              onChange={(e) => setOverviewData({...overviewData, 自主盈亏率: e.target.value})}
            />
            <Input
              placeholder="自主仓位"
              type="number"
              value={overviewData.自主仓位}
              onChange={(e) => setOverviewData({...overviewData, 自主仓位: e.target.value})}
            />
            <Input
              placeholder="基金总金额"
              type="number"
              value={overviewData.基金总金额}
              onChange={(e) => setOverviewData({...overviewData, 基金总金额: e.target.value})}
            />
            <Input
              placeholder="基金盈亏金额"
              type="number"
              value={overviewData.基金盈亏金额}
              onChange={(e) => setOverviewData({...overviewData, 基金盈亏金额: e.target.value})}
            />
            <Input
              placeholder="基金盈亏率"
              type="number"
              value={overviewData.基金盈亏率}
              onChange={(e) => setOverviewData({...overviewData, 基金盈亏率: e.target.value})}
            />
            <Input
              placeholder="总投资金额"
              type="number"
              value={overviewData.总投资金额}
              onChange={(e) => setOverviewData({...overviewData, 总投资金额: e.target.value})}
            />
            <Input
              placeholder="总盈亏金额"
              type="number"
              value={overviewData.总盈亏金额}
              onChange={(e) => setOverviewData({...overviewData, 总盈亏金额: e.target.value})}
            />
            <Input
              placeholder="总盈亏率"
              type="number"
              value={overviewData.总盈亏率}
              onChange={(e) => setOverviewData({...overviewData, 总盈亏率: e.target.value})}
            />
          </div>
          <Button
            onClick={() => onApiCall('/api/overview', 'POST', {
              自主总金额: overviewData.自主总金额 ? Number(overviewData.自主总金额) : undefined,
              自主成本金额: overviewData.自主成本金额 ? Number(overviewData.自主成本金额) : undefined,
              自主持仓金额: overviewData.自主持仓金额 ? Number(overviewData.自主持仓金额) : undefined,
              自主盈亏金额: overviewData.自主盈亏金额 ? Number(overviewData.自主盈亏金额) : undefined,
              自主盈亏率: overviewData.自主盈亏率 ? Number(overviewData.自主盈亏率) : undefined,
              自主仓位: overviewData.自主仓位 ? Number(overviewData.自主仓位) : undefined,
              基金总金额: overviewData.基金总金额 ? Number(overviewData.基金总金额) : undefined,
              基金盈亏金额: overviewData.基金盈亏金额 ? Number(overviewData.基金盈亏金额) : undefined,
              基金盈亏率: overviewData.基金盈亏率 ? Number(overviewData.基金盈亏率) : undefined,
              总投资金额: overviewData.总投资金额 ? Number(overviewData.总投资金额) : undefined,
              总盈亏金额: overviewData.总盈亏金额 ? Number(overviewData.总盈亏金额) : undefined,
              总盈亏率: overviewData.总盈亏率 ? Number(overviewData.总盈亏率) : undefined
            })}
            className="w-full"
          >
            创建总览数据 (POST /api/overview)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}