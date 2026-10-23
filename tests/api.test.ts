import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]]';
import { createSession, hashPassword } from '../functions/_shared/auth';
import { createD1 } from './helpers';

const origin = 'https://apexnav.test';
async function call(env: any, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await onRequest({ env, request: new Request(origin + path, {
    method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }) });
  return { status: res.status, data: await res.json() };
}

async function registered(username = 'alice') {
  const env = { DB: await createD1() };
  const passwordHash = await hashPassword('test-only-password');
  const result = await call(env, '/api/auth/register', { username, passwordHash });
  assert.equal(result.status, 200);
  assert.ok(result.data.token);
  return { env, passwordHash, token: result.data.token };
}

test('data reads and writes require a session, including when D1 is absent', async () => {
  const { env } = await registered();
  for (const config of [env, {}]) {
    assert.equal((await call(config, '/api/data?username=alice')).status, 401);
    assert.equal((await call(config, '/api/data', { username: 'alice', sites: [] })).status, 401);
  }
});

test('session owner cannot read or overwrite another account', async () => {
  const { env, token, passwordHash } = await registered();
  await call(env, '/api/auth/register', { username: 'bob', passwordHash });
  assert.equal((await call(env, '/api/data?username=bob', undefined, token)).status, 403);
  assert.equal((await call(env, '/api/data', { username: 'bob', sites: [] }, token)).status, 403);
  assert.equal((await call(env, '/api/data?username=ALICE', undefined, token)).status, 200);
});

test('tampered, expired and different-deployment sessions are rejected', async () => {
  const { env, token, passwordHash } = await registered();
  const [payload, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const forged = Buffer.from(JSON.stringify({ ...claims, expiresAt: claims.expiresAt + 1 })).toString('base64url') + '.' + signature;
  assert.equal((await call(env, '/api/data', { nodes: [] }, forged)).status, 401);
  const other = await createSession('alice', passwordHash, 'https://other.test');
  assert.equal((await call(env, '/api/data', { nodes: [] }, other.token)).status, 401);
  const now = Date.now;
  try {
    Date.now = () => now() - 31 * 86400000;
    const expired = await createSession('alice', passwordHash, origin);
    Date.now = now;
    assert.equal((await call(env, '/api/data', { nodes: [] }, expired.token)).status, 401);
  } finally { Date.now = now; }
});

test('bookmark writes preserve nodes; node writes preserve bookmarks; explicit [] clears nodes', async () => {
  const { env, token } = await registered();
  const nodes = [{ id: 'n1', url: 'https://node.test' }];
  const categories = [{ id: 'c1', name: 'work' }];
  const sites = [{ id: 's1', category_id: 'c1', name: 'Docs', url: 'https://docs.test' }];
  assert.equal((await call(env, '/api/data', { nodes }, token)).status, 200);
  assert.equal((await call(env, '/api/data', { categories, sites }, token)).status, 200);
  assert.deepEqual((await call(env, '/api/data', undefined, token)).data.nodes, nodes);
  await call(env, '/api/data', { nodes: [] }, token);
  const saved = (await call(env, '/api/data', undefined, token)).data;
  assert.deepEqual(saved.nodes, []);
  assert.deepEqual(saved.sites, sites);
  assert.deepEqual(saved.categories, categories);
  assert.equal((await call(env, '/api/data', { nodes: null }, token)).status, 400);
});

test('environment login supports plaintext-secret and hash-secret deployments with the FK schema', async () => {
  for (const secret of [{ ADMIN_PASSWORD: 'test-secret' }, { ADMIN_PASSWORD_HASH: await hashPassword('test-secret') }]) {
    const env = { DB: await createD1(), ADMIN_USERNAME: 'Admin', ...secret };
    const auth = await call(env, '/api/auth/login', { username: ' ADMIN ', passwordHash: await hashPassword('test-secret') });
    assert.equal(auth.status, 200);
    assert.equal((await call(env, '/api/data', { sites: [] }, auth.data.token)).status, 200);
    assert.equal((await call(env, '/api/auth/register', { username: 'bob' })).status, 403);
    assert.equal((await call(env, '/api/auth/change-password', {}, auth.data.token)).status, 403);
    assert.equal((await call(env, '/api/auth/mode')).data.envUsername, undefined);
  }
});

test('an authenticated account without D1 cannot report a successful cloud save', async () => {
  const env = { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-secret' };
  const auth = await call(env, '/api/auth/login', { username: 'admin', password: 'test-secret' });
  assert.equal((await call(env, '/api/data', { sites: [] }, auth.data.token)).status, 503);
});

test('rename/password change preserves data and invalidates the old session', async () => {
  const { env, token, passwordHash } = await registered();
  const nodes = [{ id: 'keep-me' }];
  await call(env, '/api/data', { nodes }, token);
  const newPasswordHash = await hashPassword('new-test-password');
  const wrong = await call(env, '/api/auth/change-password', {
    oldPasswordHash: 'wrong', newUsername: 'renamed', newPasswordHash,
  }, token);
  assert.equal(wrong.data.code, 'wrong_password');
  const changed = await call(env, '/api/auth/change-password', {
    oldPasswordHash: passwordHash, newUsername: 'renamed', newPasswordHash,
  }, token);
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.data.nodes, nodes);
  assert.equal((await call(env, '/api/data', undefined, token)).status, 401);
  assert.deepEqual((await call(env, '/api/data', undefined, changed.data.token)).data.nodes, nodes);
  assert.equal((await call(env, '/api/auth/login', { username: 'renamed', passwordHash: newPasswordHash })).status, 200);
});

test('same-name password change and duplicate registration do not erase navigation data', async () => {
  const { env, token, passwordHash } = await registered();
  await call(env, '/api/data', { nodes: [{ id: 'keep' }] }, token);
  assert.equal((await call(env, '/api/auth/register', { username: 'alice', passwordHash })).status, 409);
  const changed = await call(env, '/api/auth/change-password', {
    oldPasswordHash: passwordHash, newUsername: 'alice', newPasswordHash: await hashPassword('changed'),
  }, token);
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.data.nodes, [{ id: 'keep' }]);
  assert.equal((await call(env, '/api/data', undefined, token)).status, 401);
});

test('unknown routes and unsupported methods cannot fall through to the data handler', async () => {
  const { env, token } = await registered();
  assert.equal((await call(env, '/api/unknown', { sites: [] }, token)).status, 404);
  assert.equal((await call(env, '/api/auth/login', undefined, token)).status, 405);
});
