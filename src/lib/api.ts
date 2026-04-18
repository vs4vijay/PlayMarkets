// Client-side API helpers — fetch cricket data via the /api/matches route handler.
// No API keys are used here; all secrets stay server-side.

import type { CricketMatch } from '@/types';

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
