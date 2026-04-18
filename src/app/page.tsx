'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMatches, getUserPredictions } from '@/lib/api';
import { CricketMatchCard } from '@/components/CricketMatchCard';
import { MyPredictionsPanel } from '@/components/Predictions';
import { useUser } from '@/components/UserProvider';
import type { CricketMatch, MatchStatus, Prediction } from '@/types';

type FilterTab = 'ALL' | 'LIVE' | 'COMPLETED' | 'UPCOMING';

const LIVE_STATUSES: MatchStatus[] = ['LIVE', 'TOSS', 'INNINGS_BREAK', 'DRINKS', 'LUNCH', 'TEA', 'STUMPS', 'RAIN_DELAY'];

function categorize(matches: CricketMatch[]) {
  const live     = matches.filter((m) => LIVE_STATUSES.includes(m.status));
  const recent   = matches.filter((m) => m.status === 'COMPLETED');
  const upcoming = matches.filter((m) => m.status === 'UPCOMING' || m.status === 'POSTPONED');
  return { live, recent, upcoming };
}

function filterMatches(matches: CricketMatch[], tab: FilterTab): CricketMatch[] {
  if (tab === 'ALL')       return matches;
  if (tab === 'LIVE')      return matches.filter((m) => LIVE_STATUSES.includes(m.status));
  if (tab === 'COMPLETED') return matches.filter((m) => m.status === 'COMPLETED');
  return matches.filter((m) => m.status === 'UPCOMING' || m.status === 'POSTPONED');
}

function MatchSkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-rim overflow-hidden animate-pulse">
      <div className="h-9 bg-rim" />
      <div className="p-4 flex items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-rim" />
          <div className="w-10 h-3 rounded bg-rim" />
          <div className="w-20 h-3 rounded bg-rim" />
        </div>
        <div className="w-16 h-8 rounded bg-rim" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-rim" />
          <div className="w-10 h-3 rounded bg-rim" />
          <div className="w-20 h-3 rounded bg-rim" />
        </div>
      </div>
      <div className="h-10 bg-rim/50" />
    </div>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
  );
}

export default function Home() {
  const { user } = useUser();
  const [matches,         setMatches]         = useState<CricketMatch[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [filter,          setFilter]          = useState<FilterTab>('ALL');
  const [userPredictions, setUserPredictions] = useState<Map<string, Prediction>>(new Map());

  const userId   = user?.id   ?? '';
  const userName = user?.name ?? 'Fan';

  // ── Load matches ────────────────────────────────────────────────────────────

  const loadMatches = useCallback(() => {
    setLoading(true);
    setError(null);
    getMatches()
      .then((data) => {
        setMatches(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // ── Load user predictions ───────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    getUserPredictions(userId)
      .then((preds) => setUserPredictions(new Map(preds.map((p) => [p.matchId, p]))))
      .catch(() => {/* silent — prediction state falls back to empty */});
  }, [userId]);

  // ── Live polling ────────────────────────────────────────────────────────────

  const { live, recent, upcoming } = categorize(matches);
  const filteredMatches = filterMatches(matches, filter);
  const hasLiveMatches  = live.length > 0;

  useEffect(() => {
    if (!hasLiveMatches) return;
    const id = setInterval(() => {
      getMatches()
        .then((data) => {
          setMatches(data);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [hasLiveMatches]);

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const tabs: { label: string; value: FilterTab; count: number; dot?: boolean }[] = [
    { label: 'All',      value: 'ALL',       count: matches.length },
    { label: 'Live',     value: 'LIVE',      count: live.length,    dot: live.length > 0 },
    { label: 'Results',  value: 'COMPLETED', count: recent.length },
    { label: 'Upcoming', value: 'UPCOMING',  count: upcoming.length },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden hero-gradient px-4 py-14 md:py-20">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-brand rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/4 w-48 h-48 bg-accent rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 mb-5">
            <LiveDot />
            <span className="text-xs font-semibold text-accent">
              {live.length > 0
                ? `${live.length} match${live.length > 1 ? 'es' : ''} in progress`
                : 'Live sports · social predictions'}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3">
            <span className="text-accent">Play</span>
            <span className="text-white">Markets</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 max-w-xl mx-auto">
            The social prediction layer for live sports — react, predict &amp; compete in real-time
          </p>
          {upcoming.length > 0 && userId && (
            <p className="mt-4 text-sm text-zinc-500">
              {upcoming.length} upcoming match{upcoming.length > 1 ? 'es' : ''} open for prediction
              {userPredictions.size > 0 && (
                <> · <span className="text-accent">{userPredictions.size} predicted</span></>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ── Filter Tabs ───────────────────────────────────────────────── */}
      <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-rim">
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <div className="flex gap-1.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  filter === tab.value
                    ? 'bg-accent text-white'
                    : 'bg-surface text-zinc-400 hover:text-white hover:bg-rim'
                }`}
              >
                {tab.dot && <LiveDot />}
                {tab.label}
                <span className={`text-xs ${filter === tab.value ? 'opacity-80' : 'opacity-50'}`}>
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Match Grid ────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 pt-5 pb-28">
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm mb-3">Failed to load matches: {error}</p>
            <button
              onClick={loadMatches}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <MatchSkeleton key={i} />)}
          </div>
        )}

        {!loading && !error && (() => {
          if (filter !== 'ALL') {
            if (filteredMatches.length === 0) {
              return (
                <div className="text-center py-16">
                  <span className="text-5xl">🏏</span>
                  <p className="text-zinc-500 text-sm mt-4">
                    {filter === 'LIVE'      && 'No live matches right now'}
                    {filter === 'COMPLETED' && 'No recent results'}
                    {filter === 'UPCOMING'  && 'No upcoming matches'}
                  </p>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map((match) => (
                  <CricketMatchCard
                    key={match.id}
                    match={match}
                    prediction={userPredictions.get(match.id)}
                    showPredictCta={!!userId}
                  />
                ))}
              </div>
            );
          }

          // ALL view — grouped by status
          const groups = [
            { label: 'Live Now', matches: live, dot: true },
            { label: 'Upcoming', matches: upcoming, dot: false },
            { label: 'Results',  matches: recent,   dot: false },
          ].filter((g) => g.matches.length > 0);

          if (groups.length === 0) {
            return (
              <div className="text-center py-16">
                <span className="text-5xl">🏏</span>
                <p className="text-zinc-500 text-sm mt-4">No matches available</p>
              </div>
            );
          }

          return (
            <div className="space-y-8">
              {groups.map((g) => (
                <div key={g.label}>
                  <h2 className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                    {g.dot && <LiveDot />}
                    {g.label}
                    <span className="text-zinc-600">({g.matches.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {g.matches.map((match) => (
                      <CricketMatchCard
                        key={match.id}
                        match={match}
                        prediction={userPredictions.get(match.id)}
                        showPredictCta={!!userId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </main>

      {/* ── My Predictions FAB (read-only review) ─────────────────────── */}
      {userId && (
        <MyPredictionsPanel
          matches={matches}
          userPredictions={userPredictions}
        />
      )}
    </div>
  );
}
