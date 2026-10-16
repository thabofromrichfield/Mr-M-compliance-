import { generateSecret as genSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

export function generateSecret(email: string) {
  const secret = genSecret();
  const otpauth = generateURI({ issuer: 'Compliance App', label: email, secret });
  return { secret, otpauth };
}

export async function qrDataUrl(otpauth: string) {
  return QRCode.toDataURL(otpauth);
}

export async function verifyToken(secret: string, token: string) {
  try {
    const res = await verify({ token, secret });
    return !!res?.valid;
  } catch {
    return false;
  }
}
