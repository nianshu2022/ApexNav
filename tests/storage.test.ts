import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { deferred, installBrowser } from './helpers';
import { clearAuthSession, getAuthSession, saveAuthSession } from '../src/utils/authSession';
import { fetchUserD1Data, getStoredSites, saveApiBaseUrl, saveSites, syncNodesWithD1, syncUserWithD1 } from '../src/utils/storage';

const session = (username = 'alice') => ({ username, token: `token-${username}`, expiresAt: Date.now() + 60_000, apiBaseUrl: '' });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const cloud = (sites: unknown[] = []) => ({ success: true, isD1Bound: true, categories: [], sites, nodes: [] });

beforeEach(() => { installBrowser(); saveAuthSession(session()); });

test('cloud requests carry the session and omit nodes on bookmark-only saves', async () => {
  const bodies: any[] = [];
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer token-alice');
    bodies.push(JSON.parse(String(init?.body)));
    return json(cloud());
  };
  assert.equal(await syncUserWithD1('alice', [], []), true);
  assert.equal(Object.hasOwn(bodies[0], 'nodes'), false);
  assert.equal(await syncNodesWithD1('alice', []), true);
  assert.deepEqual(bodies[1], { username: 'alice', nodes: [] });
});

test('logged-out and mismatched-account writes never send a request', async () => {
  globalThis.fetch = async () => { throw new Error('should not request'); };
  assert.equal(await syncUserWithD1('bob', [], []), false);
  clearAuthSession();
  assert.equal(await syncUserWithD1('alice', [], []), false);
});

test('rapid saves arrive at the server in edit order', async () => {
  const first = deferred<Response>();
  const bodies: any[] = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return bodies.length === 1 ? first.promise : json(cloud());
  };
  const one = syncUserWithD1('alice', [], [{ id: 'first' } as any]);
  const two = syncUserWithD1('alice', [], [{ id: 'second' } as any]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(bodies.length, 1);
  first.resolve(json(cloud()));
  assert.deepEqual(await Promise.all([one, two]), [true, true]);
  assert.equal(bodies[1].sites[0].id, 'second');
});

test('a delayed cloud read after logout or account switch cannot replace local data', async () => {
  for (const change of [() => clearAuthSession(), () => saveAuthSession(session('bob'))]) {
    saveAuthSession(session());
    saveSites([{ id: 'keep' } as any], 'alice');
    const result = deferred<Response>();
    globalThis.fetch = async () => result.promise;
    const read = fetchUserD1Data('alice');
    await new Promise((resolve) => setImmediate(resolve));
    change();
    result.resolve(json(cloud([{ id: 'stale' }])));
    assert.equal(await read, null);
    assert.equal(getStoredSites('alice')[0].id, 'keep');
  }
});

test('a cloud read overtaken by a local edit is discarded', async () => {
  const result = deferred<Response>();
  globalThis.fetch = async (_url, init) => init?.method === 'POST' ? json(cloud()) : result.promise;
  const read = fetchUserD1Data('alice');
  await new Promise((resolve) => setImmediate(resolve));
  saveSites([{ id: 'latest' } as any], 'alice');
  await syncUserWithD1('alice', [], [{ id: 'latest' } as any]);
  result.resolve(json(cloud([{ id: 'old' }])));
  assert.equal(await read, null);
  assert.equal(getStoredSites('alice')[0].id, 'latest');
});

test('empty remote data clears stale local data', async () => {
  saveSites([{ id: 'removed-remotely' } as any], 'alice');
  globalThis.fetch = async () => json(cloud());
  assert.deepEqual((await fetchUserD1Data('alice'))?.sites, []);
  assert.deepEqual(getStoredSites('alice'), []);
});

test('a missing cloud row preserves the local workspace for its first upload', async () => {
  saveSites([{ id: 'local-only' } as any], 'alice');
  globalThis.fetch = async () => json({ ...cloud(), isNewUser: true });
  assert.equal(await fetchUserD1Data('alice'), null);
  assert.equal(getStoredSites('alice')[0].id, 'local-only');
});

test('401 ends the current session, but an old request cannot log out a new account', async () => {
  globalThis.fetch = async () => json({ success: false }, 401);
  assert.equal(await fetchUserD1Data('alice'), null);
  assert.equal(getAuthSession(), null);
  saveAuthSession(session());
  const result = deferred<Response>();
  globalThis.fetch = async () => result.promise;
  const read = fetchUserD1Data('alice');
  await new Promise((resolve) => setImmediate(resolve));
  saveAuthSession(session('bob'));
  result.resolve(json({ success: false }, 401));
  await read;
  assert.equal(getAuthSession()?.username, 'bob');
});

test('unbound D1 is not a cloud-sync success and changing API base clears the old session', async () => {
  globalThis.fetch = async () => json({ success: true, isD1Bound: false });
  assert.equal(await syncUserWithD1('alice', [], []), false);
  saveApiBaseUrl('https://another.test/');
  assert.equal(getAuthSession(), null);
  assert.equal(localStorage.getItem('apexnav_api_base_url'), 'https://another.test');
});
