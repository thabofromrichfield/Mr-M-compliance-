import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEMO_MODE, isProduction } from './config';
import { firebaseReady, firestore } from './firebase';
import demoSeed from './demo-seed.json';

export type Collection = 'documents' | 'audit' | 'settings';
const ROOT = DEMO_MODE ? path.join(os.tmpdir(), 'clearledger-demo') : path.join(process.cwd(), '.data');

function filePath(collection: Collection) {
  fs.mkdirSync(ROOT, { recursive: true, mode: 0o700 });
  return path.join(ROOT, `${collection}.json`);
}
function localList<T>(collection: Collection): T[] {
  const file = filePath(collection);
  if (!fs.existsSync(file)) {
    if (DEMO_MODE && collection === 'documents') return structuredClone(demoSeed.documents) as T[];
    return [];
  }
  try {
    const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(value) ? value as T[] : [];
  } catch { return []; }
}
function localWrite<T extends { id: string }>(collection: Collection, records: T[]) {
  const target = filePath(collection);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(records), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  fs.renameSync(temp, target);
}
function useFirebase() {
  if (!DEMO_MODE && isProduction && !firebaseReady()) throw new Error('Production data storage requires Firebase configuration.');
  return firebaseReady();
}

export async function listRecords<T extends { id: string }>(collection: Collection): Promise<T[]> {
  if (!useFirebase()) return localList<T>(collection);
  const snapshot = await firestore().collection(collection).get();
  return snapshot.docs.map((doc) => doc.data() as T);
}
export async function getRecord<T extends { id: string }>(collection: Collection, id: string): Promise<T | undefined> {
  if (!useFirebase()) return localList<T>(collection).find((record) => record.id === id);
  const doc = await firestore().collection(collection).doc(id).get();
  return doc.exists ? doc.data() as T : undefined;
}
export async function saveRecord<T extends { id: string }>(collection: Collection, record: T): Promise<void> {
  if (!useFirebase()) {
    const records = localList<T>(collection);
    const index = records.findIndex((item) => item.id === record.id);
    if (index < 0) records.push(record); else records[index] = record;
    localWrite(collection, records);
    return;
  }
  await firestore().collection(collection).doc(record.id).set(record);
}
export async function deleteRecord(collection: Collection, id: string): Promise<void> {
  if (!useFirebase()) {
    localWrite(collection, localList<{ id: string }>(collection).filter((record) => record.id !== id));
    return;
  }
  await firestore().collection(collection).doc(id).delete();
}
