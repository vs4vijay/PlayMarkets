// JsonReactionStore — persists reactions to a single JSON file.
// Shares the same concurrency caveats as JsonFileStore (single process only).

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Reaction, ReactionType } from '@/types';
import type { ReactionStore } from './reactionTypes';

const REACTION_TYPES: ReactionType[] = ['🔥', '💪', '😭', '🙌', '😱', '👀'];

function revive(raw: Record<string, unknown>): Reaction {
  return { ...(raw as unknown as Reaction), createdAt: new Date(raw.createdAt as string) };
}

export class JsonReactionStore implements ReactionStore {
  private cache: Reaction[] | null = null;

  constructor(private readonly filePath: string) {}

  private async load(): Promise<Reaction[]> {
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
    await fs.writeFile(
      this.filePath,
      JSON.stringify(
        this.cache!.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        null,
        2,
      ),
    );
  }

  async toggle(
    matchId: string,
    userId: string,
    userName: string,
    type: ReactionType,
  ): Promise<{ added: boolean }> {
    const list = await this.load();
    const idx = list.findIndex(
      (r) => r.matchId === matchId && r.userId === userId && r.type === type,
    );
    if (idx >= 0) {
      list.splice(idx, 1);
      await this.flush();
      return { added: false };
    }
    list.push({
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      matchId,
      userId,
      userName,
      createdAt: new Date(),
    });
    await this.flush();
    return { added: true };
  }

  async getCounts(matchId: string): Promise<Record<ReactionType, number>> {
    const list = await this.load();
    const counts = Object.fromEntries(
      REACTION_TYPES.map((t) => [t, 0]),
    ) as Record<ReactionType, number>;
    for (const r of list) {
      if (r.matchId === matchId) counts[r.type]++;
    }
    return counts;
  }

  async getUserReactions(matchId: string, userId: string): Promise<ReactionType[]> {
    const list = await this.load();
    return list
      .filter((r) => r.matchId === matchId && r.userId === userId)
      .map((r) => r.type);
  }
}

declare global { var __pmJsonReactionStore: JsonReactionStore | undefined; }

export function makeJsonReactionStore(filePath: string): JsonReactionStore {
  if (!globalThis.__pmJsonReactionStore) {
    globalThis.__pmJsonReactionStore = new JsonReactionStore(filePath);
  }
  return globalThis.__pmJsonReactionStore;
}
