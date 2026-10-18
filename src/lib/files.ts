import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DEMO_MODE, DEMO_ENCRYPTION_KEY, isProduction } from './config';
import { firebaseReady, storageBucket } from './firebase';
import demoSeed from './demo-seed.json';

const LOCAL_FILES = DEMO_MODE ? path.join(os.tmpdir(), 'clearledger-demo', 'files') : path.join(process.cwd(), '.data', 'files');
const MAGIC = Buffer.from('CLD1');

function encryptionKey(): Buffer {
  if (DEMO_MODE) return DEMO_ENCRYPTION_KEY;
  const encoded = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!encoded) {
    if (isProduction) throw new Error('DOCUMENT_ENCRYPTION_KEY is required in production.');
    return DEMO_ENCRYPTION_KEY;
  }
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('DOCUMENT_ENCRYPTION_KEY must be base64 for exactly 32 random bytes.');
  return key;
}
function encrypt(plain: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}
function decrypt(envelope: Buffer): Buffer {
  if (envelope.length < 32 || !envelope.subarray(0, 4).equals(MAGIC)) throw new Error('Encrypted document is invalid.');
  const iv = envelope.subarray(4, 16);
  const tag = envelope.subarray(16, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(envelope.subarray(32)), decipher.final()]);
}

export async function storeEncryptedFile(id: string, original: Buffer) {
  const envelope = encrypt(original);
  if (firebaseReady()) {
    await storageBucket().file(`documents/${id}.cld`).save(envelope, {
      resumable: false,
      metadata: { contentType: 'application/octet-stream', cacheControl: 'private, no-store' },
      validation: 'crc32c',
    });
    return;
  }
  if (!DEMO_MODE && isProduction) throw new Error('Firebase Storage is required in production.');
  await fs.mkdir(LOCAL_FILES, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(LOCAL_FILES, `${id}.cld`), envelope, { mode: 0o600, flag: 'wx' });
}
export async function readEncryptedFile(id: string): Promise<Buffer> {
  if (DEMO_MODE && Object.hasOwn(demoSeed.files, id)) {
    return Buffer.from(demoSeed.files[id as keyof typeof demoSeed.files], 'base64');
  }
  const envelope = firebaseReady()
    ? Buffer.from((await storageBucket().file(`documents/${id}.cld`).download())[0])
    : await fs.readFile(path.join(LOCAL_FILES, `${id}.cld`));
  return decrypt(envelope);
}
export async function removeEncryptedFile(id: string) {
  if (firebaseReady()) {
    await storageBucket().file(`documents/${id}.cld`).delete({ ignoreNotFound: true });
    return;
  }
  await fs.rm(path.join(LOCAL_FILES, `${id}.cld`), { force: true });
}
