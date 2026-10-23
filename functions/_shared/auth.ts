export interface AuthEnv {
  DB?: any;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_HASH?: string;
}

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

export const normalizeUsername = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const hasEnvAuth = (env: AuthEnv): boolean => Boolean(
  env.ADMIN_USERNAME && (env.ADMIN_PASSWORD || env.ADMIN_PASSWORD_HASH)
);

export async function hashPassword(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getCredentialHash(env: AuthEnv, username: string): Promise<string | null> {
  if (hasEnvAuth(env)) {
    if (username !== normalizeUsername(env.ADMIN_USERNAME)) return null;
    return env.ADMIN_PASSWORD_HASH || hashPassword(env.ADMIN_PASSWORD!);
  }
  if (!env.DB) return null;
  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE username = ?').bind(username).first();
  return user?.password_hash || null;
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

async function signingKey(credentialHash: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(`apexnav-session-v1:${credentialHash}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// Signing with the current server-side credential also invalidates sessions after a password change.
export async function createSession(username: string, credentialHash: string, audience: string) {
  const expiresAt = Date.now() + SESSION_TTL;
  const payload = encodeBase64(encoder.encode(JSON.stringify({ username, expiresAt, audience, nonce: crypto.randomUUID() })));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(credentialHash), encoder.encode(payload));
  return { token: `${payload}.${encodeBase64(new Uint8Array(signature))}`, expiresAt };
}

export async function authenticate(request: Request, env: AuthEnv): Promise<string | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const parts = authorization.slice(7).split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64(payload)));
    const username = normalizeUsername(claims.username);
    if (!username || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= Date.now()
      || claims.audience !== new URL(request.url).origin) return null;
    const credentialHash = await getCredentialHash(env, username);
    if (!credentialHash) return null;
    const valid = await crypto.subtle.verify('HMAC', await signingKey(credentialHash),
      decodeBase64(signature), encoder.encode(payload));
    return valid ? username : null;
  } catch {
    return null;
  }
}
