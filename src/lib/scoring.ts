// Pure scoring engine — no I/O, no Next.js imports.
// Takes predictions + matches and returns scored predictions and a ranked leaderboard.
//
// Points per prediction:
//   Correct winner          = 10 pts
//   Home runs within ±15    = +5 pts  (only when winner is correct)
//   Away runs within ±15    = +5 pts  (only when winner is correct)
//   Maximum per prediction  = 20 pts

import type { Prediction, CricketMatch, LeaderboardEntry } from '@/types';

/** Extract the winning team name from a result string ("CSK won by 5 wickets" → "CSK"). */
export function extractWinner(result: string): string | null {
  const m = result.match(/^(.+?)\s+won\s+by/i);
  return m ? m[1].trim() : null;
}

/** Calculate points earned by a single prediction against a completed match. */
export function calcPoints(pred: Prediction, match: CricketMatch): number {
  if (match.status !== 'COMPLETED' || !match.result) return 0;

  const winner = extractWinner(match.result);
  if (!winner) return 0;
  if (pred.predictedWinner.toLowerCase() !== winner.toLowerCase()) return 0;

  let pts = 10; // correct winner

  if (pred.predictedHomeRuns !== undefined && match.homeScore !== undefined) {
    if (Math.abs(pred.predictedHomeRuns - match.homeScore.runs) <= 15) pts += 5;
  }
  if (pred.predictedAwayRuns !== undefined && match.awayScore !== undefined) {
    if (Math.abs(pred.predictedAwayRuns - match.awayScore.runs) <= 15) pts += 5;
  }

  return pts;
}

export interface ScoringResult {
  /** Predictions that were newly scored in this run (were unscored, match now complete). */
  newlyScored: Prediction[];
  /** Full leaderboard sorted by totalPoints desc. */
  leaderboard: LeaderboardEntry[];
}

/**
 * Score all unscored predictions for completed matches and compute the leaderboard.
 *
 * This function is pure — it returns what *should* be written back to storage;
 * the caller is responsible for persisting `newlyScored`.
 */
export function computeLeaderboard(
  predictions: Prediction[],
  matches: CricketMatch[],
): ScoringResult {
  const matchMap = new Map(matches.map((m) => [m.id, m]));
  const newlyScored: Prediction[] = [];

  // Apply scoring to any unscored predictions where the match is now complete.
  const allEvaluated = predictions.map((pred) => {
    if (pred.scored) return pred;
    const match = matchMap.get(pred.matchId);
    if (!match || match.status !== 'COMPLETED') return pred;

    const pts = calcPoints(pred, match);
    const scored: Prediction = { ...pred, points: pts, scored: true };
    newlyScored.push(scored);
    return scored;
  });

  // Aggregate per user.
  const byUser = new Map<string, {
    userId: string; userName: string;
    totalPoints: number; predictionsCount: number;
    scoredCount: number; correctCount: number;
  }>();

  for (const pred of allEvaluated) {
    const entry = byUser.get(pred.userId) ?? {
      userId: pred.userId,
      userName: pred.userName || pred.userId,
      totalPoints: 0,
      predictionsCount: 0,
      scoredCount: 0,
      correctCount: 0,
    };
    entry.predictionsCount += 1;
    if (pred.scored) {
      entry.scoredCount += 1;
      entry.totalPoints += pred.points ?? 0;
      if ((pred.points ?? 0) >= 10) entry.correctCount += 1;
    }
    byUser.set(pred.userId, entry);
  }

  // Sort and annotate with rank + accuracy.
  const leaderboard: LeaderboardEntry[] = [...byUser.values()]
    .sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      b.correctCount - a.correctCount ||
      a.userName.localeCompare(b.userName),
    )
    .map((u, i) => ({
      ...u,
      rank: i + 1,
      accuracy: u.scoredCount > 0
        ? Math.round((u.correctCount / u.scoredCount) * 100)
        : 0,
    }));

  return { newlyScored, leaderboard };
}
