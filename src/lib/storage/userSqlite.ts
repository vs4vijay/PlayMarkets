// SqliteUserStore — persists users to the same SQLite database as predictions.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { User } from '@/types';
import type { UserStore } from './userTypes';

interface Row { data: string }

function revive(raw: Record<string, unknown>): User {
  return {
    ...(raw as unknown as User),
    createdAt: new Date(raw.createdAt as string),
  };
}

function serialize(u: User): string {
  return JSON.stringify({ ...u, createdAt: u.createdAt.toISOString() });
}

export class SqliteUserStore implements UserStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id   TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_name ON users (name);
    `);
  }

  async createUser(user: User): Promise<void> {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO users (id, name, data) VALUES (?, ?, ?)',
      )
      .run(user.id, user.name, serialize(user));
  }

  async getUser(userId: string): Promise<User | null> {
    const row = this.db
      .prepare('SELECT data FROM users WHERE id = ?')
      .get(userId) as Row | undefined;
    return row ? revive(JSON.parse(row.data)) : null;
  }

  async getUserByName(name: string): Promise<User | null> {
    const row = this.db
      .prepare('SELECT data FROM users WHERE LOWER(name) = LOWER(?)')
      .get(name) as Row | undefined;
    return row ? revive(JSON.parse(row.data)) : null;
  }

  async updateUser(userId: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
    const row = this.db
      .prepare('SELECT data FROM users WHERE id = ?')
      .get(userId) as Row | undefined;
    if (!row) return;
    const existing = revive(JSON.parse(row.data));
    const updated = { ...existing, ...patch };
    this.db
      .prepare('UPDATE users SET name = ?, data = ? WHERE id = ?')
      .run(updated.name, serialize(updated), userId);
  }

  async getAllUsers(): Promise<User[]> {
    const rows = this.db
      .prepare('SELECT data FROM users')
      .all() as Row[];
    return rows.map((r) => revive(JSON.parse(r.data)));
  }
}

declare global { var __pmSqliteUserStore: SqliteUserStore | undefined; }

export function makeSqliteUserStore(dbPath: string): SqliteUserStore {
  if (!globalThis.__pmSqliteUserStore) {
    globalThis.__pmSqliteUserStore = new SqliteUserStore(dbPath);
  }
  return globalThis.__pmSqliteUserStore;
}
