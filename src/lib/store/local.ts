import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';

const ROOT = path.resolve(process.cwd(), DATA_DIR);

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function dataPath(...parts: string[]) {
  ensureDir(ROOT);
  return path.join(ROOT, ...parts);
}

export function uploadsDir() {
  const d = dataPath('uploads');
  ensureDir(d);
  return d;
}

type Collection = 'users' | 'documents' | 'auditLogs' | 'sessions' | 'settings';

function fileFor(col: Collection) {
  return dataPath(`${col}.json`);
}

function readCol<T>(col: Collection): T[] {
  const f = fileFor(col);
  if (!fs.existsSync(f)) return [];
  try {
    const raw = fs.readFileSync(f, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCol<T>(col: Collection, data: T[]) {
  fs.writeFileSync(fileFor(col), JSON.stringify(data, null, 2), 'utf8');
}

export const localStore = {
  list<T>(col: Collection): T[] {
    return readCol<T>(col);
  },
  get<T extends { id: string }>(col: Collection, id: string): T | undefined {
    return readCol<T>(col).find((x) => x.id === id);
  },
  insert<T>(col: Collection, item: T): T {
    const arr = readCol<any>(col);
    arr.push(item);
    writeCol(col, arr);
    return item;
  },
  update(col: Collection, id: string, patch: any): any {
    const arr = readCol<any>(col);
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return undefined;
    arr[idx] = { ...arr[idx], ...patch };
    writeCol(col, arr);
    return arr[idx];
  },
  remove<T extends { id: string }>(col: Collection, id: string): boolean {
    const arr = readCol<any>(col);
    const next = arr.filter((x) => x.id !== id);
    if (next.length === arr.length) return false;
    writeCol(col, next);
    return true;
  },
  replaceAll<T>(col: Collection, data: T[]) {
    writeCol(col, data);
  },
  getSetting<T>(key: string): T | undefined {
    const arr = readCol<{ key: string; value: unknown }>('settings');
    const e = arr.find((x) => x.key === key);
    return e ? (e.value as T) : undefined;
  },
  setSetting(key: string, value: unknown) {
    const arr = readCol<{ key: string; value: unknown }>('settings');
    const idx = arr.findIndex((x) => x.key === key);
    if (idx === -1) arr.push({ key, value });
    else arr[idx].value = value;
    writeCol('settings', arr);
  },
};
