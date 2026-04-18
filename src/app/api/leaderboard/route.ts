// Leaderboard API
//
// GET /api/leaderboard — scores any pending predictions, updates user balances,
//                        returns the full ranked list with current balances.

import { getStore, getUserStore } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import { computeLeaderboard } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function GET() {
  try {
    const store     = getStore();
    const userStore = getUserStore();
    const provider  = getProvider();

    const [allPredictions, allMatches, allUsers] = await Promise.all([
      store.getAllPredictions(),
      provider.getMatches(),
      userStore.getAllUsers(),
    ]);

    const userBalanceMap = new Map(allUsers.map((u) => [u.id, u.balance]));
    const { newlyScored, leaderboard, userBalanceUpdates } =
      computeLeaderboard(allPredictions, allMatches, userBalanceMap);

    // Persist newly scored predictions and updated balances in parallel.
    await Promise.all([
      ...newlyScored.map((p) =>
        store.updatePrediction(p.id, { points: p.points, scored: true }),
      ),
      ...userBalanceUpdates.map(({ userId, newBalance }) =>
        userStore.updateUser(userId, { balance: newBalance }),
      ),
    ]);

    return Response.json(
      { leaderboard, scoredAt: new Date().toISOString(), total: leaderboard.length },
      NO_STORE,
    );
  } catch (err) {
    console.error('[/api/leaderboard]', err);
    return Response.json(
      { error: 'Failed to compute leaderboard' },
      { status: 500, ...NO_STORE },
    );
  }
}
