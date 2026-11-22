import type { UserRow } from './db';
import { decryptSecret, maskSecret } from './crypto';

export interface AiView {
  hasKey: boolean;
  keyHint: string;
  baseUrl: string;
  model: string;
  updatedAt: string;
}

export interface AccountView {
  email: string;
  createdAt: string;
  ai: AiView;
}

export function toAccountView(user: UserRow): AccountView {
  const key = user.ai_api_key ? decryptSecret(user.ai_api_key) : '';
  return {
    email: user.email,
    createdAt: new Date(user.created_at).toISOString(),
    ai: {
      hasKey: !!key,
      keyHint: key ? maskSecret(key) : '',
      baseUrl: user.ai_base_url,
      model: user.ai_model,
      updatedAt: new Date(user.updated_at).toISOString(),
    },
  };
}

export function readAiKey(user: UserRow): string {
  return user.ai_api_key ? decryptSecret(user.ai_api_key) : '';
}
