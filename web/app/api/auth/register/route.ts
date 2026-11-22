import { createUser } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { setSessionCookie } from '@/lib/auth';
import { fail, json, readBody } from '@/lib/http';
import { isValidEmail, normalizeEmail } from '@/lib/validate';

export const runtime = 'nodejs';

interface RegisterBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = await readBody<RegisterBody>(request);
  if (!body) return fail('请求格式不正确');

  const email = normalizeEmail(body.email || '');
  const password = String(body.password || '');

  if (!isValidEmail(email)) return fail('请输入有效的邮箱地址');
  if (password.length < 8) return fail('密码至少需要 8 位');
  if (password.length > 128) return fail('密码过长');

  try {
    const user = await createUser(email, await hashPassword(password));
    await setSessionCookie(user.id);
    return json({ ok: true, email: user.email });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') return fail('该邮箱已注册', 409);
    console.error('register failed', error);
    return fail('注册失败，请稍后再试', 500);
  }
}
