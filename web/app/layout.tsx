import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pen.cheymin.top';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Cheymin Pen · 词典笔工具箱',
  description: 'Cheymin Pen 词典笔工具箱：AI 助手、自绘键盘、终端、图库、视频播放器与云端账号。下载安装包并管理你的 AI API Key。',
  applicationName: 'Cheymin Pen',
  icons: {
    icon: '/app-icon.png',
    apple: '/app-icon.png',
  },
  openGraph: {
    title: 'Cheymin Pen · 词典笔工具箱',
    description: '把 AI 装进一支词典笔。下载安装包，登录云端账号管理 AI API Key。',
    url: siteUrl,
    siteName: 'Cheymin Pen',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
