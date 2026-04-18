// JsonFileStore — persists predictions to a single JSON file.
// Intended for local development and simple single-process deployments.
// Not safe for concurrent writes (multiple processes / serverless).

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Prediction } from '@/types';
import type { PredictionStore } from './types';

function revive(raw: Record<string, unknown>): Prediction {
  return {
    ...(raw as unknown as Prediction),
    createdAt: new Date(raw.createdAt as string),
  };
}

function serialize(predictions: Prediction[]): string {
  return JSON.stringify(
    predictions.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    null,
    2,
  );
}

export class JsonFileStore implements PredictionStore {
  private cache: Prediction[] | null = null;

  constructor(private readonly filePath: string) {}

  private async load(): Promise<Prediction[]> {
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

  async savePrediction(p: Prediction): Promise<void> {
    const list = await this.load();
    list.push({ ...p });
    await this.flush();
  }

  async getPrediction(userId: string, matchId: string): Promise<Prediction | null> {
    const list = await this.load();
    return list.find((p) => p.userId === userId && p.matchId === matchId) ?? null;
  }

  async getPredictionsByUser(userId: string): Promise<Prediction[]> {
    const list = await this.load();
    return list
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPredictionsByMatch(matchId: string): Promise<Prediction[]> {
    const list = await this.load();
    return list.filter((p) => p.matchId === matchId);
  }

  async getAllPredictions(): Promise<Prediction[]> {
    return this.load();
  }

  async updatePrediction(id: string, patch: Partial<Omit<Prediction, 'id'>>): Promise<void> {
    const list = await this.load();
    const idx = list.findIndex((p) => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch };
      await this.flush();
    }
  }
}

declare global { var __pmJsonStore: JsonFileStore | undefined; }

export function makeJsonStore(filePath: string): JsonFileStore {
  if (!globalThis.__pmJsonStore) {
    globalThis.__pmJsonStore = new JsonFileStore(filePath);
  }
  return globalThis.__pmJsonStore;
}
