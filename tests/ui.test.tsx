import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { act, create } from 'react-test-renderer';
import { deferred, installBrowser } from './helpers';
import App from '../src/App';
import { BookmarkGrid } from '../src/components/BookmarkGrid';
import { SearchHero } from '../src/components/SearchHero';
import { saveAuthSession } from '../src/utils/authSession';
import { getStoredSites, getStoredCategories, saveCategories, saveSites } from '../src/utils/storage';
import { PREFERENCE_EVENT } from '../src/utils/preferences';

beforeEach(() => {
  installBrowser();
  globalThis.fetch = async () => Response.json({ success: true, isD1Bound: false });
});

test('deleting a category removes all its bookmarks from state, storage and pinned results', async () => {
  localStorage.setItem('apexnav_widgets', 'false');
  saveAuthSession({ username: 'alice', token: 'fake', expiresAt: Date.now() + 60000, apiBaseUrl: '' });
  saveCategories([{ id: 'c', name: 'Delete' }, { id: 'keep', name: 'Keep' }], 'alice');
  saveSites([{ id: 's', category_id: 'c', name: 'Pinned', url: 'https://example.test', pinned: true }], 'alice');
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<App />); });
  try {
    await act(async () => view!.root.findByType(BookmarkGrid).props.onDeleteCategory('c'));
    assert.deepEqual(getStoredCategories('alice').map((cat) => cat.id), ['keep']);
    assert.deepEqual(getStoredSites('alice'), []);
    assert.deepEqual(view!.root.findByType(BookmarkGrid).props.sites, []);
  } finally { await act(async () => view!.unmount()); }
});

test('search sends no external suggestions until the user enables them', async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ suggestions: [] }); };
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<SearchHero currentEngine="google" sites={[]} onChangeEngine={() => {}} />); });
  try {
    await act(async () => view!.root.findByType('input').props.onChange({ target: { value: 'private bookmark' } }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
    assert.equal(requests, 0);
  } finally { await act(async () => view!.unmount()); }
});

test('late suggestions cannot replace newer results or crash keyboard selection', async () => {
  localStorage.setItem('apexnav_web_suggestions', 'true');
  const requests: { url: string; result: ReturnType<typeof deferred<Response>> }[] = [];
  globalThis.fetch = async (url) => {
    const result = deferred<Response>(); requests.push({ url: String(url), result }); return result.promise;
  };
  const opened: string[] = [];
  (window as any).open = (url: string) => opened.push(url);
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<SearchHero currentEngine="google" sites={[]} onChangeEngine={() => {}} />); });
  try {
    const input = () => view!.root.findByType('input');
    await act(async () => input().props.onChange({ target: { value: 'older' } }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
    await act(async () => input().props.onChange({ target: { value: 'newer' } }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
    assert.equal(requests.length, 2);
    assert.ok(requests[1].url.startsWith('/api/search/suggestions?'));
    await act(async () => requests[1].result.resolve(Response.json({ suggestions: ['new1', 'new2', 'new3', 'new4', 'new5'] })));
    for (let i = 0; i < 5; i++) await act(async () => input().props.onKeyDown({ key: 'ArrowDown', preventDefault() {} }));
    await act(async () => requests[0].result.resolve(Response.json({ suggestions: ['old1'] })));
    await act(async () => input().props.onKeyDown({ key: 'Enter', preventDefault() {} }));
    assert.equal(input().props.value, 'new5');
    assert.ok(opened[0].endsWith('new5'));
  } finally { await act(async () => view!.unmount()); }
});

test('changing link preferences updates an already mounted bookmark grid', async () => {
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<BookmarkGrid categories={[{ id: 'c', name: 'C' }]}
    sites={[{ id: 's', category_id: 'c', name: 'Site', url: 'https://example.test' }]}
    isAdmin={false} onAddSite={() => {}} onEditSite={() => {}} onDeleteSite={() => {}}
    onAddCategory={() => {}} onDeleteCategory={() => {}} onTogglePin={() => {}} />); });
  try {
    const link = () => view!.root.findAllByType('a').find((node) => node.props.href === 'https://example.test')!;
    assert.equal(link().props.target, '_blank');
    await act(async () => { localStorage.setItem('apexnav_open_new_tab', 'false'); window.dispatchEvent(new Event(PREFERENCE_EVENT)); });
    assert.equal(link().props.target, '_self');
  } finally { await act(async () => view!.unmount()); }
});
