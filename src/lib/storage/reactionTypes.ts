import type { ReactionType } from '@/types';

export interface ReactionStore {
  /** Toggle a reaction (adds if absent, removes if present). Returns whether it was added. */
  toggle(
    matchId: string,
    userId: string,
    userName: string,
    type: ReactionType,
  ): Promise<{ added: boolean }>;

  /** Aggregate counts per reaction type for a match. */
  getCounts(matchId: string): Promise<Record<ReactionType, number>>;

  /** Which types the user has reacted with on this match. */
  getUserReactions(matchId: string, userId: string): Promise<ReactionType[]>;
}
