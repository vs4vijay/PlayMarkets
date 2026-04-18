'use client';

import { useState, useEffect } from 'react';
import type { CricketMatch, Prediction } from '@/types';
import { getUserPredictions, savePrediction } from '@/lib/api';

// ── ScoreSpinner ──────────────────────────────────────────────────────────────

function ScoreSpinner({
  value,
  onChange,
  step = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => onChange(value + step)}
        className="w-8 h-8 rounded-full bg-[#1e2d45] hover:bg-[#003791] flex items-center justify-center text-sm font-bold transition-colors"
      >
        +
      </button>
      <span className="text-2xl font-black text-[#FF7722] w-12 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        className="w-8 h-8 rounded-full bg-[#1e2d45] hover:bg-[#003791] flex items-center justify-center text-sm font-bold transition-colors"
      >
        −
      </button>
    </div>
  );
}

// ── PredictionCard ────────────────────────────────────────────────────────────

interface PredictionCardProps {
  match: CricketMatch;
  prediction?: Prediction;
  onPredict: (winner: string, homeRuns: number, awayRuns: number) => void;
  onUpdate: (winner: string, homeRuns: number, awayRuns: number) => void;
}

function PredictionCard({ match, prediction, onPredict, onUpdate }: PredictionCardProps) {
  const defaultRuns = match.matchType === 'T20' ? 160 : match.matchType === 'ODI' ? 280 : 350;
  const step        = match.matchType === 'T20' ? 5 : 10;

  const [winner,   setWinner]   = useState<string>(prediction?.predictedWinner ?? '');
  const [homeRuns, setHomeRuns] = useState(prediction?.predictedHomeRuns ?? defaultRuns);
  const [awayRuns, setAwayRuns] = useState(prediction?.predictedAwayRuns ?? defaultRuns - 15);
  const [editing,  setEditing]  = useState(!prediction);

  const canPredict = match.status === 'UPCOMING';

  const handleSubmit = () => {
    if (!winner) return;
    if (prediction) onUpdate(winner, homeRuns, awayRuns);
    else            onPredict(winner, homeRuns, awayRuns);
    setEditing(false);
  };

  const pts = prediction?.points;
  const ptsColor =
    pts === undefined || !prediction?.scored ? ''
    : pts > 0  ? 'text-[#00D4B4]'
    : pts < 0  ? 'text-red-400'
    : 'text-zinc-500';
  const ptsLabel =
    pts === undefined || !prediction?.scored ? null
    : pts > 0  ? `+${pts} pts`
    : pts === 0 ? '0 pts'
    : `${pts} pts`;

  return (
    <div className="bg-[#0e1628] rounded-xl p-4 border border-[#1e2d45]">
      {/* Teams header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black"
            style={{ backgroundColor: match.homeTeam.primaryColor }}
          >
            {match.homeTeam.shortName.slice(0, 2)}
          </div>
          <span className="text-xs font-semibold text-white">{match.homeTeam.shortName}</span>
        </div>
        <span className="text-zinc-500 text-xs">vs</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white">{match.awayTeam.shortName}</span>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black"
            style={{ backgroundColor: match.awayTeam.primaryColor }}
          >
            {match.awayTeam.shortName.slice(0, 2)}
          </div>
        </div>
      </div>

      {/* ── Upcoming: editable form ── */}
      {canPredict && editing && (
        <>
          <p className="text-[10px] text-zinc-500 mb-1.5 text-center">Pick the winner</p>
          <div className="flex gap-2 mb-3">
            {[match.homeTeam, match.awayTeam].map((t) => (
              <button
                key={t.id}
                onClick={() => setWinner(t.name)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  winner === t.name
                    ? 'text-white ring-2'
                    : 'bg-[#1e2d45] text-zinc-400 hover:text-white'
                }`}
                style={winner === t.name ? { backgroundColor: t.primaryColor } : {}}
              >
                {t.shortName}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-zinc-500 mb-2 text-center">Predict runs</p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-zinc-500 mb-1">{match.homeTeam.shortName}</span>
              <ScoreSpinner value={homeRuns} onChange={setHomeRuns} step={step} />
            </div>
            <span className="text-zinc-600 font-bold text-lg mt-3">–</span>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-zinc-500 mb-1">{match.awayTeam.shortName}</span>
              <ScoreSpinner value={awayRuns} onChange={setAwayRuns} step={step} />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!winner}
            className="w-full mt-3 py-2 bg-[#FF7722] text-white rounded-lg text-xs font-bold hover:bg-[#ff8c3a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {prediction ? 'Update Prediction' : 'Submit Prediction'}
          </button>
        </>
      )}

      {/* ── Upcoming: locked summary ── */}
      {canPredict && !editing && prediction && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Your pick</span>
            <span className="font-bold text-[#FF7722]">{prediction.predictedWinner}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Predicted score</span>
            <span className="font-mono text-zinc-300">
              {prediction.predictedHomeRuns} – {prediction.predictedAwayRuns}
            </span>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full py-1.5 border border-[#1e2d45] text-zinc-400 rounded-lg text-xs hover:text-white hover:border-zinc-500 transition-colors"
          >
            Change Prediction
          </button>
        </div>
      )}

      {/* ── Completed: result + scoring ── */}
      {!canPredict && prediction && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Your pick</span>
            <span className="font-bold text-[#FF7722]">{prediction.predictedWinner}</span>
          </div>
          {match.result && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Result</span>
              <span className="font-medium text-[#00D4B4]">{match.result}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Predicted</span>
            <span className="font-mono text-zinc-400">
              {prediction.predictedHomeRuns} – {prediction.predictedAwayRuns}
            </span>
          </div>
          {prediction.scored && ptsLabel && (
            <div className="flex items-center justify-between text-xs mt-1 pt-1.5 border-t border-[#1e2d45]">
              <span className="text-zinc-500">Points</span>
              <span className={`font-black text-sm ${ptsColor}`}>{ptsLabel}</span>
            </div>
          )}
          <a
            href={`/leaderboard/${match.id}`}
            className="block w-full text-center mt-1 py-1 text-[10px] text-[#00D4B4] hover:underline"
          >
            Match leaderboard →
          </a>
        </div>
      )}

      {!canPredict && !prediction && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-600 text-center py-1">
            {match.status === 'COMPLETED' ? 'No prediction made' : 'Match already in progress'}
          </p>
          {match.status === 'COMPLETED' && (
            <a
              href={`/leaderboard/${match.id}`}
              className="block w-full text-center py-1 text-[10px] text-zinc-500 hover:text-[#00D4B4] hover:underline"
            >
              See who predicted →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── PredictionsPanel ──────────────────────────────────────────────────────────

interface PredictionsPanelProps {
  matches: CricketMatch[];
  userId?: string;
  userName?: string;
}

export function PredictionsPanel({
  matches,
  userId = 'anonymous',
  userName = 'Fan',
}: PredictionsPanelProps) {
  const [userPredictions, setUserPredictions] = useState<Map<string, Prediction>>(new Map());
  const [showPanel, setShowPanel] = useState(false);

  // Load persisted predictions on mount (or when userId changes).
  useEffect(() => {
    if (!userId || userId === 'anonymous') return;
    getUserPredictions(userId)
      .then((preds) => {
        setUserPredictions(new Map(preds.map((p) => [p.matchId, p])));
      })
      .catch(() => {/* use local state as fallback */});
  }, [userId]);

  const upcomingMatches    = matches.filter((m) => m.status === 'UPCOMING').slice(0, 6);
  const completedWithPreds = matches
    .filter((m) => m.status === 'COMPLETED' && userPredictions.has(m.id))
    .slice(0, 3);
  const displayMatches     = [...upcomingMatches, ...completedWithPreds];
  const totalPredictions   = userPredictions.size;

  const persist = (matchId: string, prediction: Prediction) => {
    savePrediction({
      userId,
      userName,
      matchId,
      predictedWinner:   prediction.predictedWinner,
      predictedHomeRuns: prediction.predictedHomeRuns ?? 0,
      predictedAwayRuns: prediction.predictedAwayRuns ?? 0,
      isPublic: prediction.isPublic,
    }).catch(() => {/* server errors don't break the optimistic local state */});
  };

  const handlePredict = (matchId: string) => (winner: string, homeRuns: number, awayRuns: number) => {
    const pred: Prediction = {
      id: `pred-${matchId}-${Date.now()}`,
      matchId,
      userId,
      userName,
      predictedWinner: winner,
      predictedHomeRuns: homeRuns,
      predictedAwayRuns: awayRuns,
      isPublic: true,
      createdAt: new Date(),
      scored: false,
    };
    setUserPredictions((prev) => new Map(prev).set(matchId, pred));
    persist(matchId, pred);
  };

  const handleUpdate = (matchId: string) => (winner: string, homeRuns: number, awayRuns: number) => {
    const existing = userPredictions.get(matchId);
    if (!existing) return;
    const updated: Prediction = {
      ...existing,
      predictedWinner: winner,
      predictedHomeRuns: homeRuns,
      predictedAwayRuns: awayRuns,
    };
    setUserPredictions((prev) => new Map(prev).set(matchId, updated));
    persist(matchId, updated);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform z-50 bg-[#FF7722]"
        title="Predictions"
      >
        🔮
        {totalPredictions > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#003791] text-white text-[10px] font-bold flex items-center justify-center">
            {totalPredictions}
          </span>
        )}
      </button>

      {/* Slide-up panel */}
      {showPanel && (
        <div className="fixed bottom-24 right-6 w-80 max-h-[75vh] bg-[#070d1a] rounded-2xl shadow-2xl border border-[#1e2d45] overflow-hidden z-50">
          <div className="p-4 border-b border-[#1e2d45] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">🔮 Predictions</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {totalPredictions} made · {upcomingMatches.length} available
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/leaderboard"
                className="text-[10px] text-[#00D4B4] hover:underline"
                onClick={() => setShowPanel(false)}
              >
                Leaderboard →
              </a>
              <button
                onClick={() => setShowPanel(false)}
                className="w-7 h-7 rounded-full bg-[#1e2d45] text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[55vh] p-3 space-y-3">
            {displayMatches.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-8">No upcoming matches to predict</p>
            ) : (
              displayMatches.map((match) => (
                <PredictionCard
                  key={match.id}
                  match={match}
                  prediction={userPredictions.get(match.id)}
                  onPredict={handlePredict(match.id)}
                  onUpdate={handleUpdate(match.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
