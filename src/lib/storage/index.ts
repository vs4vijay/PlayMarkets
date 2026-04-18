// Storage factory — reads STORAGE_BACKEND env var and returns the correct singleton.
//
// STORAGE_BACKEND=memory   (default) — in-memory, resets on process restart
// STORAGE_BACKEND=json     — JSON file at STORAGE_PATH/predictions.json
// STORAGE_BACKEND=sqlite   — SQLite DB at STORAGE_PATH/playmarkets.db
//
// STORAGE_PATH defaults to ./data (relative to project root).

import path from 'node:path';
import type { PredictionStore } from './types';
import { memoryStore } from './memory';
import { makeJsonStore } from './json';

export type { PredictionStore } from './types';

export function getStore(): PredictionStore {
  const backend = process.env.STORAGE_BACKEND ?? 'memory';
  const storagePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.STORAGE_PATH ?? 'data',
  );

  switch (backend) {
    case 'json':
      return makeJsonStore(path.join(storagePath, 'predictions.json'));

    case 'sqlite': {
      // Dynamic require keeps better-sqlite3 optional at boot time.
      // turbopackIgnore prevents the NFT tracer from crawling the whole project.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { makeSqliteStore } = require(/* turbopackIgnore: true */ './sqlite') as typeof import('./sqlite');
      return makeSqliteStore(path.join(storagePath, 'playmarkets.db'));
    }

    case 'memory':
    default:
      return memoryStore;
  }
}
