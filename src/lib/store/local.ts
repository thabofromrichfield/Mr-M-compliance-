import fs from 'fs';
import path from 'path';
const ROOT = path.join(process.cwd(), '.data');

function ensureDir(directory: string) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
}

export function dataPath(...parts: string[]) {
  ensureDir(ROOT);
  return path.join(/*turbopackIgnore: true*/ ROOT, ...parts);
}

export function uploadsDir() {
  const directory = dataPath('uploads');
  ensureDir(directory);
  return directory;
}

type Collection = 'users' | 'documents' | 'auditLogs' | 'sessions' | 'settings';

function fileFor(collection: Collection) { return dataPath(`${collection}.json`); }

function readCol<T>(collection: Collection): T[] {
  const file = fileFor(collection);
  if (!fs.existsSync(file)) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch { return []; }
}

function writeCol<T>(collection: Collection, data: T[]) {
  const target = fileFor(collection);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, target);
}

export const localStore = {
  list<T>(collection: Collection): T[] { return readCol<T>(collection); },
  get<T extends { id: string }>(collection: Collection, id: string): T | undefined { return readCol<T>(collection).find((item) => item.id === id); },
  insert<T>(collection: Collection, item: T): T {
    const records = readCol<T>(collection);
    records.push(item);
    writeCol(collection, records);
    return item;
  },
  update<T extends { id: string }>(collection: Collection, id: string, patch: Partial<T>): T | undefined {
    const records = readCol<T>(collection);
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) return undefined;
    records[index] = { ...records[index], ...patch };
    writeCol(collection, records);
    return records[index];
  },
  remove<T extends { id: string }>(collection: Collection, id: string): boolean {
    const records = readCol<T>(collection);
    const remaining = records.filter((item) => item.id !== id);
    if (remaining.length === records.length) return false;
    writeCol(collection, remaining);
    return true;
  },
  replaceAll<T>(collection: Collection, records: T[]) { writeCol(collection, records); },
  getSetting<T>(key: string): T | undefined {
    const records = readCol<{ key: string; value: unknown }>('settings');
    const setting = records.find((record) => record.key === key);
    return setting ? setting.value as T : undefined;
  },
  setSetting(key: string, value: unknown) {
    const records = readCol<{ key: string; value: unknown }>('settings');
    const index = records.findIndex((record) => record.key === key);
    if (index < 0) records.push({ key, value }); else records[index].value = value;
    writeCol('settings', records);
  },
};
