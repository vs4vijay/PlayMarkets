// SqliteStore — persists predictions to a local SQLite database via better-sqlite3.
// Intended for self-hosted / long-running server deployments.
// better-sqlite3 is synchronous; async wrappers are thin shims so the interface stays uniform.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Prediction } from '@/types';
import type { PredictionStore } from './types';

interface Row { data: string }

function revive(raw: Record<string, unknown>): Prediction {
  return {
    ...(raw as unknown as Prediction),
    createdAt: new Date(raw.createdAt as string),
  };
}

function serialize(p: Prediction): string {
  return JSON.stringify({ ...p, createdAt: p.createdAt.toISOString() });
}

export class SqliteStore implements PredictionStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS predictions (
        id      TEXT PRIMARY KEY,
        userId  TEXT NOT NULL,
        matchId TEXT NOT NULL,
        data    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pred_user  ON predictions (userId);
      CREATE INDEX IF NOT EXISTS idx_pred_match ON predictions (matchId);
    `);
  }

  async savePrediction(p: Prediction): Promise<void> {
    this.db
      .prepare('INSERT INTO predictions (id, userId, matchId, data) VALUES (?, ?, ?, ?)')
      .run(p.id, p.userId, p.matchId, serialize(p));
  }

  async getPrediction(userId: string, matchId: string): Promise<Prediction | null> {
    const row = this.db
      .prepare('SELECT data FROM predictions WHERE userId = ? AND matchId = ?')
      .get(userId, matchId) as Row | undefined;
    return row ? revive(JSON.parse(row.data)) : null;
  }

  async getPredictionsByUser(userId: string): Promise<Prediction[]> {
    const rows = this.db
      .prepare('SELECT data FROM predictions WHERE userId = ? ORDER BY rowid DESC')
      .all(userId) as Row[];
    return rows.map((r) => revive(JSON.parse(r.data)));
  }

  async getPredictionsByMatch(matchId: string): Promise<Prediction[]> {
    const rows = this.db
      .prepare('SELECT data FROM predictions WHERE matchId = ?')
      .all(matchId) as Row[];
    return rows.map((r) => revive(JSON.parse(r.data)));
  }

  async getAllPredictions(): Promise<Prediction[]> {
    const rows = this.db
      .prepare('SELECT data FROM predictions')
      .all() as Row[];
    return rows.map((r) => revive(JSON.parse(r.data)));
  }

  async updatePrediction(id: string, patch: Partial<Omit<Prediction, 'id'>>): Promise<void> {
    const row = this.db
      .prepare('SELECT data FROM predictions WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) return;
    const existing = revive(JSON.parse(row.data));
    const updated = { ...existing, ...patch };
    this.db
      .prepare('UPDATE predictions SET data = ? WHERE id = ?')
      .run(serialize(updated), id);
  }
}

declare global { var __pmSqliteStore: SqliteStore | undefined; }

export function makeSqliteStore(dbPath: string): SqliteStore {
  if (!globalThis.__pmSqliteStore) {
    globalThis.__pmSqliteStore = new SqliteStore(dbPath);
  }
  return globalThis.__pmSqliteStore;
}
