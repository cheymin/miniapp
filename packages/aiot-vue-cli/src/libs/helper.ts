import { createHash, type BinaryLike } from 'node:crypto';
import { readFileSync } from 'node:fs';

const QUERY_REG = /([^=&\s]+)[=\s]*([^&\s]*)/g;

export const md5 = (data: BinaryLike) => {
  const hash = createHash('md5');
  hash.update(data);
  return hash.digest('hex');
};

export const getContent = (file: string) => readFileSync(file, 'utf-8');

export const parseQuery = (query: string) => {
  const obj: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = QUERY_REG.exec(query)) !== null) {
    obj[match[1]!] = match[2]!;
  }
  return obj;
};
