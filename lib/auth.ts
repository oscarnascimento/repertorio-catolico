/**
 * Authentication utility for Admin session management.
 * Uses Web Crypto API (HMAC-SHA256) for compatibility with Edge runtime (Middleware) and Node.js.
 */

export const ADMIN_COOKIE_NAME = 'admin_session';
const DEFAULT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const DEVELOPMENT_SESSION_SECRET = 'development-session-secret-change-me-32chars';
const DEVELOPMENT_ADMIN_PASSWORD = 'dev-admin-password-change-me';

function getSessionSecret(): string {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEVELOPMENT_SESSION_SECRET;
  }

  throw new Error('ADMIN_SESSION_SECRET is required in production.');
}

function getAdminPassword(): string {
  const value = process.env.ADMIN_PASSWORD?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEVELOPMENT_ADMIN_PASSWORD;
  }

  throw new Error('ADMIN_PASSWORD is required in production.');
}

/**
 * Derives a CryptoKey for HMAC-SHA256 from the session secret.
 */
async function getHmacKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Base64 URL encoder / decoder
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Creates a signed session token.
 */
export async function createSessionToken(
  durationMs: number = DEFAULT_SESSION_DURATION_MS
): Promise<string> {
  const payload = JSON.stringify({
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + durationMs,
  });

  const encodedPayload = base64UrlEncode(payload);
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload)
  );
  const encodedSignature = bufferToBase64Url(signatureBuffer);

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies a signed session token.
 */
export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encodedPayload, encodedSignature] = parts;

  try {
    const key = await getHmacKey();

    // Decode signature
    let base64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const signatureBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      signatureBytes[i] = binary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(encodedPayload)
    );

    if (!isValid) return false;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.exp || payload.exp < Date.now()) {
      return false;
    }

    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Validates the admin password in constant time to prevent timing attacks.
 */
export async function verifyAdminPassword(inputPassword: string): Promise<boolean> {
  const expectedPassword = getAdminPassword();
  if (!inputPassword || typeof inputPassword !== 'string') return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(inputPassword);
  const b = encoder.encode(expectedPassword);

  if (a.length !== b.length) {
    // Keep timing consistent even if lengths differ
    let diff = a.length ^ b.length;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ (b[i % b.length] || 0);
    }
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}
