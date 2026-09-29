import { storage } from '../utils/storage.js';
import { createSeed } from './seed.js';
const KEY = 'crm-v1';
const listeners = new Set();
let current;
export const mockDatabase = {
  read() {
    if (!current) {
      const saved = storage.get(KEY, null);
      current =
        saved?.version === 1 &&
        [
          'leads',
          'agents',
          'properties',
          'tasks',
          'viewings',
          'activities',
          'notes',
          'notifications',
        ].every((key) => Array.isArray(saved[key]))
          ? saved
          : createSeed();
    }
    return structuredClone(current);
  },
  commit(next) {
    // Write before publishing: a failed save never reports a successful mutation.
    if (!storage.set(KEY, next))
      throw new Error(
        'Browser storage is unavailable or full. Changes were not saved. Enable storage and try again.',
      );
    current = structuredClone(next);
    listeners.forEach((listener) => listener(this.read()));
    return this.read();
  },
  reset() {
    return this.commit(createSeed());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reload() {
    current = undefined;
    listeners.forEach((listener) => listener(this.read()));
  },
};
if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === `dubai-bayt:${KEY}` || event.key === null) mockDatabase.reload();
  });
