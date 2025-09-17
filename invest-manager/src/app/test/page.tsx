'use client'

import { useState } from 'react'

export default function TestPage() {
  const [result, setResult] = useState('')

  const testCreateProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          项目名称: '测试股票',
          项目代号: 'TEST001',
          成本价: 10.5,
          当前价: 12.3,
          股数: 1000
        })
      })
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`错误: ${error}`)
    }
  }

  const testGetProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`错误: ${error}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API测试页面</h1>

      <div className="space-x-4 mb-4">
        <button
          onClick={testCreateProject}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          测试创建项目
        </button>

        <button
          onClick={testGetProjects}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          测试获取项目列表
        </button>
      </div>

      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {result || '点击按钮测试API'}
      </pre>
    </div>
  )
}