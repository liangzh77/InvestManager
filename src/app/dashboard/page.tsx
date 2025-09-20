'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react'

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

interface ProjectData {
  id: number
  项目名称: string
  盈亏金额: number
  项目盈亏率: number
  总盈亏率: number
  状态: string
}

export default function Dashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [hideValues, setHideValues] = useState(false)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<keyof ProjectData | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const fetchOverviewData = async () => {
    try {
      setLoading(true)
      const [overviewResponse, projectsResponse] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/projects')
      ])

      const [overviewResult, projectsResult] = await Promise.all([
        overviewResponse.json(),
        projectsResponse.json()
      ])

      if (overviewResult.success) {
        setData(overviewResult.data)
        setError('')
      } else {
        setError(overviewResult.error || '获取总览数据失败')
      }

      if (projectsResult.success) {
        setProjects(projectsResult.data || [])
      } else {
        console.error('获取项目数据失败:', projectsResult.error)
      }
    } catch (err) {
      setError('网络错误')
      console.error('获取数据失败:', err)
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

  // 排序功能
  const handleSort = (key: keyof ProjectData) => {
    if (sortKey === key) {
      // 同一列再次点击，切换排序方向
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      // 新列，默认降序
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  // 排序后的项目列表
  const sortedProjects = [...projects].sort((a, b) => {
    if (!sortKey) return 0

    const aValue = a[sortKey]
    const bValue = b[sortKey]

    let comparison = 0
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else {
      comparison = String(aValue).localeCompare(String(bValue))
    }

    return sortDirection === 'desc' ? -comparison : comparison
  })

  const formatNumber = (value: number) => {
    if (hideValues) return '****'
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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

      {/* 项目列表 */}
      <Card>
        <CardHeader>
          <CardTitle>项目详情</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {projects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('项目名称')}
                    >
                      <div className="flex items-center gap-2">
                        项目名称
                        {sortKey === '项目名称' && (
                          sortDirection === 'desc' ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('盈亏金额')}
                    >
                      <div className="flex items-center gap-2">
                        盈亏金额
                        {sortKey === '盈亏金额' && (
                          sortDirection === 'desc' ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('项目盈亏率')}
                    >
                      <div className="flex items-center gap-2">
                        项目盈亏率
                        {sortKey === '项目盈亏率' && (
                          sortDirection === 'desc' ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('总盈亏率')}
                    >
                      <div className="flex items-center gap-2">
                        总盈亏率
                        {sortKey === '总盈亏率' && (
                          sortDirection === 'desc' ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('状态')}
                    >
                      <div className="flex items-center gap-2">
                        状态
                        {sortKey === '状态' && (
                          sortDirection === 'desc' ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((project) => (
                    <tr key={project.id} className="border-b hover:bg-muted/25 transition-colors">
                      <td className="p-4 font-medium">{project.项目名称}</td>
                      <td className={`p-4 font-medium ${
                        project.盈亏金额 >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatNumber(project.盈亏金额)}
                      </td>
                      <td className={`p-4 ${
                        project.项目盈亏率 >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {project.项目盈亏率.toFixed(1)}%
                      </td>
                      <td className={`p-4 ${
                        project.总盈亏率 >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {project.总盈亏率.toFixed(1)}%
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.状态 === '进行'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {project.状态}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              暂无项目数据
            </div>
          )}
        </CardContent>
      </Card>

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