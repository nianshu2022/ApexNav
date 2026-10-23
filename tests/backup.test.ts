import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowser } from './helpers';
import { saveAuthSession, clearAuthSession } from '../src/utils/authSession';
import { parseBookmarksJson, parseBookmarkFileContent, mergeBookmarks, generateNetscapeBookmarksHtml } from '../src/utils/bookmarkParser';
import { createWorkspaceBackup, restoreBackupExtras } from '../src/utils/backup';
import { writeProfileValue, readProfileValue, importLegacyProfile, hasLegacyProfile } from '../src/utils/profileStorage';
import { saveNodes, getStoredNodes } from '../src/utils/storage';
import { parseSuggestions, readLimitedText } from '../functions/_shared/external';

const category = { id: 'c', name: 'Work & <Ideas>' };
const site = { id: 's', name: '<b>literal</b> & "quoted"', category_id: 'c', url: 'https://example.test/Foo?a=1&b=2' };
const session = (username: string) => ({ username, token: 'fake', expiresAt: Date.now() + 60000, apiBaseUrl: '' });
beforeEach(() => { installBrowser(); saveAuthSession(session('alice')); });

test('invalid backup records and unsupported versions fail before import', () => {
  for (const input of [
    { categories: [null], sites: [null] },
    { categories: [category, category], sites: [] },
    { categories: [], sites: [site] },
    { categories: [category], sites: [{ ...site, url: 'javascript:alert(1)' }] },
    { version: '99', categories: [], sites: [] },
    { categories: [], sites: [], profile: { apexnav_session: 'credential' } },
  ]) assert.throws(() => parseBookmarksJson(JSON.stringify(input)));
  assert.deepEqual(parseBookmarksJson('{"version":"1.0","categories":[],"sites":[]}').sites, []);
});

test('merge remaps colliding category IDs and preserves case-sensitive URL paths', () => {
  const merged = mergeBookmarks([category], [site], [{ ...category, name: 'Personal' }], [{ ...site, id: 'new' }]);
  assert.notEqual(merged.categories[0].id, merged.categories[1].id);
  assert.equal(merged.sites[1].category_id, merged.categories[1].id);
  const paths = mergeBookmarks([category], [site], [category], [{ ...site, id: 'lower', url: site.url.replace('/Foo', '/foo') }]);
  assert.equal(paths.sites.length, 2);
  assert.equal(mergeBookmarks([category], [site], [category], [site]).sites.length, 1);
});

test('HTML export escapes markup, round-trips URLs and preserves orphan bookmarks', () => {
  const html = generateNetscapeBookmarksHtml([category], [site, { ...site, id: 'orphan', category_id: 'missing' }]);
  assert.ok(!html.includes('<b>literal</b>'));
  const parsed = parseBookmarkFileContent(html, 'backup.html');
  assert.equal(parsed.sites.length, 2);
  assert.equal(parsed.sites[0].name, site.name);
  assert.equal(parsed.sites[0].url, site.url);
  assert.ok(parsed.categories.some((cat) => cat.name.includes('恢复')));
});

test('literal HTML entities round-trip once and invalid JSON cannot bypass schema checks', () => {
  const literal = { ...site, name: 'literal &lt;tag&gt; 😀', url: 'https://example.test/?text=&amp;lt;' };
  const parsed = parseBookmarkFileContent(generateNetscapeBookmarksHtml([category], [literal]));
  assert.equal(parsed.sites[0].name, literal.name);
  assert.equal(parsed.sites[0].url, literal.url);
  assert.throws(() => parseBookmarkFileContent(JSON.stringify({ version: '99', categories: [], sites: [], text: '<a href="https://example.test">bypass</a>' })));
  const recovered = parseBookmarksJson(JSON.stringify(createWorkspaceBackup('alice', [], [site])));
  assert.equal(recovered.sites.length, 1);
  assert.equal(recovered.categories[0].id, site.category_id);
});

test('complete backup restores nodes, personal widgets and preferences without exporting credentials', () => {
  const nodes = [{ id: 'n', name: 'Node', url: 'https://node.test', status: 'checking' }];
  saveNodes(nodes, 'alice');
  writeProfileValue('apexnav_todo_items', JSON.stringify([{ id: 't', text: 'Private', completed: false }]));
  writeProfileValue('apexnav_countdowns', '[]');
  localStorage.setItem('apexnav_dark', 'true');
  const backup = createWorkspaceBackup('alice', [category], [site]);
  assert.ok(!JSON.stringify(backup).includes('fake'));
  const parsed = parseBookmarksJson(JSON.stringify(backup));
  saveAuthSession(session('bob'));
  assert.equal(readProfileValue('apexnav_todo_items'), null);
  restoreBackupExtras('bob', parsed);
  assert.equal(JSON.parse(readProfileValue('apexnav_todo_items')!)[0].text, 'Private');
  assert.deepEqual(getStoredNodes('bob'), nodes);
  clearAuthSession();
  assert.equal(readProfileValue('apexnav_todo_items'), null);
});

test('legacy personal data requires an explicit import and is not exposed to guests or another account', () => {
  localStorage.setItem('apexnav_todo_items', '[{"id":"t","text":"Legacy private","completed":false}]');
  assert.equal(hasLegacyProfile(), true);
  assert.equal(readProfileValue('apexnav_todo_items'), null);
  importLegacyProfile();
  assert.ok(readProfileValue('apexnav_todo_items')?.includes('Legacy private'));
  saveAuthSession(session('bob'));
  assert.equal(readProfileValue('apexnav_todo_items'), null);
  assert.equal(hasLegacyProfile(), false);
  assert.ok(localStorage.getItem('apexnav_legacy_profile_archive'));
});

test('suggestions are parsed as bounded data without executing provider scripts', async () => {
  assert.deepEqual(parseSuggestions('apexnav({q:"test",s:["one","two"]});'), ['one', 'two']);
  assert.deepEqual(parseSuggestions('apexnav({s:[alert(1)]});'), []);
  await assert.rejects(readLimitedText(new Response('oversized'), 3));
});
