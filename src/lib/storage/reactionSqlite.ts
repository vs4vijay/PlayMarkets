// SqliteReactionStore — persists reactions to the shared SQLite database.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactionType } from '@/types';
import type { ReactionStore } from './reactionTypes';

const REACTION_TYPES: ReactionType[] = ['🔥', '💪', '😭', '🙌', '😱', '👀'];

interface ReactionRow {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  type: string;
  createdAt: string;
}

interface CountRow { type: string; n: number }

export class SqliteReactionStore implements ReactionStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reactions (
        id        TEXT PRIMARY KEY,
        matchId   TEXT NOT NULL,
        userId    TEXT NOT NULL,
        userName  TEXT NOT NULL,
        type      TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reaction_unique
        ON reactions (matchId, userId, type);
      CREATE INDEX IF NOT EXISTS idx_reaction_match
        ON reactions (matchId);
    `);
  }

  async toggle(
    matchId: string,
    userId: string,
    userName: string,
    type: ReactionType,
  ): Promise<{ added: boolean }> {
    const existing = this.db
      .prepare('SELECT id FROM reactions WHERE matchId = ? AND userId = ? AND type = ?')
      .get(matchId, userId, type);

    if (existing) {
      this.db
        .prepare('DELETE FROM reactions WHERE matchId = ? AND userId = ? AND type = ?')
        .run(matchId, userId, type);
      return { added: false };
    }

    this.db
      .prepare(
        'INSERT INTO reactions (id, matchId, userId, userName, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        `r-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        matchId,
        userId,
        userName,
        type,
        new Date().toISOString(),
      );
    return { added: true };
  }

  async getCounts(matchId: string): Promise<Record<ReactionType, number>> {
    const counts = Object.fromEntries(
      REACTION_TYPES.map((t) => [t, 0]),
    ) as Record<ReactionType, number>;
    const rows = this.db
      .prepare('SELECT type, COUNT(*) as n FROM reactions WHERE matchId = ? GROUP BY type')
      .all(matchId) as CountRow[];
    for (const row of rows) {
      if (row.type in counts) counts[row.type as ReactionType] = row.n;
    }
    return counts;
  }

  async getUserReactions(matchId: string, userId: string): Promise<ReactionType[]> {
    const rows = this.db
      .prepare('SELECT type FROM reactions WHERE matchId = ? AND userId = ?')
      .all(matchId, userId) as Pick<ReactionRow, 'type'>[];
    return rows.map((r) => r.type as ReactionType);
  }
}

declare global { var __pmSqliteReactionStore: SqliteReactionStore | undefined; }

export function makeSqliteReactionStore(dbPath: string): SqliteReactionStore {
  if (!globalThis.__pmSqliteReactionStore) {
    globalThis.__pmSqliteReactionStore = new SqliteReactionStore(dbPath);
  }
  return globalThis.__pmSqliteReactionStore;
}
