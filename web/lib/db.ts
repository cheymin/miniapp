import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  ai_api_key: string | null;
  ai_base_url: string;
  ai_model: string;
  created_at: string;
  updated_at: string;
}

type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function sql(): SqlClient {
  const url = process.env.DB_URL;
  if (!url) {
    throw new Error('缺少 DB_URL 环境变量');
  }
  if (!client) {
    client = neon(url);
  }
  return client;
}

async function initSchema(): Promise<void> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      ai_api_key TEXT,
      ai_base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1/',
      ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM users WHERE email = ${email} LIMIT 1`) as unknown as UserRow[];
  return (rows[0] as UserRow | undefined) || null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM users WHERE id = ${id} LIMIT 1`) as unknown as UserRow[];
  return (rows[0] as UserRow | undefined) || null;
}

export async function createUser(email: string, passwordHash: string): Promise<UserRow> {
  await ensureSchema();
  const id = randomUUID();
  const rows = (await sql()`
    INSERT INTO users (id, email, password_hash)
    VALUES (${id}, ${email}, ${passwordHash})
    RETURNING *
  `) as unknown as UserRow[];
  return rows[0] as UserRow;
}

export async function saveAiConfig(
  id: string,
  apiKey: string | null,
  baseUrl: string,
  model: string,
): Promise<UserRow> {
  await ensureSchema();
  const rows = (await sql()`
    UPDATE users
    SET ai_api_key = COALESCE(${apiKey}, ai_api_key),
        ai_base_url = ${baseUrl},
        ai_model = ${model},
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as unknown as UserRow[];
  return rows[0] as UserRow;
}

export async function clearAiKey(id: string): Promise<UserRow> {
  await ensureSchema();
  const rows = (await sql()`
    UPDATE users
    SET ai_api_key = NULL,
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as unknown as UserRow[];
  return rows[0] as UserRow;
}
