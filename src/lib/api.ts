// Client-side API helpers — fetch data via Next.js route handlers.
// No API keys used here; all secrets stay server-side.

import type { CricketMatch, Prediction, LeaderboardEntry, MatchLeaderboardEntry, User } from '@/types';

/** Revive ISO date strings back to Date objects after JSON.parse */
function reviveMatch(raw: Record<string, unknown>): CricketMatch {
  return {
    ...(raw as unknown as CricketMatch),
    startTime: new Date(raw.startTime as string),
  };
}

async function fetchMatches(params?: string): Promise<CricketMatch[]> {
  const url = params ? `/api/matches?${params}` : '/api/matches';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`);
  const json = await res.json();
  return (json.matches as Record<string, unknown>[]).map(reviveMatch);
}

export async function getMatches(): Promise<CricketMatch[]> {
  return fetchMatches();
}

export async function getLiveMatches(): Promise<CricketMatch[]> {
  return fetchMatches('filter=live');
}

export async function getUpcomingMatches(): Promise<CricketMatch[]> {
  return fetchMatches('filter=upcoming');
}

export async function getRecentMatches(): Promise<CricketMatch[]> {
  return fetchMatches('filter=recent');
}

export async function getMatchById(id: string): Promise<CricketMatch | null> {
  const res = await fetch(`/api/matches?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch match: ${res.status}`);
  const json = await res.json();
  return reviveMatch(json.match as Record<string, unknown>);
}

// ── Users ─────────────────────────────────────────────────────────────────────

function reviveUser(raw: Record<string, unknown>): User {
  return { ...(raw as unknown as User), createdAt: new Date(raw.createdAt as string) };
}

/** Register a user (creates if new, returns existing if already registered). */
export async function registerUser(id: string, name: string): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
  if (!res.ok) throw new Error(`Failed to register user: ${res.status}`);
  const json = await res.json();
  return reviveUser(json.user as Record<string, unknown>);
}

/** Fetch current user data (including live balance). */
export async function getUser(userId: string): Promise<User | null> {
  const res = await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  const json = await res.json();
  return reviveUser(json.user as Record<string, unknown>);
}

// ── Predictions ───────────────────────────────────────────────────────────────

function revivePrediction(raw: Record<string, unknown>): Prediction {
  return { ...(raw as unknown as Prediction), createdAt: new Date(raw.createdAt as string) };
}

export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  const res = await fetch(`/api/predictions?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch predictions: ${res.status}`);
  const json = await res.json();
  return (json.predictions as Record<string, unknown>[]).map(revivePrediction);
}

export async function savePrediction(payload: {
  userId: string; userName: string; matchId: string;
  predictedWinner: string; predictedHomeRuns: number; predictedAwayRuns: number; isPublic?: boolean;
}): Promise<Prediction> {
  const res = await fetch('/api/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save prediction: ${res.status}`);
  const json = await res.json();
  return revivePrediction(json.prediction as Record<string, unknown>);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[]; scoredAt: string }> {
  const res = await fetch('/api/leaderboard', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`);
  return res.json();
}

export async function getMatchLeaderboard(matchId: string): Promise<{
  match: {
    id: string; name: string; status: string; result: string | null;
    homeTeam: string; awayTeam: string; homeScore?: number; awayScore?: number;
  };
  entries: MatchLeaderboardEntry[];
  total: number;
}> {
  const res = await fetch(`/api/leaderboard/${encodeURIComponent(matchId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch match leaderboard: ${res.status}`);
  return res.json();
}
