// Per-match leaderboard API
//
// GET /api/leaderboard/[matchId] — all predictions for a match ranked by points.
//   Works for any match status:
//     UPCOMING / LIVE  → predictions listed (points = undefined, no scoring yet)
//     COMPLETED        → predictions scored and ranked by points

import type { NextRequest } from 'next/server';
import { getStore } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import { computeMatchLeaderboard } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await ctx.params;

  try {
    const store    = getStore();
    const provider = getProvider();

    const [predictions, match] = await Promise.all([
      store.getPredictionsByMatch(matchId),
      provider.getMatchById(matchId),
    ]);

    if (!match) {
      return Response.json({ error: 'Match not found' }, { status: 404, ...NO_STORE });
    }

    const entries = computeMatchLeaderboard(predictions, match);

    return Response.json(
      {
        match: {
          id:        match.id,
          name:      match.name,
          status:    match.status,
          result:    match.result ?? null,
          homeTeam:  match.homeTeam.shortName,
          awayTeam:  match.awayTeam.shortName,
          homeScore: match.homeScore?.runs,
          awayScore: match.awayScore?.runs,
        },
        entries,
        total: entries.length,
      },
      NO_STORE,
    );
  } catch (err) {
    console.error('[/api/leaderboard/[matchId]]', err);
    return Response.json(
      { error: 'Failed to compute match leaderboard' },
      { status: 500, ...NO_STORE },
    );
  }
}
