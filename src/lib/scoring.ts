// Pure scoring engine — no I/O, no Next.js imports.
//
// ── Points per prediction ─────────────────────────────────────────────────────
//
//   Correct winner                        = +10 pts base
//   Correct winner + score within range   = +5 pts per team  → max +20
//   Wrong winner                          = -5 pts
//   Wrong winner + score within range     = +2 pts per team  → max -1
//   Tie / No Result / Abandoned           =  0 pts  (voided, no penalty)
//
// ── Score tolerance by format ─────────────────────────────────────────────────
//
//   T10  ±10 runs   T20  ±15 runs   ODI  ±25 runs   TEST / OTHER  ±40 runs
//
// ── Early prediction multiplier (on positive totals only) ────────────────────
//
//   Predicted > 48 h before match start  → ×1.5
//   Predicted  12–48 h before            → ×1.25
//   Predicted  < 12 h before             → ×1.0  (no bonus)
//
// ── Starting balance ──────────────────────────────────────────────────────────
//
//   Every new user receives 200 pts. Prediction outcomes add / subtract from
//   this balance in real time.

import type { Prediction, CricketMatch, LeaderboardEntry, MatchType, User } from '@/types';
import { STARTING_BALANCE, PREDICTION_STAKE } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreTolerance(matchType: MatchType): number {
  switch (matchType) {
    case 'T10':  return 10;
    case 'T20':  return 15;
    case 'ODI':  return 25;
    case 'TEST': return 40;
    default:     return 20;
  }
}

function earlyMultiplier(pred: Prediction, match: CricketMatch): number {
  const hoursAhead =
    (match.startTime.getTime() - pred.createdAt.getTime()) / 3_600_000;
  if (hoursAhead > 48) return 1.5;
  if (hoursAhead > 12) return 1.25;
  return 1.0;
}

/** Extract the winning team name from a result string ("CSK won by 5 wickets" → "CSK"). */
export function extractWinner(result: string): string | null {
  const m = result.match(/^(.+?)\s+won\s+by/i);
  return m ? m[1].trim() : null;
}

// ── Core scoring ──────────────────────────────────────────────────────────────

/** Calculate points earned/lost by a single prediction against a completed match. */
export function calcPoints(pred: Prediction, match: CricketMatch): number {
  if (match.status !== 'COMPLETED' || !match.result) return 0;

  const winner = extractWinner(match.result);
  // Tie / abandoned / no result → void prediction (0 pts, no penalty)
  if (!winner) return 0;

  const isCorrectWinner =
    pred.predictedWinner.toLowerCase() === winner.toLowerCase();
  const tol = scoreTolerance(match.matchType);

  const homeClose =
    pred.predictedHomeRuns !== undefined && match.homeScore !== undefined
      ? Math.abs(pred.predictedHomeRuns - match.homeScore.runs) <= tol
      : false;

  const awayClose =
    pred.predictedAwayRuns !== undefined && match.awayScore !== undefined
      ? Math.abs(pred.predictedAwayRuns - match.awayScore.runs) <= tol
      : false;

  let pts: number;

  if (isCorrectWinner) {
    pts = 10;
    if (homeClose) pts += 5;
    if (awayClose) pts += 5;
    // Early-prediction multiplier applies only to positive winnings.
    const mult = earlyMultiplier(pred, match);
    if (mult > 1) pts = Math.round(pts * mult);
  } else {
    // Wrong winner penalty — partial credit if scores were close.
    pts = -5;
    if (homeClose) pts += 2;
    if (awayClose) pts += 2;
    // No multiplier applied to losses.
  }

  return pts;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface ScoringResult {
  /** Predictions that were newly evaluated in this run. Caller persists these. */
  newlyScored: Prediction[];
  /** Full leaderboard sorted by totalPoints desc. */
  leaderboard: LeaderboardEntry[];
  /** Balance updates the caller must persist to the UserStore. */
  userBalanceUpdates: Array<{ userId: string; newBalance: number }>;
}

/**
 * Score all unscored predictions for completed matches and compute the leaderboard.
 *
 * Pure function — returns what *should* be written back to storage;
 * the caller is responsible for persisting `newlyScored` and `userBalanceUpdates`.
 *
 * @param userBalanceMap  userId → current stored balance (defaults to STARTING_BALANCE if absent)
 */
export function computeLeaderboard(
  predictions: Prediction[],
  matches: CricketMatch[],
  userBalanceMap: Map<string, number> = new Map(),
): ScoringResult {
  const matchMap = new Map(matches.map((m) => [m.id, m]));
  const newlyScored: Prediction[] = [];

  // Evaluate any unscored predictions against completed matches.
  const allEvaluated = predictions.map((pred) => {
    if (pred.scored) return pred;
    const match = matchMap.get(pred.matchId);
    if (!match || match.status !== 'COMPLETED') return pred;

    const pts = calcPoints(pred, match);
    const scored: Prediction = { ...pred, points: pts, scored: true };
    newlyScored.push(scored);
    return scored;
  });

  // Aggregate per-user stats.
  type UserBucket = {
    userId: string; userName: string;
    totalPoints: number; predictionsCount: number;
    scoredCount: number; correctCount: number;
  };
  const byUser = new Map<string, UserBucket>();

  for (const pred of allEvaluated) {
    const bucket = byUser.get(pred.userId) ?? {
      userId: pred.userId,
      userName: pred.userName || pred.userId,
      totalPoints: 0,
      predictionsCount: 0,
      scoredCount: 0,
      correctCount: 0,
    };
    bucket.predictionsCount += 1;
    if (pred.scored) {
      bucket.scoredCount += 1;
      bucket.totalPoints += pred.points ?? 0;            // net after stake (can be negative)
      if ((pred.points ?? 0) >= 10) bucket.correctCount += 1;
    }
    byUser.set(pred.userId, bucket);
  }

  // Build balance-delta map from newly scored predictions.
  // Each scored prediction returns the stake that was deducted at submit time,
  // plus the net points earned/lost.  Total = stake + calcPoints().
  // For void matches calcPoints() = 0 so only the stake is returned.
  const deltaByUser = new Map<string, number>();
  for (const pred of newlyScored) {
    const stakeReturn = pred.stake ?? PREDICTION_STAKE;
    deltaByUser.set(
      pred.userId,
      (deltaByUser.get(pred.userId) ?? 0) + stakeReturn + (pred.points ?? 0),
    );
  }

  // Balance updates for the caller to persist.
  const userBalanceUpdates = [...deltaByUser.entries()].map(([userId, delta]) => ({
    userId,
    newBalance: (userBalanceMap.get(userId) ?? STARTING_BALANCE) + delta,
  }));

  // Sort and annotate with rank + accuracy + post-update balance.
  const leaderboard: LeaderboardEntry[] = [...byUser.values()]
    .sort(
      (a, b) =>
        b.totalPoints  - a.totalPoints  ||
        b.correctCount - a.correctCount ||
        a.userName.localeCompare(b.userName),
    )
    .map((u, i) => {
      const storedBalance = userBalanceMap.get(u.userId) ?? STARTING_BALANCE;
      const delta         = deltaByUser.get(u.userId) ?? 0;
      return {
        ...u,
        rank:     i + 1,
        balance:  storedBalance + delta,
        accuracy: u.scoredCount > 0
          ? Math.round((u.correctCount / u.scoredCount) * 100)
          : 0,
      };
    });

  return { newlyScored, leaderboard, userBalanceUpdates };
}

// ── Per-match leaderboard ─────────────────────────────────────────────────────

import type { MatchLeaderboardEntry } from '@/types';

/** Rank all predictions for a single match. Works for any match status. */
export function computeMatchLeaderboard(
  predictions: Prediction[],
  match: CricketMatch,
): MatchLeaderboardEntry[] {
  const winner =
    match.status === 'COMPLETED' && match.result
      ? extractWinner(match.result)
      : null;

  return predictions
    .map((pred) => {
      const pts =
        match.status === 'COMPLETED'
          ? calcPoints(pred, match)
          : undefined;

      return {
        userId:            pred.userId,
        userName:          pred.userName,
        predictedWinner:   pred.predictedWinner,
        predictedHomeRuns: pred.predictedHomeRuns,
        predictedAwayRuns: pred.predictedAwayRuns,
        points:            pts,
        isCorrectWinner:   winner
          ? pred.predictedWinner.toLowerCase() === winner.toLowerCase()
          : false,
        rank: 0,
      };
    })
    .sort((a, b) => {
      // Completed: sort by points desc. Pending: alphabetical.
      if (a.points !== undefined && b.points !== undefined)
        return b.points - a.points;
      return a.userName.localeCompare(b.userName);
    })
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

// Re-export STARTING_BALANCE for convenience.
export { STARTING_BALANCE };

// ── Scoring rules (used by the Rules page) ────────────────────────────────────

export interface ScoringRule {
  condition: string;
  points: string;
  note?: string;
}

export const SCORING_RULES: ScoringRule[] = [
  { condition: 'Correct winner prediction',              points: '+10 pts'          },
  { condition: 'Correct winner + home runs within range', points: '+5 pts'          },
  { condition: 'Correct winner + away runs within range', points: '+5 pts'          },
  { condition: 'Wrong winner',                           points: '−5 pts',
    note: 'Penalty for wrong calls — keeps it competitive' },
  { condition: 'Wrong winner but home runs within range', points: '+2 pts',
    note: 'Partial credit offsets some of the penalty'     },
  { condition: 'Wrong winner but away runs within range', points: '+2 pts'          },
  { condition: 'Match tied / abandoned / no result',     points: '0 pts',
    note: 'Voided — no gain, no loss'                      },
];

export const SCORE_TOLERANCES: Array<{ format: string; tolerance: string }> = [
  { format: 'T10', tolerance: '±10 runs' },
  { format: 'T20', tolerance: '±15 runs' },
  { format: 'ODI', tolerance: '±25 runs' },
  { format: 'TEST', tolerance: '±40 runs' },
];

export const MULTIPLIER_RULES: Array<{ window: string; multiplier: string }> = [
  { window: 'More than 48 h before match', multiplier: '×1.5 on positive points' },
  { window: '12–48 h before match',        multiplier: '×1.25 on positive points' },
  { window: 'Less than 12 h before match', multiplier: '×1.0 (no bonus)'         },
];
