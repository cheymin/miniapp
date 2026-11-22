import { findUserByEmail } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { setSessionCookie } from '@/lib/auth';
import { fail, json, readBody } from '@/lib/http';
import { normalizeEmail } from '@/lib/validate';

export const runtime = 'nodejs';

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = await readBody<LoginBody>(request);
  if (!body) return fail('请求格式不正确');

  const email = normalizeEmail(body.email || '');
  const password = String(body.password || '');
  if (!email || !password) return fail('请输入邮箱和密码');

  try {
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return fail('邮箱或密码不正确', 401);
    }
    await setSessionCookie(user.id);
    return json({ ok: true, email: user.email });
  } catch (error) {
    console.error('login failed', error);
    return fail('登录失败，请稍后再试', 500);
  }
}
