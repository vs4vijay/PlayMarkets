// Global leaderboard — server component.
// Calls storage + scoring directly (no HTTP round-trip).

import { getStore, getUserStore } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import { computeLeaderboard, STARTING_BALANCE } from '@/lib/scoring';
import type { LeaderboardEntry } from '@/types';

export const dynamic = 'force-dynamic';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

async function loadLeaderboard() {
  const store     = getStore();
  const userStore = getUserStore();
  const provider  = getProvider();
  const [predictions, matches, users] = await Promise.all([
    store.getAllPredictions(),
    provider.getMatches(),
    userStore.getAllUsers(),
  ]);
  const userBalanceMap = new Map(users.map((u) => [u.id, u.balance]));
  const { newlyScored, leaderboard, userBalanceUpdates } =
    computeLeaderboard(predictions, matches, userBalanceMap);
  await Promise.all([
    ...newlyScored.map((p) => store.updatePrediction(p.id, { points: p.points, scored: true })),
    ...userBalanceUpdates.map(({ userId, newBalance }) =>
      userStore.updateUser(userId, { balance: newBalance }),
    ),
  ]);
  return leaderboard;
}

export default async function LeaderboardPage() {
  let leaderboard: LeaderboardEntry[] = [];
  try {
    leaderboard = await loadLeaderboard();
  } catch (err) {
    console.error('[LeaderboardPage]', err);
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#003791]/30 via-[#070d1a]/80 to-[#070d1a] px-4 py-12 md:py-16">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-72 h-72 bg-[#FF7722] rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/3 w-48 h-48 bg-[#003791] rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Leaderboard
          </h1>
          <p className="text-zinc-400 text-base">
            {leaderboard.length > 0
              ? `${leaderboard.length} predictor${leaderboard.length !== 1 ? 's' : ''} competing`
              : 'Be the first to make predictions'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
            <span>Starting balance: <strong className="text-zinc-300">{STARTING_BALANCE} pts</strong></span>
            <span>·</span>
            <a href="/rules" className="text-[#FF7722] hover:underline">View scoring rules →</a>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {leaderboard.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Top 3 podium ──────────────────────────────────────────── */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {top3.map((entry) => (
                  <PodiumCard key={entry.userId} entry={entry} />
                ))}
              </div>
            )}

            {/* ── Full rankings table ───────────────────────────────────── */}
            {rest.length > 0 && (
              <div className="rounded-2xl border border-[#1e2d45] overflow-hidden">
                <div className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem_4rem] gap-x-3 px-4 py-2.5 bg-[#0e1628] border-b border-[#1e2d45] text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-right">Balance</span>
                  <span className="text-right">Points</span>
                  <span className="text-right">Correct</span>
                  <span className="text-right">Acc%</span>
                </div>
                {rest.map((entry, i) => (
                  <TableRow key={entry.userId} entry={entry} striped={i % 2 === 1} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const medal  = RANK_MEDAL[entry.rank] ?? `#${entry.rank}`;
  const isFirst = entry.rank === 1;
  const balanceColor =
    entry.balance > STARTING_BALANCE ? 'text-[#00D4B4]'
    : entry.balance < STARTING_BALANCE ? 'text-red-400'
    : 'text-zinc-300';

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col items-center gap-2 text-center transition-all ${
        isFirst
          ? 'border-[#FF7722]/50 bg-gradient-to-b from-[#FF7722]/10 to-[#0e1628]'
          : 'border-[#1e2d45] bg-[#0e1628]'
      }`}
    >
      <span className="text-3xl">{medal}</span>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg"
        style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
      >
        {entry.userName.slice(0, 1).toUpperCase()}
      </div>
      <p className="font-bold text-white truncate max-w-full text-sm">{entry.userName}</p>
      {/* Balance */}
      <div className="w-full px-3 py-1.5 rounded-lg bg-[#070d1a]/60 border border-[#1e2d45]">
        <p className="text-[10px] text-zinc-500">Balance</p>
        <p className={`text-xl font-black ${balanceColor}`}>
          {entry.balance.toLocaleString()} <span className="text-xs font-normal text-zinc-500">pts</span>
        </p>
      </div>
      <div className="flex gap-3 text-xs text-zinc-500">
        <span>{entry.totalPoints > 0 ? '+' : ''}{entry.totalPoints} earned</span>
        <span>·</span>
        <span className="text-[#00D4B4]">{entry.accuracy}% acc</span>
      </div>
    </div>
  );
}

function TableRow({ entry, striped }: { entry: LeaderboardEntry; striped: boolean }) {
  const balanceColor =
    entry.balance > STARTING_BALANCE ? 'text-[#00D4B4]'
    : entry.balance < STARTING_BALANCE ? 'text-red-400'
    : 'text-zinc-300';

  return (
    <div
      className={`grid grid-cols-[2rem_1fr_5rem_5rem_4rem_4rem] gap-x-3 px-4 py-3 items-center text-sm ${
        striped ? 'bg-[#0e1628]/50' : ''
      }`}
    >
      <span className="text-zinc-500 font-mono text-xs">{entry.rank}</span>
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-white text-xs"
          style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
        >
          {entry.userName.slice(0, 1).toUpperCase()}
        </div>
        <span className="font-semibold text-white truncate">{entry.userName}</span>
      </div>
      <span className={`text-right font-black text-sm ${balanceColor}`}>
        {entry.balance.toLocaleString()}
      </span>
      <span className={`text-right font-bold text-xs ${
        entry.totalPoints > 0 ? 'text-[#FF7722]' : entry.totalPoints < 0 ? 'text-red-400' : 'text-zinc-400'
      }`}>
        {entry.totalPoints > 0 ? '+' : ''}{entry.totalPoints}
      </span>
      <span className="text-right text-[#00D4B4] text-xs">{entry.correctCount}</span>
      <span className="text-right text-zinc-400 text-xs">{entry.accuracy}%</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🔮</div>
      <p className="text-zinc-400 text-base font-semibold mb-1">No predictions yet</p>
      <p className="text-zinc-600 text-sm">
        Make predictions on upcoming matches — the leaderboard updates once results are in.
      </p>
      <div className="flex gap-3 justify-center mt-6">
        <a
          href="/"
          className="inline-block px-6 py-2.5 bg-[#FF7722] text-white font-bold rounded-xl hover:bg-[#ff8c3a] transition-colors text-sm"
        >
          View Matches
        </a>
        <a
          href="/rules"
          className="inline-block px-6 py-2.5 border border-[#1e2d45] text-zinc-300 font-bold rounded-xl hover:bg-[#1e2d45] transition-colors text-sm"
        >
          Read Rules
        </a>
      </div>
    </div>
  );
}
