import type { Reaction, ReactionType } from '@/types';
import type { ReactionStore } from './reactionTypes';

const REACTION_TYPES: ReactionType[] = ['🔥', '💪', '😭', '🙌', '😱', '👀'];

class InMemoryReactionStore implements ReactionStore {
  private reactions: Reaction[] = [];

  async toggle(
    matchId: string,
    userId: string,
    userName: string,
    type: ReactionType,
  ): Promise<{ added: boolean }> {
    const idx = this.reactions.findIndex(
      (r) => r.matchId === matchId && r.userId === userId && r.type === type,
    );
    if (idx >= 0) {
      this.reactions.splice(idx, 1);
      return { added: false };
    }
    this.reactions.push({
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      matchId,
      userId,
      userName,
      createdAt: new Date(),
    });
    return { added: true };
  }

  async getCounts(matchId: string): Promise<Record<ReactionType, number>> {
    const counts = Object.fromEntries(
      REACTION_TYPES.map((t) => [t, 0]),
    ) as Record<ReactionType, number>;
    for (const r of this.reactions) {
      if (r.matchId === matchId) counts[r.type]++;
    }
    return counts;
  }

  async getUserReactions(matchId: string, userId: string): Promise<ReactionType[]> {
    return this.reactions
      .filter((r) => r.matchId === matchId && r.userId === userId)
      .map((r) => r.type);
  }
}

const g = globalThis as typeof globalThis & { __pmReactionStore?: ReactionStore };
if (!g.__pmReactionStore) g.__pmReactionStore = new InMemoryReactionStore();
export const reactionStore = g.__pmReactionStore;
