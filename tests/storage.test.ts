import { rememberCloudVersion, pendingWrites, syncStatus } from '../src/utils/syncState';
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { deferred, installBrowser } from './helpers';
import { clearAuthSession, getAuthSession, saveAuthSession } from '../src/utils/authSession';
import { retryPendingSync, fetchUserD1Data, getStoredSites, getStoredCategories, getCountdownEvents, saveApiBaseUrl, saveSites, syncNodesWithD1, syncUserWithD1 } from '../src/utils/storage';
import { exportProfile, validateProfile } from '../src/utils/profileStorage';

const session = (username = 'alice') => ({ username, token: `token-${username}`, expiresAt: Date.now() + 60_000, apiBaseUrl: '' });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const cloud = (sites: unknown[] = []) => ({ success: true, isD1Bound: true, version: 'v1', categories: [], sites, nodes: [] });

beforeEach(() => { installBrowser(); saveAuthSession(session()); rememberCloudVersion('alice', 'v0'); });

test('legacy category and countdown emoji become stable SVG icon IDs', () => {
  localStorage.setItem('apexnav_categories_alice', JSON.stringify([{ id: 'ai', name: 'AI', icon: '🤖' }]));
  localStorage.setItem('apexnav_countdowns:user:alice', JSON.stringify([{ id: 'one', name: '生日', date: '2027-01-01', emoji: '🎂' }]));
  assert.equal(getStoredCategories('alice')[0].icon, 'bot');
  assert.deepEqual(getCountdownEvents()[0], { id: 'one', name: '生日', date: '2027-01-01', icon: 'cake' });
  assert.deepEqual(JSON.parse(exportProfile().apexnav_countdowns)[0], { id: 'one', name: '生日', date: '2027-01-01', icon: 'cake' });
  assert.deepEqual(JSON.parse(validateProfile({ apexnav_countdowns: localStorage.getItem('apexnav_countdowns:user:alice') }).apexnav_countdowns)[0],
    { id: 'one', name: '生日', date: '2027-01-01', icon: 'cake' });
});

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
  assert.deepEqual(bodies[1], { username: 'alice', nodes: [], baseVersion: 'v1' });
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
  await new Promise((resolve) => setImmediate(resolve));
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

test('a failed upload stays in the durable outbox and blocks an older cloud read, including after login', async () => {
  const draft = [{ id: 'draft' } as any];
  saveSites(draft, 'alice');
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await syncUserWithD1('alice', [], draft), false);
  assert.equal(pendingWrites('alice').length, 1);
  saveAuthSession(session());
  let readCount = 0;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === 'POST') throw new Error('still offline');
    readCount++;
    return json(cloud([{ id: 'cloud-old' }]));
  };
  assert.equal(await fetchUserD1Data('alice'), null);
  assert.equal(readCount, 0);
  assert.equal(getStoredSites('alice')[0].id, 'draft');
  globalThis.fetch = async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).sites[0].id, 'draft');
    return json(cloud());
  };
  assert.equal(await retryPendingSync('alice'), true);
  assert.equal(pendingWrites('alice').length, 0);
});

test('conflicts retain the local edit and do not silently retry with a newer cloud version', async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; return json({ message: 'Cloud changed' }, 409); };
  assert.equal(await syncUserWithD1('alice', [], [{ id: 'local' } as any]), false);
  assert.equal(syncStatus('alice').state, 'conflict');
  assert.equal(await retryPendingSync('alice'), false);
  assert.equal(requests, 1);
  assert.equal(pendingWrites('alice')[0].write.fields.sites![0].id, 'local');
});

test('an outbox from a previous page instance is replayed and never sent to another API service', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  await syncNodesWithD1('alice', []);
  const entry = pendingWrites('alice')[0];
  localStorage.setItem(entry.key.replace(/:pending:.+$/, ':pending:previous-page'), JSON.stringify(entry.write));
  localStorage.removeItem(entry.key);
  let writes = 0;
  globalThis.fetch = async () => { writes++; return json(cloud()); };
  saveApiBaseUrl('https://other.test');
  saveAuthSession({ ...session(), apiBaseUrl: 'https://other.test' });
  assert.equal(await retryPendingSync('alice'), true);
  assert.equal(writes, 0);
  saveApiBaseUrl(''); saveAuthSession(session());
  assert.equal(await retryPendingSync('alice'), true);
  assert.equal(writes, 1);
});

test('replaying another page does not give this stale page permission to overwrite its changes', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  await syncNodesWithD1('alice', []);
  const entry = pendingWrites('alice')[0];
  localStorage.setItem(entry.key.replace(/:pending:.+$/, ':pending:other-tab'), JSON.stringify(entry.write));
  localStorage.removeItem(entry.key);
  globalThis.fetch = async () => json(cloud());
  assert.equal(await retryPendingSync('alice'), true);
  globalThis.fetch = async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).baseVersion, 'v0');
    return json({ message: 'stale page' }, 409);
  };
  assert.equal(await syncUserWithD1('alice', [], []), false);
  assert.equal(syncStatus('alice').state, 'conflict');
});

test('malformed durable records block hydration and preserve their raw content', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  await syncNodesWithD1('alice', []);
  const entry = pendingWrites('alice')[0];
  for (const raw of ['null', '{"state":"pending"}', 'broken JSON']) {
    localStorage.setItem(entry.key, raw);
    assert.equal(syncStatus('alice').state, 'conflict');
    assert.equal(pendingWrites('alice')[0].write.raw, raw);
    assert.equal(await fetchUserD1Data('alice'), null);
    assert.equal(localStorage.getItem(entry.key), raw);
  }
});

test('invalid cloud data cannot advance the version used by local edits', async () => {
  globalThis.fetch = async () => json(cloud([{ id: 'invalid' }]));
  assert.equal(await fetchUserD1Data('alice'), null);
  globalThis.fetch = async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).baseVersion, 'v0');
    return json(cloud());
  };
  assert.equal(await syncUserWithD1('alice', [], []), true);
});
