import { NextResponse } from 'next/server';

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export function fail(message: string, status = 400): NextResponse {
  return json({ ok: false, message }, status);
}

export async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
