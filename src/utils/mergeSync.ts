import type { SyncFields } from './syncState';

type RecordWithId = { id: string };

function sameRecord(a: RecordWithId | undefined, b: RecordWithId | undefined): boolean {
  if (!a || !b) return a === b;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .every((key) => JSON.stringify(left[key]) === JSON.stringify(right[key]));
}

function mergeRecords<T extends RecordWithId>(base: T[], local: T[], remote: T[]): T[] | null {
  const baseline = new Map(base.map((item) => [item.id, item]));
  const draft = new Map(local.map((item) => [item.id, item]));
  const latest = new Map(remote.map((item) => [item.id, item]));
  if ([baseline, draft, latest].some((map, index) => map.size !== [base, local, remote][index].length)) return null;
  const ids = new Set([...baseline.keys(), ...draft.keys(), ...latest.keys()]);
  const merged = new Map<string, T>();
  for (const id of ids) {
    const before = baseline.get(id);
    const mine = draft.get(id);
    const theirs = latest.get(id);
    let selected: T | undefined;
    if (sameRecord(mine, before)) selected = theirs;
    else if (sameRecord(theirs, before) || sameRecord(mine, theirs)) selected = mine;
    else return null;
    if (selected) merged.set(id, selected);
  }
  // Preserve the server's order, then append new records created locally.
  return [...remote, ...local].flatMap((item) => {
    const selected = merged.get(item.id);
    if (!selected) return [];
    merged.delete(item.id);
    return [selected];
  });
}

export function mergeSyncFields(base: SyncFields, local: SyncFields, remote: SyncFields): SyncFields | null {
  const merged: SyncFields = {};
  if (local.categories !== undefined) {
    if (!base.categories || !remote.categories) return null;
    const value = mergeRecords(base.categories, local.categories, remote.categories);
    if (!value) return null;
    merged.categories = value;
  }
  if (local.sites !== undefined) {
    if (!base.sites || !remote.sites) return null;
    const value = mergeRecords(base.sites, local.sites, remote.sites);
    if (!value) return null;
    merged.sites = value;
  }
  if (local.nodes !== undefined) {
    if (!base.nodes || !remote.nodes) return null;
    const value = mergeRecords(base.nodes, local.nodes, remote.nodes);
    if (!value) return null;
    merged.nodes = value;
  }
  return merged;
}
