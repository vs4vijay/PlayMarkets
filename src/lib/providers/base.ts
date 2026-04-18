// Base interface that every cricket data provider must implement.
// Add a new provider by implementing this interface and registering it in index.ts.

import type { CricketMatch } from '@/types';

export interface CricketProvider {
  /** Human-readable provider name shown in debug info */
  readonly name: string;

  /** All matches (live + upcoming + recent) */
  getMatches(): Promise<CricketMatch[]>;

  /** Currently in-progress matches only */
  getLiveMatches(): Promise<CricketMatch[]>;

  /** Scheduled / upcoming matches only */
  getUpcomingMatches(): Promise<CricketMatch[]>;

  /** Recently completed matches */
  getRecentMatches(): Promise<CricketMatch[]>;

  /** Single match by provider-specific ID */
  getMatchById(id: string): Promise<CricketMatch | null>;
}
