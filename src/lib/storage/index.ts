// Storage factory — reads STORAGE_BACKEND env var and returns the correct singleton.
//
// STORAGE_BACKEND=memory   (default) — in-memory, resets on process restart
// STORAGE_BACKEND=json     — JSON files at STORAGE_PATH/predictions.json + users.json
// STORAGE_BACKEND=sqlite   — SQLite DB at STORAGE_PATH/playmarkets.db
//
// STORAGE_PATH defaults to ./data (relative to project root).

import path from 'node:path';
import type { PredictionStore } from './types';
import type { UserStore } from './userTypes';
import type { ReactionStore } from './reactionTypes';
import { memoryStore } from './memory';
import { memoryUserStore } from './userMemory';
import { reactionStore } from './reactionMemory';
import { makeJsonStore } from './json';
import { makeJsonUserStore } from './userJson';
import { makeJsonReactionStore } from './reactionJson';

export type { PredictionStore } from './types';
export type { UserStore } from './userTypes';
export type { ReactionStore } from './reactionTypes';

function storagePath(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.STORAGE_PATH ?? 'data',
  );
}

function backend(): string {
  return process.env.STORAGE_BACKEND ?? 'memory';
}

export function getStore(): PredictionStore {
  switch (backend()) {
    case 'json':
      return makeJsonStore(path.join(storagePath(), 'predictions.json'));

    case 'sqlite': {
      // Dynamic require keeps better-sqlite3 optional at boot time.
      // turbopackIgnore prevents the NFT tracer from crawling the whole project.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { makeSqliteStore } = require(/* turbopackIgnore: true */ './sqlite') as typeof import('./sqlite');
      return makeSqliteStore(path.join(storagePath(), 'playmarkets.db'));
    }

    case 'memory':
    default:
      return memoryStore;
  }
}

export function getReactionStore(): ReactionStore {
  switch (backend()) {
    case 'json':
      return makeJsonReactionStore(path.join(storagePath(), 'reactions.json'));

    case 'sqlite': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { makeSqliteReactionStore } = require(/* turbopackIgnore: true */ './reactionSqlite') as typeof import('./reactionSqlite');
      return makeSqliteReactionStore(path.join(storagePath(), 'playmarkets.db'));
    }

    case 'memory':
    default:
      return reactionStore;
  }
}

export function getUserStore(): UserStore {
  switch (backend()) {
    case 'json':
      return makeJsonUserStore(path.join(storagePath(), 'users.json'));

    case 'sqlite': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { makeSqliteUserStore } = require(/* turbopackIgnore: true */ './userSqlite') as typeof import('./userSqlite');
      return makeSqliteUserStore(path.join(storagePath(), 'playmarkets.db'));
    }

    case 'memory':
    default:
      return memoryUserStore;
  }
}
