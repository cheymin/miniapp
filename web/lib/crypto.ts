import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * 生产环境应显式配置 AUTH_SECRET。
 * 未配置时用 DB_URL 派生，保证同一部署下会话和密文可复现。
 */
export function serverSecret(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 16) return configured;
  const dbUrl = process.env.DB_URL || 'cheymin-local-development';
  return createHash('sha256').update(`cheymin-pen::${dbUrl}`).digest('hex');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sign(value: string): string {
  return createHmac('sha256', serverSecret()).update(value).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function encryptionKey(): Buffer {
  return createHash('sha256').update(`enc::${serverSecret()}`).digest();
}

/** AES-256-GCM，返回 v1.iv.tag.cipher（base64url）。 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSecret(payload: string): string {
  try {
    const [version, ivPart, tagPart, dataPart] = payload.split('.');
    if (version !== 'v1' || !ivPart || !tagPart || !dataPart) return '';
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '••••••';
  return `${value.slice(0, 3)}••••••${value.slice(-4)}`;
}
