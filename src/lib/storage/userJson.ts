// JsonFileUserStore — persists users to a JSON file alongside predictions.json.

import fs from 'node:fs/promises';
import path from 'node:path';
import type { User } from '@/types';
import type { UserStore } from './userTypes';

function revive(raw: Record<string, unknown>): User {
  return {
    ...(raw as unknown as User),
    createdAt: new Date(raw.createdAt as string),
  };
}

function serialize(users: User[]): string {
  return JSON.stringify(
    users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    null,
    2,
  );
}

export class JsonFileUserStore implements UserStore {
  private cache: User[] | null = null;

  constructor(private readonly filePath: string) {}

  private async load(): Promise<User[]> {
    if (this.cache !== null) return this.cache;
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.cache = (JSON.parse(content) as Record<string, unknown>[]).map(revive);
    } catch {
      this.cache = [];
    }
    return this.cache;
  }

  private async flush(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, serialize(this.cache!));
  }

  async createUser(user: User): Promise<void> {
    const list = await this.load();
    if (!list.find((u) => u.id === user.id)) {
      list.push({ ...user });
      await this.flush();
    }
  }

  async getUser(userId: string): Promise<User | null> {
    const list = await this.load();
    return list.find((u) => u.id === userId) ?? null;
  }

  async getUserByName(name: string): Promise<User | null> {
    const list = await this.load();
    const lower = name.toLowerCase();
    return list.find((u) => u.name.toLowerCase() === lower) ?? null;
  }

  async updateUser(userId: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
    const list = await this.load();
    const idx = list.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch };
      await this.flush();
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.load();
  }
}

declare global { var __pmJsonUserStore: JsonFileUserStore | undefined; }

export function makeJsonUserStore(filePath: string): JsonFileUserStore {
  if (!globalThis.__pmJsonUserStore) {
    globalThis.__pmJsonUserStore = new JsonFileUserStore(filePath);
  }
  return globalThis.__pmJsonUserStore;
}
