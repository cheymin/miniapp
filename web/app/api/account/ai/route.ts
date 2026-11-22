import { getCurrentUser } from '@/lib/auth';
import { clearAiKey, saveAiConfig } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';
import { toAccountView } from '@/lib/account';
import { fail, json, readBody } from '@/lib/http';
import { cleanModel, sanitizeBaseUrl } from '@/lib/validate';

export const runtime = 'nodejs';

interface AiBody {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('请先登录', 401);

  const body = await readBody<AiBody>(request);
  if (!body) return fail('请求格式不正确');

  const rawKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  if (rawKey && (rawKey.length < 6 || rawKey.length > 512)) {
    return fail('API Key 长度不正确');
  }

  const baseUrl = sanitizeBaseUrl(body.baseUrl || user.ai_base_url);
  if (!baseUrl) return fail('接口地址需要是有效的 http(s) 公网地址');

  const model = cleanModel(body.model || user.ai_model) || 'gpt-4o-mini';
  const encrypted = rawKey ? encryptSecret(rawKey) : null;

  try {
    const updated = await saveAiConfig(user.id, encrypted, baseUrl, model);
    return json({ ok: true, account: toAccountView(updated) });
  } catch (error) {
    console.error('save ai config failed', error);
    return fail('保存失败，请稍后再试', 500);
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return fail('请先登录', 401);
  try {
    const updated = await clearAiKey(user.id);
    return json({ ok: true, account: toAccountView(updated) });
  } catch (error) {
    console.error('clear ai key failed', error);
    return fail('清除失败，请稍后再试', 500);
  }
}
