// InMemoryStore — Map-backed, zero dependencies.
// Survives Next.js dev hot-reloads via the globalThis singleton pattern.

import type { Prediction } from '@/types';
import type { PredictionStore } from './types';

export class InMemoryStore implements PredictionStore {
  private data = new Map<string, Prediction>();

  async savePrediction(p: Prediction): Promise<void> {
    this.data.set(p.id, { ...p });
  }

  async getPrediction(userId: string, matchId: string): Promise<Prediction | null> {
    for (const p of this.data.values()) {
      if (p.userId === userId && p.matchId === matchId) return { ...p };
    }
    return null;
  }

  async getPredictionsByUser(userId: string): Promise<Prediction[]> {
    return [...this.data.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPredictionsByMatch(matchId: string): Promise<Prediction[]> {
    return [...this.data.values()].filter((p) => p.matchId === matchId);
  }

  async getAllPredictions(): Promise<Prediction[]> {
    return [...this.data.values()];
  }

  async updatePrediction(id: string, patch: Partial<Omit<Prediction, 'id'>>): Promise<void> {
    const existing = this.data.get(id);
    if (existing) this.data.set(id, { ...existing, ...patch });
  }
}

// Singleton — persists across HMR cycles in development.
declare global { var __pmMemoryStore: InMemoryStore | undefined; }
if (!globalThis.__pmMemoryStore) globalThis.__pmMemoryStore = new InMemoryStore();
export const memoryStore: InMemoryStore = globalThis.__pmMemoryStore;
