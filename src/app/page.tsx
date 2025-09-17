import Link from 'next/link'

export default function Home() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">投资管理系统</h1>

      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">快速开始</h2>
          <p className="text-gray-600 mb-4">
            欢迎使用投资管理系统。这是一个个人投资项目管理工具，帮助您跟踪投资项目和交易记录。
          </p>

          <div className="space-y-2">
            <Link
              href="/projects"
              className="block w-full px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600 transition-colors"
            >
              项目管理
            </Link>
            <Link
              href="/api-test"
              className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600 transition-colors"
            >
              API 测试页面
            </Link>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">系统功能</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• 项目管理 (CRUD)</li>
            <li>• 交易记录管理</li>
            <li>• 自动计算盈亏统计</li>
            <li>• 总览和详细统计</li>
            <li>• 仓位和收益率计算</li>
          </ul>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API 端点</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <div><code>/api/projects</code> - 项目管理</div>
            <div><code>/api/transactions</code> - 交易管理</div>
            <div><code>/api/overview</code> - 总览统计</div>
            <div><code>/api/statistics</code> - 详细统计</div>
          </div>
        </div>
      </div>
    </div>
  );
}