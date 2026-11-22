'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.message || '登录失败，请稍后再试');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="page-bg" />
      <div className="page-grid" />

      <header className="nav">
        <div className="wrap nav-inner">
          <Logo />
          <Link href="/" className="btn btn-soft">返回首页</Link>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <h1>登录云端账号</h1>
          <p className="auth-sub">登录后可修改 AI API Key，并查看最新安装包。</p>

          {error ? <div className="notice notice-error">{error}</div> : null}

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">邮箱</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="输入密码"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary form-submit" type="submit" disabled={busy}>
              {busy ? '登录中…' : '登录'}
            </button>
          </form>

          <div className="auth-foot">
            还没有账号？<Link href="/register">立即注册</Link>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div>© 2025 Cheymin Pen</div>
          <div className="footer-links">
            <a href="/download/cheymin-pen-3.0.0.amr" download>下载安装包</a>
            <Link href="/">首页</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
