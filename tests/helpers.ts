import { readFile } from 'node:fs/promises';
import initSqlJs from 'sql.js';

// Run the actual SQL against an isolated in-memory SQLite database, never a deployed D1 binding.
export async function createD1() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql: string) {
      let args: any[] = [];
      return {
        bind(...values: any[]) { args = values; return this; },
        async first() {
          const stmt = db.prepare(sql);
          try { stmt.bind(args); return stmt.step() ? stmt.getAsObject() : null; }
          finally { stmt.free(); }
        },
        async run() { db.run(sql, args); return { success: true, meta: { changes: db.getRowsModified() } }; },
      };
    },
    async batch(statements: any[]) {
      db.run('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        db.run('COMMIT');
        return result;
      } catch (error) { db.run('ROLLBACK'); throw error; }
    },
  };
}

export class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
}

export function installBrowser() {
  const target = new EventTarget();
  const browser = Object.assign(target, {
    matchMedia: () => ({ matches: false }),
    location: { protocol: 'https:' },
  });
  Object.assign(globalThis, {
    window: browser, localStorage: new MemoryStorage(),
    document: Object.assign(new EventTarget(), {
      documentElement: { classList: { add() {}, remove() {} } },
      activeElement: null,
      querySelector: () => null,
    }),
    IS_REACT_ACT_ENVIRONMENT: true,
  });
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
