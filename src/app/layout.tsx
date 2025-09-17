import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '投资管理系统',
  description: '个人投资项目管理工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}