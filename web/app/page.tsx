import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { DeviceMock } from '@/components/DeviceMock';
import {
  ArrowIcon,
  CloudIcon,
  DownloadIcon,
  FolderIcon,
  GalleryIcon,
  KeyboardIcon,
  PlayIcon,
  SparkIcon,
  TerminalIcon,
} from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Cheymin Pen · 把 AI 装进一支词典笔',
};

const VERSION = '3.0.0';
const FILE_NAME = `cheymin-pen-${VERSION}.amr`;
const FILE_SIZE = '1.5 MB';
const SHA256 = '114fa4f58a76be7c20ac61b3145b297981a1f3e22be36acadac96f670733f424';

const features = [
  {
    icon: <SparkIcon />,
    title: 'AI 助手',
    text: '多轮对话、分支重试、消息导航，接入任意 OpenAI 兼容接口。',
  },
  {
    icon: <KeyboardIcon />,
    title: '自绘键盘',
    text: '全屏 QWERTY 键盘，内置 405 个拼音音节与本地候选词。',
  },
  {
    icon: <TerminalIcon />,
    title: '终端',
    text: '在词典笔上直接执行 Shell 命令，支持历史、快捷命令与目录切换。',
  },
  {
    icon: <GalleryIcon />,
    title: '图库与查看器',
    text: '扫描图片目录，左侧拖动查看细节，右侧按钮缩放与翻页。',
  },
  {
    icon: <PlayIcon />,
    title: '视频播放',
    text: '15 fps 抽帧、预缓冲和可拖动进度条，支持本地与网络视频。',
  },
  {
    icon: <FolderIcon />,
    title: '文件管理',
    text: '浏览、复制、重命名与删除设备文件，路径输入一次直达。',
  },
];

export default function HomePage() {
  return (
    <div className="auth-page">
      <div className="page-bg" />
      <div className="page-grid" />

      <header className="nav">
        <div className="wrap nav-inner">
          <Logo />
          <nav className="nav-links" aria-label="主导航">
            <a href="#features">功能</a>
            <a href="#terminal">终端</a>
            <a href="#download">下载</a>
            <a href="#account">云端账号</a>
          </nav>
          <div className="nav-actions">
            <Link href="/login" className="btn btn-soft">登录</Link>
            <Link href="/dashboard" className="btn btn-ghost">控制台</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div>
            <span className="badge">
              <span className="badge-dot" />
              v{VERSION} 已发布 · 适配 560 × 170 屏幕
            </span>
            <h1>
              把 AI 装进
              <br />
              一支<span className="grad-text">词典笔</span>
            </h1>
            <p className="lead">
              Cheymin Pen 是为小屏词典笔打造的完整工具箱：AI 对话、自绘拼音键盘、终端、
              图库、视频与文件管理。登录云端账号，还能集中管理你的 AI API Key。
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={`/download/${FILE_NAME}`} download>
                <DownloadIcon />
                下载 v{VERSION} 安装包
              </a>
              <Link className="btn btn-ghost" href="/register">
                创建云端账号
                <ArrowIcon />
              </Link>
            </div>
            <p className="hero-note">
              安装包 {FILE_SIZE} · 无需第三方应用商店 · 支持 SHA-256 校验
            </p>
            <div className="hero-stats">
              <div>
                <div className="stat-value">8</div>
                <div className="stat-label">内置应用</div>
              </div>
              <div>
                <div className="stat-value">405</div>
                <div className="stat-label">拼音音节</div>
              </div>
              <div>
                <div className="stat-value">15 fps</div>
                <div className="stat-label">视频抽帧</div>
              </div>
              <div>
                <div className="stat-value">AES-256</div>
                <div className="stat-label">Key 加密</div>
              </div>
            </div>
          </div>
          <DeviceMock />
        </section>

        <section className="wrap section" id="features">
          <div className="section-head">
            <div className="eyebrow">Features</div>
            <h2>小屏幕，也有完整的工作流</h2>
            <p>所有功能都为 560 × 170 的横屏重新排版，按钮尺寸和触控区域针对笔端优化。</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="card feature" key={feature.title}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wrap section" id="terminal">
          <div className="split">
            <div>
              <div className="eyebrow">Terminal</div>
              <h2 style={{ margin: '12px 0', fontSize: 'clamp(27px, 3.4vw, 38px)', letterSpacing: '-0.03em', lineHeight: 1.16 }}>
                在笔上直接敲命令
              </h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15 }}>
                终端通过设备 Shell 在线执行命令，输出实时回传。支持 cd 目录保持、
                历史命令与常用命令一键执行，排查问题不用再连电脑。
              </p>
              <ul className="check-list">
                <li>
                  <span className="check">✓</span>
                  完整保留工作目录，cd 后可继续执行相对路径命令
                </li>
                <li>
                  <span className="check">✓</span>
                  一键运行 pwd、ls、df -h、free、ps、uname -a
                </li>
                <li>
                  <span className="check">✓</span>
                  黑底绿字高对比度输出，自动滚动到最新一行
                </li>
              </ul>
            </div>
            <div className="term-window" aria-hidden="true">
              <div className="term-bar">
                <span className="term-dot r" />
                <span className="term-dot y" />
                <span className="term-dot g" />
                <span className="term-title">cheymin-pen — shell</span>
              </div>
              <div className="term-body">
                <div className="term-line-dim">Cheymin Terminal · 命令通过设备 Shell 执行</div>
                <div className="term-line-cmd">/userdisk $ uname -a</div>
                <div className="term-line-out">Linux cheymin 4.9.118 armv7l GNU/Linux</div>
                <div className="term-line-cmd">/userdisk $ df -h | head -n 3</div>
                <div className="term-line-out">Filesystem&nbsp;&nbsp;Size&nbsp;Used&nbsp;Avail&nbsp;Use%</div>
                <div className="term-line-out">/dev/root&nbsp;&nbsp;29G&nbsp;&nbsp;8.2G&nbsp;&nbsp;19G&nbsp;&nbsp;31%</div>
                <div className="term-line-cmd">/userdisk $ ls</div>
                <div className="term-line-out">Books&nbsp;&nbsp;Music&nbsp;&nbsp;Pictures&nbsp;&nbsp;video.amr</div>
                <div className="term-line-cmd">/userdisk $ <span className="term-cursor" /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap section" id="download">
          <div className="download-card">
            <div>
              <div className="eyebrow">Download</div>
              <h2>下载最新安装包</h2>
              <p>
                适用于已安装基础环境的 Cheymin Pen 设备。下载后放到设备
                <code style={{ color: '#cfd4ea' }}> /userdisk </code>
                目录，在「更新」页选择本地安装包升级。
              </p>
              <div className="download-actions">
                <a className="btn btn-primary" href={`/download/${FILE_NAME}`} download>
                  <DownloadIcon />
                  下载 {FILE_NAME}
                </a>
                <Link className="btn btn-ghost" href="/login">
                  登录后管理 AI Key
                </Link>
              </div>
            </div>
            <div className="download-meta">
              <div className="meta-row">
                <span>版本</span>
                <b>v{VERSION}</b>
              </div>
              <div className="meta-row">
                <span>大小</span>
                <b>{FILE_SIZE}</b>
              </div>
              <div className="meta-row">
                <span>文件</span>
                <b>{FILE_NAME}</b>
              </div>
              <div>
                <div className="meta-row" style={{ marginBottom: 6 }}>
                  <span>SHA-256</span>
                </div>
                <div className="mono">{SHA256}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap section" id="account">
          <div className="cta">
            <div className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CloudIcon /> Cloud Account
            </div>
            <h2>一个账号，管理你的 AI 配置</h2>
            <p>
              注册后可在控制台修改 AI API Key、接口地址与模型。Key 使用 AES-256-GCM
              加密存储，页面只显示尾四位，随时可以清除。
            </p>
            <div className="cta-actions">
              <Link className="btn btn-primary" href="/register">
                免费注册
                <ArrowIcon />
              </Link>
              <Link className="btn btn-ghost" href="/login">
                已有账号，去登录
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div>© 2025 Cheymin Pen · Built for pocket devices</div>
          <div className="footer-links">
            <a href="#download">下载</a>
            <Link href="/login">登录</Link>
            <Link href="/dashboard">控制台</Link>
            <a href="https://pen.cheymin.top">pen.cheymin.top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
