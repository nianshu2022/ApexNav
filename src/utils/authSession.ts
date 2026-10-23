export const SESSION_KEY = 'apexnav_session';
export const SESSION_EVENT = 'apexnav_session_change';

export interface AuthSession {
  username: string;
  token: string;
  expiresAt: number;
  apiBaseUrl: string;
}

export function currentApiBase(): string {
  return (localStorage.getItem('apexnav_api_base_url') || '').trim().replace(/\/+$/, '');
}

export function getAuthSession(): AuthSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!session || typeof session.username !== 'string' || !session.username
      || typeof session.token !== 'string' || !session.token
      || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()
      || session.apiBaseUrl !== currentApiBase()) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('apexnav_is_admin');
  localStorage.removeItem('apexnav_auth_expires');
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function isCurrentSession(session: AuthSession): boolean {
  const current = getAuthSession();
  return current?.token === session.token && current?.username === session.username;
}

export async function authenticatedFetch(
  path: string, session: AuthSession, init: RequestInit = {}
): Promise<Response | null> {
  if (!isCurrentSession(session)) return null;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.token}`);
  const response = await fetch(`${session.apiBaseUrl}${path}`, {
    ...init, headers, signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  if (response.status === 401 && isCurrentSession(session)) clearAuthSession();
  return response;
}
