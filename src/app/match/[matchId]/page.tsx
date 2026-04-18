'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { getMatchById, getUserPredictions, savePrediction } from '@/lib/api';
import { useUser } from '@/components/UserProvider';
import type { CricketMatch, Prediction, MatchType, CricketEventType } from '@/types';
import { PREDICTION_STAKE, STARTING_BALANCE } from '@/types';

// ── Constants / Helpers ───────────────────────────────────────────────────────

const LOCKED = ['COMPLETED', 'ABANDONED', 'CANCELLED'];
const LIVE_STATUSES = ['LIVE', 'TOSS', 'INNINGS_BREAK', 'DRINKS', 'LUNCH', 'TEA', 'STUMPS', 'RAIN_DELAY'];

function isLiveStatus(s: string) { return LIVE_STATUSES.includes(s); }
function canPredict(s: string)    { return !LOCKED.includes(s); }

function scoreTolerance(t: MatchType) {
  return t === 'T10' ? 10 : t === 'T20' ? 15 : t === 'ODI' ? 25 : 40;
}
function scorePresets(t: MatchType): number[] {
  return t === 'T10' ? [80,100,120,140]
       : t === 'T20' ? [140,160,180,200]
       : t === 'ODI' ? [220,260,300,330]
                     : [250,320,380,450];
}
function scoreStep(t: MatchType) { return (t === 'T20' || t === 'T10') ? 5 : 10; }
function earlyMult(match: CricketMatch) {
  const h = (match.startTime.getTime() - Date.now()) / 3_600_000;
  return h > 48 ? 1.5 : h > 12 ? 1.25 : 1.0;
}
function earlyLabel(match: CricketMatch) {
  const h = (match.startTime.getTime() - Date.now()) / 3_600_000;
  return h > 48 ? '×1.5 Early Bird active' : h > 12 ? '×1.25 Early Bird active' : '';
}
function extractWinner(result: string) {
  return result.match(/^(.+?)\s+won\s+by/i)?.[1]?.trim() ?? null;
}
function formatOvers(o: number) {
  const f = Math.floor(o), b = Math.round((o - f) * 10);
  return b > 0 ? `${f}.${b}` : `${f}`;
}

const EVENT_ICON: Record<CricketEventType, string> = {
  WICKET: '🔴', BOUNDARY_FOUR: '4️⃣', BOUNDARY_SIX: '6️⃣',
  FIFTY: '🌟', CENTURY: '💯', MAIDEN_OVER: '🧊',
  REVIEW_SUCCESS: '✅', REVIEW_FAILED: '❌',
  NO_BALL: '🟡', WIDE: '🟡', MATCH_START: '🏏', INNINGS_END: '📋',
};

// ── ScoreInput ─────────────────────────────────────────────────────────────────

function ScoreInput({
  team, value, onChange, presets, step,
}: {
  team: CricketMatch['homeTeam']; value: number;
  onChange: (v: number) => void; presets: number[]; step: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
          style={{ backgroundColor: team.primaryColor }}>
          {team.shortName.slice(0, 2)}
        </div>
        <span className="text-xs font-bold text-zinc-300">{team.shortName}</span>
      </div>
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {presets.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              value === p ? 'bg-accent text-white' : 'bg-rim text-zinc-400 hover:text-white'
            }`}>
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - step))}
          className="w-10 h-10 rounded-xl bg-rim text-white font-black text-lg hover:bg-rim-hi transition-colors flex items-center justify-center">
          −
        </button>
        <input type="number" value={value} min={0} max={600}
          onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0) onChange(v); }}
          className="flex-1 text-center py-2.5 rounded-xl bg-rim text-white font-black text-xl focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <button onClick={() => onChange(value + step)}
          className="w-10 h-10 rounded-xl bg-rim text-white font-black text-lg hover:bg-rim-hi transition-colors flex items-center justify-center">
          +
        </button>
      </div>
    </div>
  );
}

// ── Prediction Form ────────────────────────────────────────────────────────────

function PredictionForm({
  match, prediction, userId, userName, onSaved,
}: {
  match: CricketMatch;
  prediction?: Prediction;
  userId: string;
  userName: string;
  onSaved: (p: Prediction, balance?: number) => void;
}) {
  const presets  = scorePresets(match.matchType);
  const step     = scoreStep(match.matchType);
  const tol      = scoreTolerance(match.matchType);
  const mult     = earlyMult(match);
  const multLabel = earlyLabel(match);
  const isPredictable = canPredict(match.status);

  const defaultHome = presets[1] ?? 160;
  const defaultAway = (presets[1] ?? 160) - (match.matchType === 'ODI' ? 20 : 10);

  const [winner,   setWinner]   = useState(prediction?.predictedWinner ?? '');
  const [homeRuns, setHomeRuns] = useState(prediction?.predictedHomeRuns ?? defaultHome);
  const [awayRuns, setAwayRuns] = useState(prediction?.predictedAwayRuns ?? defaultAway);
  const [editing,  setEditing]  = useState(!prediction);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const maxPts    = Math.round(20 * mult);
  const winnerPts = Math.round(10 * mult);
  const bonusPts  = Math.round(5  * mult);

  const handleWinner = (name: string) => { setWinner(name); };

  const handleSubmit = async () => {
    if (!winner || saving) return;
    setSaving(true);
    setError('');
    try {
      const { prediction: saved, balance } = await savePrediction({
        userId, userName, matchId: match.id,
        predictedWinner: winner,
        predictedHomeRuns: homeRuns,
        predictedAwayRuns: awayRuns,
        isPublic: true,
      });
      onSaved(saved, balance);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save prediction');
    } finally {
      setSaving(false);
    }
  };

  const isCompleted = match.status === 'COMPLETED';
  const winner_actual = match.result ? extractWinner(match.result) : null;

  // ── Completed: show result ────────────────────────────────────────────────
  if (isCompleted && prediction?.scored) {
    const correct = winner_actual
      ? prediction.predictedWinner.toLowerCase() === winner_actual.toLowerCase()
      : false;
    const pts = prediction.points ?? 0;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rim bg-surface p-5">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Your Prediction</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Your pick</span>
              <span className={`font-black text-sm ${correct ? 'text-positive' : 'text-red-400'}`}>
                {prediction.predictedWinner} {correct ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Predicted scores</span>
              <span className="text-sm font-mono text-zinc-300">
                {prediction.predictedHomeRuns} – {prediction.predictedAwayRuns}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Actual scores</span>
              <span className="text-sm font-mono text-zinc-300">
                {match.homeScore?.runs ?? '—'} – {match.awayScore?.runs ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-rim pt-3 mt-1">
              <span className="text-sm font-bold text-white">Points earned</span>
              <span className={`font-black text-xl ${pts > 0 ? 'text-positive' : pts < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {pts > 0 ? '+' : ''}{pts} pts
              </span>
            </div>
          </div>
        </div>
        <a href={`/leaderboard/${match.id}`}
          className="block w-full text-center py-3 rounded-2xl border border-rim text-zinc-400 hover:text-white hover:bg-rim text-sm font-bold transition-colors">
          🏆 View Match Rankings
        </a>
      </div>
    );
  }

  // ── Completed but no prediction ───────────────────────────────────────────
  if (isCompleted && !prediction) {
    return (
      <div className="rounded-2xl border border-rim bg-surface p-5 text-center space-y-3">
        <p className="text-zinc-500 text-sm">No prediction was made for this match.</p>
        <a href={`/leaderboard/${match.id}`}
          className="block w-full py-3 rounded-2xl border border-rim text-zinc-400 hover:text-white hover:bg-rim text-sm font-bold transition-colors">
          🏆 View Match Rankings
        </a>
      </div>
    );
  }

  // ── Locked summary (after submitting, not yet scored) ─────────────────────
  if (!isPredictable || (!editing && prediction)) {
    return (
      <div className="rounded-2xl border border-rim bg-surface p-5 space-y-3">
        {prediction && (
          <>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Your Prediction</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Pick</span>
                <span className="font-black text-accent">{prediction.predictedWinner}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Predicted scores</span>
                <span className="font-mono text-zinc-300">
                  {prediction.predictedHomeRuns} – {prediction.predictedAwayRuns}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Staked</span>
                <span className="text-accent font-bold">{prediction.stake ?? PREDICTION_STAKE} pts</span>
              </div>
            </div>
            {isPredictable && (
              <button onClick={() => setEditing(true)}
                className="w-full py-2.5 rounded-xl border border-rim text-zinc-400 hover:text-white hover:bg-rim text-sm font-bold transition-colors">
                Edit Prediction
              </button>
            )}
          </>
        )}
        {!isPredictable && !prediction && (
          <p className="text-zinc-500 text-sm text-center">Predictions are locked for this match.</p>
        )}
      </div>
    );
  }

  // ── Active form ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Early bird / live badge */}
      {multLabel ? (
        <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-positive/10 border border-positive/25 text-xs text-positive font-bold">
          ⚡ {multLabel}
        </div>
      ) : isLiveStatus(match.status) ? (
        <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-bold">
          🔴 Match is live — no early bonus
        </div>
      ) : null}

      {/* Step 1 — Winner */}
      <div>
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Pick the winner</p>
        <div className="grid grid-cols-2 gap-3">
          {[match.homeTeam, match.awayTeam].map(t => (
            <button key={t.id} onClick={() => handleWinner(t.name)}
              className={`py-5 px-3 rounded-2xl font-bold transition-all flex flex-col items-center gap-2 border-2 ${
                winner === t.name
                  ? 'text-white border-white/20 scale-[1.02]'
                  : 'bg-surface text-zinc-400 hover:text-white border-rim hover:border-rim-hi'
              }`}
              style={winner === t.name ? { backgroundColor: t.primaryColor } : {}}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-sm"
                style={{ backgroundColor: winner === t.name ? 'rgba(255,255,255,0.2)' : t.primaryColor }}>
                {t.shortName.slice(0, 2)}
              </div>
              <span className="font-black text-sm">{t.shortName}</span>
              <span className="text-[10px] opacity-60 font-normal text-center leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — Scores */}
      <div className={`space-y-4 transition-opacity duration-300 ${winner ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Predict final scores <span className="text-zinc-600 normal-case font-normal ml-1">optional</span>
          </p>
          <span className="text-[10px] text-zinc-600">±{tol} runs = +5 pts</span>
        </div>
        <ScoreInput team={match.homeTeam} value={homeRuns} onChange={setHomeRuns} presets={presets} step={step} />
        <ScoreInput team={match.awayTeam} value={awayRuns} onChange={setAwayRuns} presets={presets} step={step} />
      </div>

      {/* Points preview */}
      {winner && (
        <div className="rounded-2xl bg-background border border-rim p-4 space-y-2">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Potential outcome</p>
          {[
            { label: 'Correct winner', val: `+${winnerPts} pts`, c: 'text-positive' },
            { label: `Home score ±${tol}`, val: `+${bonusPts} pts`, c: 'text-positive' },
            { label: `Away score ±${tol}`, val: `+${bonusPts} pts`, c: 'text-positive' },
            ...(mult > 1 ? [{ label: 'Early Bird multiplier', val: `×${mult}`, c: 'text-accent' }] : []),
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{r.label}</span>
              <span className={`font-bold ${r.c}`}>{r.val}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-rim">
            <span className="text-sm font-bold text-white">Max possible</span>
            <span className="text-accent font-black text-lg">+{maxPts} pts</span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Wrong winner (stake lost)</span>
            <span className="text-red-400 font-bold">−{PREDICTION_STAKE} pts</span>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}

      <div>
        <button onClick={handleSubmit} disabled={!winner || saving}
          className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all disabled:opacity-30 hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, var(--pm-brand) 0%, var(--pm-accent) 100%)' }}>
          {saving ? 'Saving…' : prediction ? '✓ Update Prediction' : 'Play Your Shot →'}
        </button>
        {!prediction && (
          <p className="text-center text-[11px] text-zinc-500 mt-2">
            {PREDICTION_STAKE} pts will be staked
          </p>
        )}
      </div>

      {prediction && (
        <button onClick={() => setEditing(false)}
          className="w-full py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Cancel
        </button>
      )}
    </div>
  );
}

// ── Match Hero ─────────────────────────────────────────────────────────────────

function MatchHero({ match }: { match: CricketMatch }) {
  const isLive = isLiveStatus(match.status);
  const winner = match.result ? extractWinner(match.result) : null;

  return (
    <div className="relative overflow-hidden hero-gradient px-4 pt-6 pb-8">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/3 w-64 h-64 rounded-full blur-[100px]"
          style={{ backgroundColor: match.homeTeam.primaryColor }} />
        <div className="absolute top-0 right-1/3 w-48 h-48 rounded-full blur-[80px]"
          style={{ backgroundColor: match.awayTeam.primaryColor }} />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <a href="/" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-5">
          ← All Matches
        </a>

        {/* Series + Format */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
            isLive ? 'bg-red-600 animate-pulse' : match.status === 'COMPLETED' ? 'bg-zinc-600' : 'bg-emerald-600'
          }`}>
            {isLive ? '● LIVE' : match.status}
          </span>
          <span className="text-xs text-zinc-500">{match.series ?? match.name}</span>
          <span className="text-xs text-zinc-600">·</span>
          <span className="text-xs text-zinc-500">{match.matchType}</span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <TeamHero team={match.homeTeam} score={match.homeScore}
            isBatting={match.currentBatting === 'home'}
            isWinner={winner?.toLowerCase() === match.homeTeam.name.toLowerCase()} />
          <div className="flex flex-col items-center gap-2 shrink-0">
            <span className="text-2xl font-black text-zinc-600">VS</span>
            {match.startTime && (
              <span className="text-[10px] text-zinc-500">
                {match.startTime.toLocaleString('en-IN', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                  timeZone: 'Asia/Kolkata',
                })} IST
              </span>
            )}
          </div>
          <TeamHero team={match.awayTeam} score={match.awayScore}
            isBatting={match.currentBatting === 'away'}
            isWinner={winner?.toLowerCase() === match.awayTeam.name.toLowerCase()}
            align="right" />
        </div>

        {/* Result / Status note */}
        {match.result && (
          <div className="text-center px-4 py-2.5 rounded-xl bg-positive/10 border border-positive/20">
            <p className="text-positive font-bold text-sm">{match.result}</p>
          </div>
        )}
        {!match.result && match.statusNote && (
          <div className="text-center px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-orange-300 text-sm">{match.statusNote}</p>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[11px] text-zinc-500">
          <span>📍 {match.venue}</span>
          {match.toss && <span>🪙 {match.toss.winner} won toss & chose to {match.toss.decision}</span>}
        </div>
      </div>
    </div>
  );
}

function TeamHero({
  team, score, isBatting, isWinner, align = 'left',
}: {
  team: CricketMatch['homeTeam'];
  score?: CricketMatch['homeScore'];
  isBatting?: boolean;
  isWinner?: boolean;
  align?: 'left' | 'right';
}) {
  const isRight = align === 'right';
  return (
    <div className={`flex flex-col ${isRight ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
      <div className="relative">
        <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-lg"
          style={{ backgroundColor: team.primaryColor }}>
          {team.shortName.slice(0, 2)}
        </div>
        {isBatting && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px]">🏏</span>
        )}
        {isWinner && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-positive rounded-full flex items-center justify-center text-[9px] font-black text-background">✓</span>
        )}
      </div>
      <p className={`mt-2 font-black text-white text-lg leading-tight ${isRight ? 'text-right' : ''}`}>
        {team.shortName}
      </p>
      <p className={`text-[10px] text-zinc-500 truncate max-w-[100px] ${isRight ? 'text-right' : ''}`}>{team.name}</p>
      {score && (
        <p className="mt-1 font-mono text-sm text-zinc-300 font-bold">
          {score.runs}/{score.wickets}
          <span className="text-zinc-500 font-normal text-xs ml-1">({formatOvers(score.overs)} ov)</span>
        </p>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MatchPage(props: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(props.params);
  const { user, refreshBalance } = useUser();

  const [match,      setMatch]      = useState<CricketMatch | null>(null);
  const [prediction, setPrediction] = useState<Prediction | undefined>();
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const userId   = user?.id   ?? '';
  const userName = user?.name ?? 'Fan';

  const loadData = useCallback(async () => {
    try {
      const [m, preds] = await Promise.all([
        getMatchById(matchId),
        userId ? getUserPredictions(userId) : Promise.resolve([]),
      ]);
      if (!m) { setError('Match not found'); return; }
      setMatch(m);
      setPrediction(preds.find(p => p.matchId === matchId));
    } catch {
      setError('Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [matchId, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!match || !isLiveStatus(match.status)) return;
    const id = setInterval(async () => {
      const m = await getMatchById(matchId).catch(() => null);
      if (m) setMatch(m);
    }, 30_000);
    return () => clearInterval(id);
  }, [matchId, match?.status]);

  const handleSaved = useCallback((saved: Prediction, balance?: number) => {
    setPrediction(saved);
    if (balance !== undefined) refreshBalance();
  }, [refreshBalance]);

  if (loading) return <LoadingState />;
  if (error || !match) return <ErrorState message={error || 'Match not found'} />;

  const hasEvents = match.events.length > 0;

  return (
    <div className="min-h-screen bg-background text-white">
      <MatchHero match={match} />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* ── Left column ─────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Key Moments */}
            {hasEvents && (
              <section>
                <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                  <span>⚡</span> Key Moments
                  <span className="text-xs font-normal text-zinc-500">({match.events.length})</span>
                </h2>
                <div className="rounded-2xl border border-rim overflow-hidden divide-y divide-rim">
                  {match.events.map((ev, i) => (
                    <div key={ev.id} className={`flex items-start gap-3 px-4 py-3 ${i % 2 === 1 ? 'bg-surface/40' : ''}`}>
                      <span className="text-xl shrink-0 mt-0.5">{EVENT_ICON[ev.type] ?? '📌'}</span>
                      <div className="flex-1 min-w-0">
                        {ev.over !== undefined && (
                          <span className="text-[10px] font-bold text-zinc-500 mr-1.5">{ev.over}.{ev.ball ?? 0}</span>
                        )}
                        <span className="text-xs text-zinc-300">{ev.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Match info / points breakdown */}
            <MatchInfoCard match={match} />

            {/* Match Leaderboard */}
            <MatchLeaderboardSection matchId={matchId} match={match} currentUserId={userId} />
          </div>

          {/* ── Right column: Prediction Form ────────────────────────────── */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-rim bg-surface p-5">
              <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <span>🔮</span>
                {match.status === 'COMPLETED'
                  ? 'Your Prediction'
                  : prediction
                  ? 'Update Prediction'
                  : 'Make Prediction'}
              </h2>

              {!userId ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-zinc-500 text-sm">Sign in to make a prediction</p>
                  <a href="/"
                    className="inline-block px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
                    Join to Play
                  </a>
                </div>
              ) : (
                <PredictionForm
                  match={match}
                  prediction={prediction}
                  userId={userId}
                  userName={userName}
                  onSaved={handleSaved}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Match Info Card ────────────────────────────────────────────────────────────

function MatchInfoCard({ match }: { match: CricketMatch }) {
  const tol       = scoreTolerance(match.matchType);
  const mult      = earlyMult(match);
  const multLabel = earlyLabel(match);
  const winnerPts = Math.round(10 * mult);
  const bonusPts  = Math.round(5  * mult);
  const maxPts    = Math.round(20 * mult);
  const isUpcoming = match.status === 'UPCOMING';

  return (
    <div className="space-y-4">
      {/* Early bird banner — upcoming only */}
      {isUpcoming && multLabel && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-positive/10 border border-positive/20">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-xs font-bold text-positive">{multLabel}</p>
            <p className="text-[10px] text-zinc-500">Predict early for a bonus multiplier on all points</p>
          </div>
        </div>
      )}

      {/* Points up for grabs */}
      <div className="rounded-2xl border border-rim bg-surface p-4">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Points up for grabs</p>
        <div className="space-y-2.5">
          {[
            { label: 'Pick the winner',         pts: `+${winnerPts}` },
            { label: `Home score ±${tol} runs`, pts: `+${bonusPts}` },
            { label: `Away score ±${tol} runs`, pts: `+${bonusPts}` },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{r.label}</span>
              <span className="font-bold text-positive">{r.pts}</span>
            </div>
          ))}
          {mult > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Early Bird multiplier</span>
              <span className="font-bold text-accent">×{mult}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2.5 border-t border-rim">
            <span className="text-sm font-bold text-white">Max possible</span>
            <span className="font-black text-accent text-lg">+{maxPts} pts</span>
          </div>
        </div>
      </div>

      {/* Match details */}
      <div className="rounded-2xl border border-rim bg-surface p-4">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Match details</p>
        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2.5">
            <span>🏏</span>
            <span>{match.matchType}{match.series ? ` · ${match.series}` : ''}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span>📅</span>
            <span>
              {match.startTime.toLocaleString('en-IN', {
                day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit', hour12: true,
                timeZone: 'Asia/Kolkata',
              })} IST
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span>📍</span>
            <span>{match.venue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Match Leaderboard Section ──────────────────────────────────────────────────

function MatchLeaderboardSection({
  matchId, match, currentUserId,
}: {
  matchId: string;
  match: CricketMatch;
  currentUserId: string;
}) {
  const [entries, setEntries] = useState<Array<{
    rank: number; userId: string; userName: string;
    predictedWinner: string; predictedHomeRuns?: number; predictedAwayRuns?: number;
    points?: number; isCorrectWinner: boolean;
  }>>([]);

  useEffect(() => {
    fetch(`/api/leaderboard/${encodeURIComponent(matchId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {});
  }, [matchId]);

  if (entries.length === 0) return null;

  const isCompleted = match.status === 'COMPLETED';

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-white flex items-center gap-2">
          <span>🏆</span> Match Predictions
          <span className="text-xs font-normal text-zinc-500">({entries.length})</span>
        </h2>
        <a href={`/leaderboard/${matchId}`} className="text-[10px] text-positive hover:underline">
          Full rankings →
        </a>
      </div>
      <div className="rounded-2xl border border-rim overflow-hidden">
        <div className={`grid gap-x-3 px-4 py-2.5 bg-surface border-b border-rim text-[10px] font-semibold text-zinc-500 uppercase tracking-wider ${
          isCompleted ? 'grid-cols-[2rem_1fr_4rem_4rem_3.5rem]' : 'grid-cols-[2rem_1fr_4rem_4rem]'
        }`}>
          <span>#</span><span>Player</span>
          <span className="text-right">Pick</span>
          <span className="text-right">Scores</span>
          {isCompleted && <span className="text-right">Pts</span>}
        </div>
        {entries.slice(0, 8).map((e, i) => {
          const isMe = e.userId === currentUserId;
          const ptsColor = e.points === undefined ? '' : e.points > 0 ? 'text-positive' : e.points < 0 ? 'text-red-400' : 'text-zinc-500';
          return (
            <div key={e.userId}
              className={`grid gap-x-3 px-4 py-2.5 items-center text-xs ${
                isCompleted ? 'grid-cols-[2rem_1fr_4rem_4rem_3.5rem]' : 'grid-cols-[2rem_1fr_4rem_4rem]'
              } ${isMe ? 'bg-accent/5 border-l-2 border-accent' : i % 2 === 1 ? 'bg-surface/50' : ''}`}>
              <span className="text-zinc-500 font-mono">{e.rank}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center font-black text-white text-[9px]"
                  style={{ background: 'linear-gradient(135deg, var(--pm-brand) 0%, var(--pm-accent) 100%)' }}>
                  {e.userName.slice(0, 1).toUpperCase()}
                </div>
                <span className={`truncate font-semibold ${isMe ? 'text-accent' : 'text-white'}`}>
                  {e.userName}{isMe ? ' (you)' : ''}
                </span>
              </div>
              <span className={`text-right font-bold truncate text-[10px] ${
                isCompleted ? (e.isCorrectWinner ? 'text-positive' : 'text-red-400') : 'text-zinc-400'
              }`}>
                {e.predictedWinner}
              </span>
              <span className="text-right font-mono text-zinc-500 text-[10px]">
                {e.predictedHomeRuns ?? '—'}/{e.predictedAwayRuns ?? '—'}
              </span>
              {isCompleted && (
                <span className={`text-right font-black ${ptsColor}`}>
                  {e.points !== undefined ? (e.points > 0 ? `+${e.points}` : e.points) : '—'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Skeleton states ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
        <p className="text-zinc-500 text-sm">Loading match…</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-5xl">😔</p>
        <p className="text-zinc-400">{message}</p>
        <a href="/" className="inline-block px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
          ← Back to Matches
        </a>
      </div>
    </div>
  );
}
