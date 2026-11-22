import { ensureSchema } from '@/lib/db';
import { json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSchema();
    return json({ ok: true, service: 'cheymin-pen', db: 'connected' });
  } catch (error) {
    console.error('health check failed', error);
    return json({ ok: false, service: 'cheymin-pen', db: 'unavailable' }, 500);
  }
}
