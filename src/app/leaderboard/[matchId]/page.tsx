// Per-match leaderboard — server component.

import { getStore } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import { computeMatchLeaderboard } from '@/lib/scoring';
import type { MatchLeaderboardEntry, CricketMatch } from '@/types';

export const dynamic = 'force-dynamic';

async function loadMatchLeaderboard(matchId: string) {
  const store    = getStore();
  const provider = getProvider();
  const [predictions, match] = await Promise.all([
    store.getPredictionsByMatch(matchId),
    provider.getMatchById(matchId),
  ]);
  if (!match) return null;
  return { match, entries: computeMatchLeaderboard(predictions, match) };
}

export default async function MatchLeaderboardPage(
  ctx: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await ctx.params;

  let match: CricketMatch | null = null;
  let entries: MatchLeaderboardEntry[] = [];

  try {
    const data = await loadMatchLeaderboard(matchId);
    if (data) { match = data.match; entries = data.entries; }
  } catch (err) {
    console.error('[MatchLeaderboardPage]', err);
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">😔</p>
          <p className="text-zinc-400">Match not found</p>
          <a href="/leaderboard" className="mt-4 inline-block text-accent hover:underline text-sm">
            ← Back to Leaderboard
          </a>
        </div>
      </div>
    );
  }

  const isCompleted = match.status === 'COMPLETED';
  const winner      = match.result?.match(/^(.+?)\s+won\s+by/i)?.[1] ?? null;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden hero-gradient px-4 py-10 md:py-14">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-72 h-72 bg-accent rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <a
            href="/leaderboard"
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 mb-4"
          >
            ← Global Leaderboard
          </a>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                {match.name}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">{match.venue}</p>
            </div>
            <StatusPill status={match.status} />
          </div>

          {/* Match result */}
          {isCompleted && match.result && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-positive/10 border border-positive/20 inline-flex items-center gap-2">
              <span className="text-positive font-bold text-sm">{match.result}</span>
            </div>
          )}

          {/* Score summary */}
          {(match.homeScore || match.awayScore) && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <TeamScore
                name={match.homeTeam.shortName}
                color={match.homeTeam.primaryColor}
                runs={match.homeScore?.runs}
                wickets={match.homeScore?.wickets}
                overs={match.homeScore?.overs}
                isWinner={winner?.toLowerCase() === match.homeTeam.name.toLowerCase()}
              />
              <span className="text-zinc-600 font-bold">vs</span>
              <TeamScore
                name={match.awayTeam.shortName}
                color={match.awayTeam.primaryColor}
                runs={match.awayScore?.runs}
                wickets={match.awayScore?.wickets}
                overs={match.awayScore?.overs}
                isWinner={winner?.toLowerCase() === match.awayTeam.name.toLowerCase()}
              />
            </div>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* ── Stat strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total Predictors" value={entries.length} />
          {isCompleted ? (
            <>
              <StatCard
                label="Correct Winner"
                value={entries.filter((e) => e.isCorrectWinner).length}
                sub={`of ${entries.length}`}
                color="text-positive"
              />
              <StatCard
                label="Top Score"
                value={entries[0]?.points !== undefined ? `+${Math.max(0, entries[0].points)}` : '—'}
                color="text-accent"
              />
            </>
          ) : (
            <>
              <StatCard label="Match Status" value={match.status} color="text-zinc-300" />
              <StatCard label="Points" value="TBD" color="text-zinc-500" />
            </>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔮</p>
            <p className="text-zinc-400 font-semibold">No predictions for this match yet</p>
            <a
              href="/"
              className="inline-block mt-4 px-5 py-2 bg-accent text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              Make a Prediction
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border border-rim overflow-hidden">
            {/* Table header */}
            <div className={`grid gap-x-3 px-4 py-2.5 bg-surface border-b border-rim text-[10px] font-semibold text-zinc-500 uppercase tracking-wider ${
              isCompleted
                ? 'grid-cols-[2rem_1fr_5rem_5rem_5rem_4rem]'
                : 'grid-cols-[2rem_1fr_5rem_5rem_5rem]'
            }`}>
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Predicted</span>
              {isCompleted && <span className="text-right">Actual</span>}
              <span className="text-center">Winner</span>
              {isCompleted && <span className="text-right">Pts</span>}
            </div>

            {entries.map((entry, i) => (
              <MatchRow
                key={entry.userId}
                entry={entry}
                match={match!}
                striped={i % 2 === 1}
                isCompleted={isCompleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'LIVE'      ? 'bg-red-600 animate-pulse' :
    status === 'COMPLETED' ? 'bg-zinc-600' :
    status === 'UPCOMING'  ? 'bg-emerald-600' : 'bg-zinc-600';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold text-white shrink-0 ${cls}`}>
      {status}
    </span>
  );
}

function TeamScore({
  name, color, runs, wickets, overs, isWinner,
}: {
  name: string; color: string;
  runs?: number; wickets?: number; overs?: number;
  isWinner: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${isWinner ? 'opacity-100' : 'opacity-60'}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs"
        style={{ backgroundColor: color }}
      >
        {name.slice(0, 2)}
      </div>
      <div>
        <p className={`font-bold text-sm ${isWinner ? 'text-white' : 'text-zinc-400'}`}>{name}</p>
        {runs !== undefined && (
          <p className="text-[11px] text-zinc-400 font-mono">
            {runs}/{wickets ?? 0} ({overs ?? 0} ov)
          </p>
        )}
      </div>
      {isWinner && <span className="text-positive text-xs font-bold">✓ Won</span>}
    </div>
  );
}

function StatCard({
  label, value, sub, color = 'text-white',
}: {
  label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl bg-surface border border-rim p-3 text-center">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
      <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function MatchRow({
  entry, match, striped, isCompleted,
}: {
  entry: MatchLeaderboardEntry;
  match: CricketMatch;
  striped: boolean;
  isCompleted: boolean;
}) {
  const pts = entry.points;
  const ptsColor =
    pts === undefined ? 'text-zinc-500'
    : pts > 0  ? 'text-positive'
    : pts < 0  ? 'text-red-400'
    : 'text-zinc-500';

  return (
    <div
      className={`grid gap-x-3 px-4 py-3 items-center text-sm ${
        isCompleted
          ? 'grid-cols-[2rem_1fr_5rem_5rem_5rem_4rem]'
          : 'grid-cols-[2rem_1fr_5rem_5rem_5rem]'
      } ${striped ? 'bg-surface/50' : ''}`}
    >
      <span className="text-zinc-500 font-mono text-xs">{entry.rank}</span>

      {/* Player */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center font-black text-white text-[10px]"
          style={{ background: 'linear-gradient(135deg, var(--pm-brand) 0%, var(--pm-accent) 100%)' }}
        >
          {entry.userName.slice(0, 1).toUpperCase()}
        </div>
        <span className="font-semibold text-white truncate text-xs">{entry.userName}</span>
      </div>

      {/* Predicted score */}
      <span className="text-right text-xs font-mono text-zinc-400">
        {entry.predictedHomeRuns ?? '—'} / {entry.predictedAwayRuns ?? '—'}
      </span>

      {/* Actual score */}
      {isCompleted && (
        <span className="text-right text-xs font-mono text-zinc-300">
          {match.homeScore?.runs ?? '—'} / {match.awayScore?.runs ?? '—'}
        </span>
      )}

      {/* Winner pick */}
      <span
        className={`text-center text-xs font-bold truncate ${
          !isCompleted
            ? 'text-zinc-400'
            : entry.isCorrectWinner
            ? 'text-positive'
            : 'text-red-400'
        }`}
      >
        {entry.predictedWinner}
        {isCompleted && (
          <span className="ml-1">{entry.isCorrectWinner ? '✓' : '✗'}</span>
        )}
      </span>

      {/* Points */}
      {isCompleted && (
        <span className={`text-right text-sm font-black ${ptsColor}`}>
          {pts !== undefined ? (pts > 0 ? `+${pts}` : pts) : '—'}
        </span>
      )}
    </div>
  );
}
