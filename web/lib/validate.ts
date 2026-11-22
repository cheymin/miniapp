export function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * 只允许 http/https，并拒绝明显的内网地址，避免把「测试连接」变成 SSRF 入口。
 */
export function sanitizeBaseUrl(value: string): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local')) {
    return null;
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
    return null;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
  if (url.username || url.password) return null;
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return `${url.origin}${path}`;
}

export function cleanModel(value: string): string {
  return String(value || '').trim().slice(0, 120);
}
