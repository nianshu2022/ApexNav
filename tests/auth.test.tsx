import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { act, create } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { clearAuthSession, getAuthSession, saveAuthSession } from '../src/utils/authSession';
import { getStoredSites, saveCategories, saveNodes, saveSites } from '../src/utils/storage';
import App from '../src/App';
import { BookmarkGrid } from '../src/components/BookmarkGrid';
import { deferred, installBrowser } from './helpers';
import { enqueueWrite, pendingWrites } from '../src/utils/syncState';

let auth: ReturnType<typeof useAuth>;
function Probe() { auth = useAuth(); return null; }
const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status });
const loginData = (user = 'alice') => ({
  success: true, user, token: `session-${user}`, expiresAt: Date.now() + 60_000,
  isD1Bound: true, categories: [], sites: [], nodes: [],
});

beforeEach(() => {
  installBrowser();
  globalThis.fetch = async () => json({ success: true, isEnvAuth: false });
});

async function mountAuth() {
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(<AuthProvider><Probe /></AuthProvider>); });
  return renderer!;
}

test('legacy local flags and cached passwords cannot grant a login rejected by the server', async () => {
  localStorage.setItem('apexnav_is_admin', 'true');
  localStorage.setItem('apexnav_auth_expires', String(Date.now() + 999999));
  localStorage.setItem('apexnav_auth_password', 'legacy-cache');
  const view = await mountAuth();
  try {
    assert.equal(auth.isAdmin, false);
    globalThis.fetch = async () => json({ success: false }, 401);
    let result = true;
    await act(async () => { result = await auth.login('alice', 'wrong'); });
    assert.equal(result, false);
    assert.equal(auth.isAdmin, false);
  } finally { await act(async () => view.unmount()); }
});

test('login reports a missing local API or network failure instead of claiming the password is wrong', async () => {
  const view = await mountAuth();
  try {
    const errors: string[] = [];
    globalThis.fetch = async () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } });
    await act(async () => { assert.equal(await auth.login('alice', 'unused', (message) => errors.push(message)), false); });
    assert.match(errors.pop()!, /没有可用的登录接口/);
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await act(async () => { assert.equal(await auth.login('alice', 'unused', (message) => errors.push(message)), false); });
    assert.match(errors.pop()!, /无法连接登录服务/);
  } finally { await act(async () => view.unmount()); }
});

test('failed registration leaves cached bookmarks intact and does not log in or upload', async () => {
  saveSites([{ id: 'existing' } as any], 'alice');
  const view = await mountAuth();
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url) => { calls.push(String(url)); return json({ success: false, message: '已存在' }, 409); };
    await act(async () => { await assert.rejects(auth.setupAccount('alice', 'test-password')); });
    assert.deepEqual(calls, ['/api/auth/register']);
    assert.equal(getStoredSites('alice')[0].id, 'existing');
    assert.equal(auth.isAdmin, false);
  } finally { await act(async () => view.unmount()); }
});

test('successful login accepts empty cloud data and sends only the password hash', async () => {
  saveSites([{ id: 'stale' } as any], 'alice');
  const view = await mountAuth();
  try {
    globalThis.fetch = async (_url, init) => {
      if (!init?.body) return json({ success: true });
      const body = JSON.parse(String(init.body));
      assert.equal(body.password, undefined);
      assert.match(body.passwordHash, /^[a-f0-9]{64}$/);
      return json(loginData());
    };
    await act(async () => { assert.equal(await auth.login(' ALICE ', 'test-password'), true); });
    assert.equal(auth.currentUsername, 'alice');
    assert.deepEqual(getStoredSites('alice'), []);
    await act(async () => auth.logout());
    assert.equal(auth.currentUsername, null);
  } finally { await act(async () => view.unmount()); }
});

test('password change rejection cannot fall back to a local success', async () => {
  saveAuthSession({ username: 'alice', token: 'valid', expiresAt: Date.now() + 60_000, apiBaseUrl: '' });
  const view = await mountAuth();
  try {
    globalThis.fetch = async () => json({ success: false, code: 'wrong_password' }, 400);
    await act(async () => { assert.equal(await auth.changeCredentials('wrong', 'bob', 'new'), 'wrong_password'); });
    assert.equal(getAuthSession()?.username, 'alice');
    globalThis.fetch = async () => json({ success: false }, 403);
    await act(async () => { assert.equal(await auth.changeCredentials('old', 'bob', 'new'), 'error'); });
    assert.equal(getAuthSession()?.username, 'alice');
  } finally { await act(async () => view.unmount()); }
});

test('first cloud login preserves a local workspace when no cloud row exists', async () => {
  saveSites([{ id: 'local-only' } as any], 'alice');
  const view = await mountAuth();
  try {
    globalThis.fetch = async (_url, init) => json(init?.body ? { ...loginData(), isNewUser: true } : { success: true });
    await act(async () => { assert.equal(await auth.login('alice', 'test-password'), true); });
    assert.equal(getStoredSites('alice')[0].id, 'local-only');
  } finally { await act(async () => view.unmount()); }
});

test('cross-tab account switch works even when both tabs were already logged in', async () => {
  const session = { username: 'alice', token: 'alice-token', expiresAt: Date.now() + 60_000, apiBaseUrl: '' };
  saveAuthSession(session);
  const view = await mountAuth();
  try {
    localStorage.setItem('apexnav_session', JSON.stringify({ ...session, username: 'bob', token: 'bob-token' }));
    await act(async () => window.dispatchEvent(Object.assign(new Event('storage'), { key: 'apexnav_session' })));
    assert.equal(auth.currentUsername, 'bob');
  } finally { await act(async () => view.unmount()); }
});

test('switching accounts and logging out immediately replaces visible bookmarks; late reads stay discarded', async () => {
  localStorage.setItem('apexnav_widgets', 'false');
  const alice = { username: 'alice', token: 'alice-token', expiresAt: Date.now() + 60_000, apiBaseUrl: '' };
  saveCategories([{ id: 'a', name: 'Alice' }], 'alice');
  saveSites([{ id: 'private-a', category_id: 'a', name: 'Alice private', url: 'https://alice.test' }], 'alice');
  saveCategories([{ id: 'b', name: 'Bob' }], 'bob');
  saveSites([{ id: 'private-b', category_id: 'b', name: 'Bob private', url: 'https://bob.test' }], 'bob');
  saveNodes([], 'alice');
  saveAuthSession(alice);
  const remote = deferred<Response>();
  globalThis.fetch = async (url) => String(url).includes('/api/data') ? remote.promise : json({ success: true });
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<App />); });
  try {
    const visibleIds = () => view!.root.findByType(BookmarkGrid).props.sites.map((site: any) => site.id);
    assert.deepEqual(visibleIds(), ['private-a']);
    await act(async () => saveAuthSession({ ...alice, username: 'bob', token: 'bob-token' }));
    assert.deepEqual(visibleIds(), ['private-b']);
    await act(async () => clearAuthSession());
    assert.ok(!visibleIds().includes('private-a') && !visibleIds().includes('private-b'));
    await act(async () => { remote.resolve(json({ ...loginData(), sites: [{ id: 'late-private' }] })); });
    assert.ok(!visibleIds().includes('late-private'));
    assert.equal(getStoredSites('alice')[0].id, 'private-a');
    assert.equal(getStoredSites('bob')[0].id, 'private-b');
  } finally { await act(async () => view!.unmount()); }
});

test('logging in preserves an offline draft instead of replacing it with the login snapshot', async () => {
  saveSites([{ id: 'offline-draft' } as any], 'alice');
  enqueueWrite('alice', { categories: [], sites: [{ id: 'offline-draft' } as any] });
  const view = await mountAuth();
  try {
    globalThis.fetch = async () => json(loginData());
    await act(async () => { assert.equal(await auth.login('alice', 'password'), true); });
    assert.equal(getStoredSites('alice')[0].id, 'offline-draft');
    assert.equal(pendingWrites('alice').length, 1);
  } finally { await act(async () => view.unmount()); }
});
