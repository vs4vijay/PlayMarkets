'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CricketMatch, Prediction, MatchType } from '@/types';
import { PREDICTION_STAKE } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreTolerance(matchType: MatchType): number {
  switch (matchType) {
    case 'T10':  return 10;
    case 'T20':  return 15;
    case 'ODI':  return 25;
    case 'TEST': return 40;
    default:     return 20;
  }
}

function scorePresets(matchType: MatchType): number[] {
  switch (matchType) {
    case 'T10':  return [80, 100, 120, 140];
    case 'T20':  return [140, 160, 180, 200];
    case 'ODI':  return [220, 260, 300, 330];
    case 'TEST': return [250, 320, 380, 450];
    default:     return [150, 175, 200, 225];
  }
}

function scoreStep(matchType: MatchType): number {
  return matchType === 'T20' || matchType === 'T10' ? 5 : 10;
}

function earlyMultiplier(match: CricketMatch): number {
  const h = (match.startTime.getTime() - Date.now()) / 3_600_000;
  if (h > 48) return 1.5;
  if (h > 12) return 1.25;
  return 1.0;
}

function earlyLabel(match: CricketMatch): string {
  const h = (match.startTime.getTime() - Date.now()) / 3_600_000;
  if (h > 48) return '⚡ Early Bird ×1.5 bonus active';
  if (h > 12) return '⚡ Early Bird ×1.25 bonus active';
  return '';
}

// ── ScoreInput ────────────────────────────────────────────────────────────────

function ScoreInput({
  team,
  value,
  onChange,
  presets,
  step,
}: {
  team: CricketMatch['homeTeam'];
  value: number;
  onChange: (v: number) => void;
  presets: number[];
  step: number;
}) {
  return (
    <div>
      {/* Team label */}
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
          style={{ backgroundColor: team.primaryColor }}
        >
          {team.shortName.slice(0, 2)}
        </div>
        <span className="text-xs font-bold text-zinc-300">{team.shortName}</span>
      </div>

      {/* Preset chips */}
      <div className="flex gap-1.5 mb-2.5 flex-wrap">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              value === p
                ? 'bg-[#FF7722] text-white'
                : 'bg-[#1e2d45] text-zinc-400 hover:text-white hover:bg-[#2d3d55]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Fine-tune */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - step))}
          className="w-10 h-10 rounded-xl bg-[#1e2d45] text-white font-black text-lg hover:bg-[#2d3d55] transition-colors flex items-center justify-center"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={0}
          max={600}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 0) onChange(v);
          }}
          className="flex-1 text-center py-2.5 rounded-xl bg-[#1e2d45] text-white font-black text-xl focus:outline-none focus:ring-2 focus:ring-[#FF7722]/50 border border-transparent focus:border-[#FF7722]/40 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => onChange(value + step)}
          className="w-10 h-10 rounded-xl bg-[#1e2d45] text-white font-black text-lg hover:bg-[#2d3d55] transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── PredictionModal ───────────────────────────────────────────────────────────

interface PredictionModalProps {
  match: CricketMatch;
  existing?: Prediction;
  onSubmit: (winner: string, homeRuns: number, awayRuns: number) => void;
  onClose: () => void;
}

export function PredictionModal({ match, existing, onSubmit, onClose }: PredictionModalProps) {
  const presets  = scorePresets(match.matchType);
  const step     = scoreStep(match.matchType);
  const tol      = scoreTolerance(match.matchType);
  const mult     = earlyMultiplier(match);
  const multLabel = earlyLabel(match);

  const defaultHome = presets[1] ?? 160;
  const defaultAway = (presets[1] ?? 160) - (match.matchType === 'ODI' ? 20 : 10);

  const [winner,    setWinner]    = useState(existing?.predictedWinner ?? '');
  const [homeRuns,  setHomeRuns]  = useState(existing?.predictedHomeRuns ?? defaultHome);
  const [awayRuns,  setAwayRuns]  = useState(existing?.predictedAwayRuns ?? defaultAway);
  const [step2,     setStep2]     = useState(!!existing?.predictedWinner);
  const [submitted, setSubmitted] = useState(false);

  const handleWinner = (name: string) => {
    setWinner(name);
    if (!step2) setStep2(true);
  };

  const handleSubmit = () => {
    if (!winner) return;
    setSubmitted(true);
    setTimeout(() => {
      onSubmit(winner, homeRuns, awayRuns);
    }, 800); // brief "staked" flash before closing
  };

  // Close on Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Net gains after the stake is returned at scoring time.
  const maxPts    = Math.round(20 * mult);  // net if winner + both scores correct
  const winnerPts = mult > 1 ? Math.round(10 * mult) : 10;
  const bonusPts  = mult > 1 ? Math.round(5  * mult) : 5;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#070d1a]/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, centered card on desktop */}
      <div
        className="relative w-full max-w-md bg-[#0e1628] rounded-t-3xl sm:rounded-3xl border border-[#1e2d45] max-h-[92vh] overflow-y-auto shadow-2xl shadow-black/60"
        style={{ animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#2d3d55]" />
        </div>

        {/* ── Match header ── */}
        <div className="px-5 pt-3 pb-5 border-b border-[#1e2d45]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {match.matchType} · {match.series ?? match.name}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{match.venue}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1e2d45] text-zinc-400 hover:text-white flex items-center justify-center text-sm ml-2 shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between gap-4">
            <TeamDisplay team={match.homeTeam} />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-xs font-black text-zinc-600">VS</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${match.homeTeam.primaryColor}20`, color: match.homeTeam.primaryColor }}
              >
                {match.matchType}
              </span>
            </div>
            <TeamDisplay team={match.awayTeam} align="right" />
          </div>

          {/* Status badge */}
          {multLabel ? (
            <div className="mt-3.5 flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00D4B4]/10 border border-[#00D4B4]/25 text-xs text-[#00D4B4] font-bold">
                {multLabel}
              </div>
            </div>
          ) : match.status !== 'UPCOMING' ? (
            <div className="mt-3.5 flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-bold">
                🔴 Match is live — no early bonus
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 space-y-6">

          {/* Step 1 — Winner */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
              1 · Pick the winner
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[match.homeTeam, match.awayTeam].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleWinner(t.name)}
                  className={`py-4 px-3 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 border-2 ${
                    winner === t.name
                      ? 'text-white border-transparent scale-[1.02]'
                      : 'bg-[#1e2d45] text-zinc-400 hover:text-white border-transparent hover:border-white/10'
                  }`}
                  style={
                    winner === t.name
                      ? { backgroundColor: t.primaryColor, borderColor: 'rgba(255,255,255,0.3)' }
                      : {}
                  }
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-sm"
                    style={{ backgroundColor: winner === t.name ? 'rgba(255,255,255,0.2)' : t.primaryColor }}
                  >
                    {t.shortName.slice(0, 2)}
                  </div>
                  <span className="text-sm font-black">{t.shortName}</span>
                  <span className="text-[10px] opacity-70 font-normal truncate max-w-full px-1 text-center">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Scores (reveals after winner picked) */}
          <div className={`space-y-4 transition-all duration-300 ${step2 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                2 · Predict final scores
                <span className="ml-2 text-zinc-600 normal-case font-normal">optional</span>
              </p>
              <span className="text-[10px] text-zinc-600">±{tol} runs = +5 pts each</span>
            </div>

            <ScoreInput
              team={match.homeTeam}
              value={homeRuns}
              onChange={setHomeRuns}
              presets={presets}
              step={step}
            />
            <ScoreInput
              team={match.awayTeam}
              value={awayRuns}
              onChange={setAwayRuns}
              presets={presets}
              step={step}
            />
          </div>

          {/* Points preview */}
          {winner && (
            <div className="rounded-2xl bg-[#070d1a] border border-[#1e2d45] p-4">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2.5">
                Potential outcome
              </p>
              <div className="space-y-1.5 text-xs">
                <Row label="Correct winner" value={`+${winnerPts} pts`} color="text-[#00D4B4]" />
                <Row label={`Home score within ±${tol}`} value={`+${bonusPts} pts`} color="text-[#00D4B4]" />
                <Row label={`Away score within ±${tol}`} value={`+${bonusPts} pts`} color="text-[#00D4B4]" />
                {mult > 1 && (
                  <Row label="Early Bird multiplier" value={`×${mult}`} color="text-[#FF7722]" />
                )}
                <div className="border-t border-[#1e2d45] pt-2 mt-2 flex items-center justify-between">
                  <span className="text-zinc-300 font-bold">Max possible</span>
                  <span className="text-[#FF7722] font-black text-base">+{maxPts} pts</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Wrong winner (stake lost)</span>
                  <span className="text-red-400 font-bold">−{PREDICTION_STAKE} pts</span>
                </div>
              </div>
            </div>
          )}

          {/* Stake notice — only on new predictions */}
          {!existing && !submitted && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1e2d45]/60 border border-[#2d3d55] text-xs">
              <span className="text-zinc-400">Stake on submit</span>
              <span className="font-black text-[#FF7722]">−{PREDICTION_STAKE} pts</span>
            </div>
          )}

          {/* Submit / Staked confirmation */}
          {submitted ? (
            <div className="w-full py-4 rounded-2xl text-center font-black text-sm text-white bg-[#00D4B4]/20 border border-[#00D4B4]/40 text-[#00D4B4]">
              ✓ {PREDICTION_STAKE} pts staked — good luck!
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!winner}
              className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
            >
              {existing ? '✓ Update Prediction' : `Lock In · −${PREDICTION_STAKE} pts →`}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function TeamDisplay({
  team,
  align = 'left',
}: {
  team: CricketMatch['homeTeam'];
  align?: 'left' | 'right';
}) {
  return (
    <div className={`flex items-center gap-3 flex-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
        style={{ backgroundColor: team.primaryColor }}
      >
        {team.shortName.slice(0, 2)}
      </div>
      <div className={align === 'right' ? 'text-right' : 'text-left'}>
        <p className="font-black text-white text-base leading-tight">{team.shortName}</p>
        <p className="text-[10px] text-zinc-500 leading-tight max-w-[80px] truncate">{team.name}</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
