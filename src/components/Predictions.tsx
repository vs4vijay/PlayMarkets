'use client';

// MyPredictionsPanel — a read-only FAB that shows a summary of all predictions.
// Editing predictions navigates to /match/[matchId].

import { useState } from 'react';
import type { CricketMatch, Prediction } from '@/types';

interface MyPredictionsPanelProps {
  matches: CricketMatch[];
  userPredictions: Map<string, Prediction>;
}

export function MyPredictionsPanel({
  matches,
  userPredictions,
}: MyPredictionsPanelProps) {
  const [open, setOpen] = useState(false);

  const predictedMatches = matches.filter((m) => userPredictions.has(m.id));
  const upcoming = predictedMatches.filter((m) => !['COMPLETED', 'ABANDONED', 'CANCELLED'].includes(m.status));
  const completed = predictedMatches.filter((m) => m.status === 'COMPLETED');
  const totalPoints = [...userPredictions.values()]
    .filter((p) => p.scored)
    .reduce((s, p) => s + (p.points ?? 0), 0);
  const total = userPredictions.size;

  if (total === 0) return null;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 h-12 rounded-full shadow-lg text-white font-bold text-sm hover:scale-105 transition-transform z-50 bg-[#0e1628] border border-[#1e2d45] hover:border-[#FF7722]/50"
        title="My Predictions"
      >
        <span className="text-base">🔮</span>
        <span className="text-white font-black">{total}</span>
        {totalPoints !== 0 && (
          <span className={`text-xs font-black ${totalPoints > 0 ? 'text-[#00D4B4]' : 'text-red-400'}`}>
            {totalPoints > 0 ? `+${totalPoints}` : totalPoints} pts
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 max-h-[70vh] bg-[#070d1a] rounded-2xl shadow-2xl border border-[#1e2d45] overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#1e2d45] flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-black text-white text-sm">My Predictions</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {upcoming.length} upcoming · {completed.length} scored
                {totalPoints !== 0 && (
                  <span className={`ml-1 font-bold ${totalPoints > 0 ? 'text-[#00D4B4]' : 'text-red-400'}`}>
                    · {totalPoints > 0 ? '+' : ''}{totalPoints} pts
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-[#1e2d45] text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {predictedMatches.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No predictions yet</p>
            ) : (
              predictedMatches.map((match) => {
                const pred = userPredictions.get(match.id)!;
                const isUpcoming = !['COMPLETED', 'ABANDONED', 'CANCELLED'].includes(match.status);
                const pts = pred.points;
                const ptsColor =
                  pts === undefined || !pred.scored ? 'text-zinc-500'
                  : pts > 0 ? 'text-[#00D4B4]'
                  : pts < 0 ? 'text-red-400'
                  : 'text-zinc-500';

                return (
                  <div
                    key={match.id}
                    className="bg-[#0e1628] rounded-xl p-3 border border-[#1e2d45]"
                  >
                    {/* Teams */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                          style={{ backgroundColor: match.homeTeam.primaryColor }}
                        >
                          {match.homeTeam.shortName.slice(0, 2)}
                        </div>
                        <span className="text-[11px] font-semibold text-white">{match.homeTeam.shortName}</span>
                      </div>
                      <span className="text-[9px] text-zinc-600">vs</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-white">{match.awayTeam.shortName}</span>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                          style={{ backgroundColor: match.awayTeam.primaryColor }}
                        >
                          {match.awayTeam.shortName.slice(0, 2)}
                        </div>
                      </div>
                    </div>

                    {/* Prediction details */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="text-zinc-400">
                          Pick: <span className="text-[#FF7722] font-bold">{pred.predictedWinner}</span>
                        </p>
                        {pred.predictedHomeRuns !== undefined && (
                          <p className="text-zinc-600 font-mono text-[10px]">
                            {pred.predictedHomeRuns} – {pred.predictedAwayRuns} runs
                          </p>
                        )}
                        {match.result && (
                          <p className="text-[#00D4B4] text-[10px]">{match.result}</p>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        {pred.scored && (
                          <p className={`font-black text-sm ${ptsColor}`}>
                            {pts !== undefined && pts > 0 ? `+${pts}` : pts ?? 0} pts
                          </p>
                        )}
                        {isUpcoming && (
                          <a
                            href={`/match/${match.id}`}
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-zinc-500 hover:text-white border border-[#2d3d55] hover:border-zinc-500 px-2 py-0.5 rounded-md transition-colors"
                          >
                            Edit
                          </a>
                        )}
                        {!isUpcoming && (
                          <a
                            href={`/match/${match.id}`}
                            className="text-[10px] text-zinc-500 hover:text-[#00D4B4] transition-colors"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#1e2d45] p-3 flex gap-2 shrink-0">
            <a
              href="/leaderboard"
              onClick={() => setOpen(false)}
              className="flex-1 text-center py-2 text-xs font-bold text-zinc-400 border border-[#1e2d45] rounded-xl hover:text-white hover:bg-[#1e2d45] transition-colors"
            >
              Leaderboard
            </a>
            <a
              href="/rules"
              onClick={() => setOpen(false)}
              className="flex-1 text-center py-2 text-xs font-bold text-zinc-400 border border-[#1e2d45] rounded-xl hover:text-white hover:bg-[#1e2d45] transition-colors"
            >
              Rules
            </a>
          </div>
        </div>
      )}
    </>
  );
}
