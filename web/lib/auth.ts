import { cookies } from 'next/headers';
import { sign, safeEqual } from './crypto';
import { findUserById, type UserRow } from './db';

const SESSION_COOKIE = 'cp_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function buildSessionValue(userId: string): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function parseSessionValue(value: string): string | null {
  const parts = String(value || '').split('.');
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  if (!userId || !expires || !signature) return null;
  const payload = `${userId}.${expires}`;
  if (!safeEqual(signature, sign(payload))) return null;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return null;
  return userId;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, buildSessionValue(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return parseSessionValue(store.get(SESSION_COOKIE)?.value || '');
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  try {
    return await findUserById(userId);
  } catch {
    return null;
  }
}
