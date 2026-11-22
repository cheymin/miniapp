'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password.length < 8) {
      setError('密码至少需要 8 位');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.message || '注册失败，请稍后再试');
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
          <h1>创建云端账号</h1>
          <p className="auth-sub">一个账号即可管理 AI Key、接口地址与模型配置。</p>

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
                autoComplete="new-password"
                placeholder="至少 8 位"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="field">
              <label htmlFor="confirm">确认密码</label>
              <input
                id="confirm"
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="再输入一次"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary form-submit" type="submit" disabled={busy}>
              {busy ? '创建中…' : '创建账号'}
            </button>
          </form>

          <div className="auth-foot">
            已有账号？<Link href="/login">去登录</Link>
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
