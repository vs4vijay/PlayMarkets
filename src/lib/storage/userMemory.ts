// InMemoryUserStore — Map-backed, zero dependencies.
// Survives Next.js dev hot-reloads via the globalThis singleton pattern.

import type { User } from '@/types';
import type { UserStore } from './userTypes';

export class InMemoryUserStore implements UserStore {
  private data = new Map<string, User>();

  async createUser(user: User): Promise<void> {
    if (!this.data.has(user.id)) {
      this.data.set(user.id, { ...user });
    }
  }

  async getUser(userId: string): Promise<User | null> {
    return this.data.get(userId) ?? null;
  }

  async getUserByName(name: string): Promise<User | null> {
    const lower = name.toLowerCase();
    for (const u of this.data.values()) {
      if (u.name.toLowerCase() === lower) return { ...u };
    }
    return null;
  }

  async updateUser(userId: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
    const existing = this.data.get(userId);
    if (existing) this.data.set(userId, { ...existing, ...patch });
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.data.values()];
  }
}

declare global { var __pmMemoryUserStore: InMemoryUserStore | undefined; }
if (!globalThis.__pmMemoryUserStore) globalThis.__pmMemoryUserStore = new InMemoryUserStore();
export const memoryUserStore: InMemoryUserStore = globalThis.__pmMemoryUserStore;
