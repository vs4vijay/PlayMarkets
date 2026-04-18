'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMatches, getUserPredictions, savePrediction } from '@/lib/api';
import { CricketMatchCard } from '@/components/CricketMatchCard';
import { MyPredictionsPanel } from '@/components/Predictions';
import { PredictionModal } from '@/components/PredictionModal';
import { addReaction, getUserReactionTypes } from '@/store/reactions';
import { useUser } from '@/components/UserProvider';
import type { CricketMatch, MatchStatus, ReactionType, Prediction } from '@/types';

type FilterTab = 'ALL' | 'LIVE' | 'COMPLETED' | 'UPCOMING';
type SectionView = 'LIVE' | 'RECENT' | 'UPCOMING';

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
    <div className="rounded-2xl bg-[#0e1628] border border-[#1e2d45] overflow-hidden animate-pulse">
      <div className="h-9 bg-[#1e2d45]" />
      <div className="p-4 flex items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-[#1e2d45]" />
          <div className="w-10 h-3 rounded bg-[#1e2d45]" />
          <div className="w-20 h-3 rounded bg-[#1e2d45]" />
        </div>
        <div className="w-16 h-8 rounded bg-[#1e2d45]" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-[#1e2d45]" />
          <div className="w-10 h-3 rounded bg-[#1e2d45]" />
          <div className="w-20 h-3 rounded bg-[#1e2d45]" />
        </div>
      </div>
      <div className="h-10 bg-[#1e2d45]/50" />
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
  const { user, refreshBalance } = useUser();
  const [matches,         setMatches]         = useState<CricketMatch[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [filter,          setFilter]          = useState<FilterTab>('ALL');
  const [section,         setSection]         = useState<SectionView>('LIVE');
  const [userReactions,   setUserReactions]   = useState<Map<string, Set<string>>>(new Map());
  const [userPredictions, setUserPredictions] = useState<Map<string, Prediction>>(new Map());
  const [modalMatchId,    setModalMatchId]    = useState<string | null>(null);

  const userId   = user?.id   ?? '';
  const userName = user?.name ?? 'Fan';

  // ── Load matches ────────────────────────────────────────────────────────────

  const loadMatches = useCallback(() => {
    setLoading(true);
    setError(null);
    getMatches()
      .then((data) => {
        setMatches(data);
        const { live } = categorize(data);
        if (live.length === 0) setSection('RECENT');
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
          const { live: updatedLive } = categorize(data);
          if (updatedLive.length === 0) setSection((s) => s === 'LIVE' ? 'RECENT' : s);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [hasLiveMatches]);

  // ── Reactions ────────────────────────────────────────────────────────────────

  const handleReaction = (matchId: string, eventId: string | undefined, type: ReactionType) => {
    addReaction(matchId, eventId, type, userId, userName);
    const types = getUserReactionTypes(matchId, eventId, userId);
    const key   = eventId ? `${matchId}:${eventId}` : matchId;
    setUserReactions((prev) => new Map(prev).set(key, new Set(types)));
  };

  // ── Prediction handlers ──────────────────────────────────────────────────────

  const handlePredictionSubmit = useCallback((
    winner: string,
    homeRuns: number,
    awayRuns: number,
  ) => {
    if (!modalMatchId || !userId) return;
    const existing = userPredictions.get(modalMatchId);

    const pred: Prediction = {
      id:                existing?.id ?? `pred-${modalMatchId}-${userId}-${Date.now()}`,
      matchId:           modalMatchId,
      userId,
      userName,
      predictedWinner:   winner,
      predictedHomeRuns: homeRuns,
      predictedAwayRuns: awayRuns,
      isPublic:          true,
      createdAt:         existing?.createdAt ?? new Date(),
      scored:            false,
    };

    // Optimistic update.
    setUserPredictions((prev) => new Map(prev).set(modalMatchId, pred));
    setModalMatchId(null);

    // Persist to server — update prediction + refresh balance on success.
    savePrediction({
      userId, userName, matchId: modalMatchId,
      predictedWinner: winner,
      predictedHomeRuns: homeRuns,
      predictedAwayRuns: awayRuns,
      isPublic: true,
    }).then(({ prediction: saved, balance }) => {
      setUserPredictions((prev) => new Map(prev).set(modalMatchId, saved));
      // If server returned the updated balance (new prediction), apply it.
      if (typeof balance === 'number') {
        refreshBalance();
      }
    }).catch(() => {/* keep optimistic state */});
  }, [modalMatchId, userId, userName, userPredictions]);

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const tabs: { label: string; value: FilterTab; count: number; dot?: boolean }[] = [
    { label: 'All',      value: 'ALL',       count: matches.length },
    { label: 'Live',     value: 'LIVE',      count: live.length,    dot: live.length > 0 },
    { label: 'Results',  value: 'COMPLETED', count: recent.length },
    { label: 'Upcoming', value: 'UPCOMING',  count: upcoming.length },
  ];

  const sectionMatches =
    section === 'LIVE' ? live : section === 'RECENT' ? recent : upcoming;

  const modalMatch = modalMatchId ? matches.find((m) => m.id === modalMatchId) : null;

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#003791]/40 via-[#070d1a]/80 to-[#070d1a] px-4 py-14 md:py-20">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#003791] rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/4 w-48 h-48 bg-[#FF7722] rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF7722]/15 border border-[#FF7722]/30 mb-5">
            <LiveDot />
            <span className="text-xs font-semibold text-[#FF7722]">
              {live.length > 0
                ? `${live.length} match${live.length > 1 ? 'es' : ''} in progress`
                : 'Live sports · social predictions'}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3">
            <span className="text-[#FF7722]">Play</span>
            <span className="text-white">Markets</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 max-w-xl mx-auto">
            The social prediction layer for live sports — react, predict &amp; compete in real-time
          </p>
          {upcoming.length > 0 && userId && (
            <p className="mt-4 text-sm text-zinc-500">
              {upcoming.length} upcoming match{upcoming.length > 1 ? 'es' : ''} open for prediction
              {userPredictions.size > 0 && (
                <> · <span className="text-[#FF7722]">{userPredictions.size} predicted</span></>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ── Filter Tabs ───────────────────────────────────────────────── */}
      <section className="sticky top-16 z-40 bg-[#070d1a]/95 backdrop-blur-md border-b border-[#1e2d45]">
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <div className="flex gap-1.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  filter === tab.value
                    ? 'bg-[#FF7722] text-white'
                    : 'bg-[#0e1628] text-zinc-400 hover:text-white hover:bg-[#1e2d45]'
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

      {/* ── Section toggles (ALL view only) ──────────────────────────── */}
      {filter === 'ALL' && !loading && (
        <section className="max-w-5xl mx-auto px-4 pt-5">
          <div className="flex gap-2">
            {([
              { value: 'LIVE',     label: 'Live Now', count: live.length,     activeClass: 'bg-red-600 text-white' },
              { value: 'RECENT',   label: 'Results',  count: recent.length,   activeClass: 'bg-zinc-600 text-white' },
              { value: 'UPCOMING', label: 'Upcoming', count: upcoming.length, activeClass: 'bg-[#003791] text-white' },
            ] as const).map((s) => (
              <button
                key={s.value}
                onClick={() => setSection(s.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  section === s.value ? s.activeClass : 'bg-[#0e1628] text-zinc-400 hover:text-white'
                }`}
              >
                {s.value === 'LIVE' && section === 'LIVE' && <LiveDot />}
                {s.label}
                <span className="text-xs opacity-70">({s.count})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Match Grid ────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 pt-5 pb-28">
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm mb-3">Failed to load matches: {error}</p>
            <button
              onClick={loadMatches}
              className="px-4 py-2 bg-[#003791] text-white rounded-lg text-sm hover:bg-[#0047c2] transition-colors"
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
          const displayMatches = filter === 'ALL' ? sectionMatches : filteredMatches;
          if (displayMatches.length === 0) {
            return (
              <div className="text-center py-16">
                <span className="text-5xl">🏏</span>
                <p className="text-zinc-500 text-sm mt-4">
                  {filter === 'LIVE'      && 'No live matches right now'}
                  {filter === 'COMPLETED' && 'No recent results'}
                  {filter === 'UPCOMING'  && 'No upcoming matches'}
                  {filter === 'ALL' && section === 'LIVE'    && 'No live matches right now'}
                  {filter === 'ALL' && section === 'RECENT'  && 'No recent results'}
                  {filter === 'ALL' && section === 'UPCOMING' && 'No upcoming matches'}
                </p>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayMatches.map((match) => (
                <CricketMatchCard
                  key={match.id}
                  match={match}
                  onReact={handleReaction}
                  userReactions={userReactions.get(match.id) ?? new Set()}
                  prediction={userPredictions.get(match.id)}
                  onPredictClick={
                    userId && !['COMPLETED', 'ABANDONED', 'CANCELLED'].includes(match.status)
                      ? () => setModalMatchId(match.id)
                      : undefined
                  }
                />
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
          onPredictMatch={(matchId) => setModalMatchId(matchId)}
        />
      )}

      {/* ── Prediction Modal ──────────────────────────────────────────── */}
      {modalMatch && (
        <PredictionModal
          match={modalMatch}
          existing={userPredictions.get(modalMatch.id)}
          onSubmit={handlePredictionSubmit}
          onClose={() => setModalMatchId(null)}
        />
      )}
    </div>
  );
}
