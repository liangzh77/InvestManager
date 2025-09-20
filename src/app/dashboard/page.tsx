'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

interface OverviewData {
  总金额: number
  成本金额: number
  持仓金额: number
  盈亏金额: number
  盈亏率: number
  仓位: number
  更新时间: string
  项目统计: {
    项目总数: number
    进行中项目: number
    已完成项目: number
  }
  交易统计: {
    交易总数: number
    计划中交易: number
    已完成交易: number
  }
}

export default function Dashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hideValues, setHideValues] = useState(false)
  const [error, setError] = useState('')

  const fetchOverviewData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/overview')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError('')
      } else {
        setError(result.error || '获取数据失败')
      }
    } catch (err) {
      setError('网络错误')
      console.error('获取总览数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 从localStorage读取隐藏状态
    const savedHideState = localStorage.getItem('dashboard-hide-values')
    if (savedHideState !== null) {
      setHideValues(JSON.parse(savedHideState))
    }

    fetchOverviewData()
  }, [])

  // 切换隐藏状态并保存到localStorage
  const toggleHideValues = () => {
    const newHideState = !hideValues
    setHideValues(newHideState)
    localStorage.setItem('dashboard-hide-values', JSON.stringify(newHideState))
  }

  const formatNumber = (value: number) => {
    if (hideValues) return '****'
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatPercent = (value: number) => {
    if (hideValues) return '****'
    return `${value.toFixed(2)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">错误: {error}</div>
        <div className="text-center mt-4">
          <Button onClick={fetchOverviewData}>重试</Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">暂无数据</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和隐藏按钮 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">投资总览</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleHideValues}
          className="flex items-center gap-2"
        >
          {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {hideValues ? '显示' : '隐藏'}
        </Button>
      </div>

      {/* 主要财务指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总金额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.总金额)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              成本金额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.成本金额)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              持仓金额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.持仓金额)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              盈亏金额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.盈亏金额 >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatNumber(data.盈亏金额)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 百分比指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              盈亏率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.盈亏率 >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {data.盈亏率.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              仓位
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.仓位.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 统计信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>项目统计</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>项目总数</span>
              <span className="font-medium">{data.项目统计.项目总数}</span>
            </div>
            <div className="flex justify-between">
              <span>进行中项目</span>
              <span className="font-medium text-blue-600">{data.项目统计.进行中项目}</span>
            </div>
            <div className="flex justify-between">
              <span>已完成项目</span>
              <span className="font-medium text-green-600">{data.项目统计.已完成项目}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>交易统计</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>交易总数</span>
              <span className="font-medium">{data.交易统计.交易总数}</span>
            </div>
            <div className="flex justify-between">
              <span>计划中交易</span>
              <span className="font-medium text-orange-600">{data.交易统计.计划中交易}</span>
            </div>
            <div className="flex justify-between">
              <span>已完成交易</span>
              <span className="font-medium text-green-600">{data.交易统计.已完成交易}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 更新时间和刷新按钮 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              更新时间: {formatDate(data.更新时间)}
            </span>
            <Button
              onClick={fetchOverviewData}
              variant="outline"
              size="sm"
            >
              刷新数据
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}