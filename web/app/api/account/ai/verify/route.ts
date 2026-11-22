import { getCurrentUser } from '@/lib/auth';
import { readAiKey } from '@/lib/account';
import { fail, json, readBody } from '@/lib/http';
import { cleanModel, sanitizeBaseUrl } from '@/lib/validate';

export const runtime = 'nodejs';

interface VerifyBody {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('请先登录', 401);

  const body = await readBody<VerifyBody>(request);
  if (!body) return fail('请求格式不正确');

  const baseUrl = sanitizeBaseUrl(body.baseUrl || user.ai_base_url);
  if (!baseUrl) return fail('接口地址需要是有效的 http(s) 公网地址');

  const submittedKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const apiKey = submittedKey || readAiKey(user);
  if (!apiKey) return fail('请先填写或保存 API Key');

  const model = cleanModel(body.model || user.ai_model) || 'gpt-4o-mini';

  try {
    const response = await fetch(`${baseUrl}models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });

    const text = await response.text();
    if (!response.ok) {
      return fail(`接口返回 ${response.status}，请检查地址与 Key`, 400);
    }

    let payload: unknown = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    const list = payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)
      ? ((payload as { data: Array<{ id?: string }> }).data.map((item) => item && item.id).filter(Boolean) as string[])
      : [];

    return json({
      ok: true,
      model,
      count: list.length,
      models: list.slice(0, 6),
    });
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      return fail('连接超时，请检查接口地址', 400);
    }
    console.error('verify ai endpoint failed', error);
    return fail('无法连接该接口，请检查地址', 400);
  }
}
