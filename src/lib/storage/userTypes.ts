// UserStore — interface every user backend must implement.

import type { User } from '@/types';

export interface UserStore {
  /** Persist a new user. No-op (or upsert) if id already exists. */
  createUser(user: User): Promise<void>;

  /** Get user by id, or null if not found. */
  getUser(userId: string): Promise<User | null>;

  /** Get user by name (case-insensitive), or null if not found. */
  getUserByName(name: string): Promise<User | null>;

  /** Partial update by id — e.g. set new balance. No-op if id not found. */
  updateUser(userId: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void>;

  /** All stored users — used for leaderboard computation. */
  getAllUsers(): Promise<User[]>;
}
