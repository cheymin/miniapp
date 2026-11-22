'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { DownloadIcon } from '@/components/Icons';
import type { AccountView } from '@/lib/account';

interface Props {
  account: AccountView;
  version: string;
  fileName: string;
  fileSize: string;
  sha256: string;
}

interface Notice {
  tone: 'ok' | 'error';
  text: string;
}

export default function DashboardClient({ account: initialAccount, version, fileName, fileSize, sha256 }: Props) {
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(initialAccount.ai.baseUrl);
  const [model, setModel] = useState(initialAccount.ai.model);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/account/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, baseUrl, model }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setNotice({ tone: 'error', text: data?.message || '保存失败，请稍后再试' });
        return;
      }
      setAccount(data.account as AccountView);
      setApiKey('');
      setNotice({ tone: 'ok', text: '配置已保存，密钥已加密写入数据库。' });
      router.refresh();
    } catch {
      setNotice({ tone: 'error', text: '网络异常，请稍后再试' });
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (verifying) return;
    setVerifying(true);
    setNotice(null);
    try {
      const response = await fetch('/api/account/ai/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, baseUrl, model }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setNotice({ tone: 'error', text: data?.message || '连接失败' });
        return;
      }
      const samples = Array.isArray(data.models) && data.models.length
        ? `可用模型：${data.models.join(' / ')}`
        : '接口可访问';
      setNotice({ tone: 'ok', text: `连接成功，共 ${data.count} 个模型。${samples}` });
    } catch {
      setNotice({ tone: 'error', text: '网络异常，请稍后再试' });
    } finally {
      setVerifying(false);
    }
  }

  async function clearKey() {
    if (busy) return;
    if (!window.confirm('确定要清除已保存的 API Key 吗？')) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/account/ai', { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setNotice({ tone: 'error', text: data?.message || '清除失败' });
        return;
      }
      setAccount(data.account as AccountView);
      setApiKey('');
      setNotice({ tone: 'ok', text: '已清除保存的 API Key。' });
      router.refresh();
    } catch {
      setNotice({ tone: 'error', text: '网络异常，请稍后再试' });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 忽略网络错误，仍然回到首页
    }
    router.push('/');
    router.refresh();
  }

  const created = account.createdAt ? account.createdAt.slice(0, 10) : '-';
  const updated = account.ai.updatedAt ? account.ai.updatedAt.slice(0, 16).replace('T', ' ') : '-';

  return (
    <div className="auth-page">
      <div className="page-bg" />
      <div className="page-grid" />

      <header className="nav">
        <div className="wrap nav-inner">
          <Logo />
          <div className="nav-actions">
            <span className="dash-user">{account.email}</span>
            <button className="btn btn-soft" type="button" onClick={logout} disabled={loggingOut}>
              {loggingOut ? '退出中…' : '退出登录'}
            </button>
          </div>
        </div>
      </header>

      <main className="wrap dash">
        <div className="dash-head">
          <div>
            <div className="eyebrow">Dashboard</div>
            <h1>控制台</h1>
            <p>集中管理云端 AI 配置与安装包</p>
          </div>
          <span className="chip chip-ok">账号已登录</span>
        </div>

        <div className="dash-grid">
          <div>
            <section className="panel">
              <div className="panel-title">
                <h2>AI 接口配置</h2>
                {account.ai.hasKey ? (
                  <span className="chip chip-ok">已保存 Key</span>
                ) : (
                  <span className="chip chip-warn">未配置 Key</span>
                )}
              </div>
              <p className="panel-desc">
                兼容 OpenAI 接口协议。Key 使用 AES-256-GCM 加密后写入 Neon，页面只显示尾四位。
              </p>

              <div className="key-box">
                {account.ai.hasKey ? (
                  <span>当前 Key：{account.ai.keyHint}</span>
                ) : (
                  <span className="empty">尚未保存 API Key</span>
                )}
                <span style={{ fontSize: 10.5, color: '#69718a' }}>{account.ai.hasKey ? `更新于 ${updated}` : '加密存储'}</span>
              </div>

              {notice ? (
                <div className={`notice ${notice.tone === 'ok' ? 'notice-ok' : 'notice-error'}`}>{notice.text}</div>
              ) : null}

              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="apiKey">API Key</label>
                    <input
                      id="apiKey"
                      className="input"
                      type="password"
                      autoComplete="off"
                      placeholder={account.ai.hasKey ? '留空表示不修改' : 'sk-...'}
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="model">模型</label>
                    <input
                      id="model"
                      className="input"
                      type="text"
                      placeholder="gpt-4o-mini"
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="baseUrl">接口地址</label>
                  <input
                    id="baseUrl"
                    className="input"
                    type="url"
                    placeholder="https://api.openai.com/v1/"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary btn-soft" type="submit" disabled={busy}>
                    {busy ? '保存中…' : '保存配置'}
                  </button>
                  <button className="btn btn-ghost btn-soft" type="button" onClick={verify} disabled={verifying}>
                    {verifying ? '测试中…' : '测试连接'}
                  </button>
                  <button className="btn btn-danger btn-soft" type="button" onClick={clearKey} disabled={busy || !account.ai.hasKey}>
                    清除 Key
                  </button>
                </div>
              </form>
              <p className="hint">
                测试连接会在服务端请求「接口地址 + models」，10 秒超时。内网地址会被拒绝。
              </p>
            </section>

            <section className="panel">
              <div className="panel-title">
                <h2>设备端使用</h2>
              </div>
              <ul className="mini-list">
                <li>
                  <span className="dot" />
                  <div>
                    <b>1. 填写相同配置</b><br />
                    在词典笔的「设置 → AI 设置」中填入同一个接口地址与模型。
                  </div>
                </li>
                <li>
                  <span className="dot" />
                  <div>
                    <b>2. 粘贴 API Key</b><br />
                    云端保存的 Key 不会明文回传，首次配置时在设备端粘贴一次即可。
                  </div>
                </li>
                <li>
                  <span className="dot" />
                  <div>
                    <b>3. 测试对话</b><br />
                    回到 AI 页发送一条消息，确认接口与模型都可用。
                  </div>
                </li>
              </ul>
            </section>
          </div>

          <div>
            <section className="panel">
              <div className="panel-title">
                <h2>安装包</h2>
                <span className="chip">v{version}</span>
              </div>
              <p className="panel-desc">最新构建的 .amr 安装包，下载后放到设备 /userdisk。</p>
              <div className="download-mini">
                <div>
                  <b>{fileName}</b>
                  <span>{fileSize} · 本地安装</span>
                </div>
                <a className="btn btn-primary btn-soft" href={`/download/${fileName}`} download>
                  <DownloadIcon />
                  下载
                </a>
              </div>
              <p className="mono" style={{ marginTop: 12 }}>{sha256}</p>
            </section>

            <section className="panel">
              <div className="panel-title">
                <h2>账号</h2>
              </div>
              <ul className="mini-list">
                <li>
                  <span className="dot" />
                  <div><b>邮箱</b><br />{account.email}</div>
                </li>
                <li>
                  <span className="dot" />
                  <div><b>注册时间</b><br />{created}</div>
                </li>
                <li>
                  <span className="dot" />
                  <div><b>Key 状态</b><br />{account.ai.hasKey ? `已保存 ${account.ai.keyHint}` : '未配置'}</div>
                </li>
              </ul>
            </section>

            <section className="panel">
              <div className="panel-title">
                <h2>快捷入口</h2>
              </div>
              <div className="form-actions" style={{ marginTop: 4 }}>
                <Link className="btn btn-soft" href="/">返回首页</Link>
                <Link className="btn btn-soft" href="/#download">下载页</Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div>© 2025 Cheymin Pen · Cloud Console</div>
          <div className="footer-links">
            <Link href="/">首页</Link>
            <a href="https://pen.cheymin.top">pen.cheymin.top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
