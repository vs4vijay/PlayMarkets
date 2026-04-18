// Leaderboard API
//
// GET /api/leaderboard — scores any pending predictions, returns ranked stats.
//
// Scoring is lazy: runs on every leaderboard fetch, writes back any newly
// scored predictions to storage, then returns the full ranked list.

import { getStore } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import { computeLeaderboard } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [store, provider] = [getStore(), getProvider()];
    const [allPredictions, allMatches] = await Promise.all([
      store.getAllPredictions(),
      provider.getMatches(),
    ]);

    const { newlyScored, leaderboard } = computeLeaderboard(allPredictions, allMatches);

    // Persist newly scored predictions back to storage.
    await Promise.all(
      newlyScored.map((p) =>
        store.updatePrediction(p.id, { points: p.points, scored: true }),
      ),
    );

    return Response.json(
      { leaderboard, scoredAt: new Date().toISOString(), total: leaderboard.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[/api/leaderboard]', err);
    return Response.json(
      { error: 'Failed to compute leaderboard' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
