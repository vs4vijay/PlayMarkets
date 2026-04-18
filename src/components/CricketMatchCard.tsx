'use client';

import { useState } from 'react';
import type { CricketMatch, CricketScore, ReactionType, CricketEventType } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatOvers(overs: number): string {
  const full = Math.floor(overs);
  const balls = Math.round((overs - full) * 10);
  return balls > 0 ? `${full}.${balls}` : `${full}`;
}

function scoreText(score: CricketScore): string {
  return `${score.runs}/${score.wickets} (${formatOvers(score.overs)} ov)`;
}

function formatMatchTime(date: Date, status: string): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (status !== 'UPCOMING') return '';
  if (diff < 60 * 60 * 1000) return `In ${Math.ceil(diff / 60 / 1000)}m`;
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getStatusBadge(status: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    LIVE:          { label: '● LIVE',        cls: 'bg-red-600 text-white animate-pulse' },
    TOSS:          { label: '🪙 TOSS',       cls: 'bg-yellow-500 text-black' },
    INNINGS_BREAK: { label: '☕ BREAK',      cls: 'bg-orange-500 text-white' },
    DRINKS:        { label: '💧 DRINKS',     cls: 'bg-blue-500 text-white' },
    LUNCH:         { label: '🥗 LUNCH',      cls: 'bg-green-600 text-white' },
    TEA:           { label: '🍵 TEA',        cls: 'bg-amber-600 text-white' },
    STUMPS:        { label: '🌙 STUMPS',     cls: 'bg-indigo-600 text-white' },
    RAIN_DELAY:    { label: '🌧️ RAIN',      cls: 'bg-blue-700 text-white' },
    COMPLETED:     { label: 'RESULT',        cls: 'bg-zinc-600 text-white' },
    UPCOMING:      { label: 'UPCOMING',      cls: 'bg-emerald-600 text-white' },
    POSTPONED:     { label: 'POSTPONED',     cls: 'bg-yellow-600 text-white' },
    CANCELLED:     { label: 'CANCELLED',     cls: 'bg-red-800 text-white' },
    ABANDONED:     { label: 'ABANDONED',     cls: 'bg-orange-700 text-white' },
  };
  return map[status] ?? { label: status, cls: 'bg-zinc-500 text-white' };
}

function getMatchTypeBadge(type: string): string {
  const map: Record<string, string> = {
    T20: 'bg-[#FF7722]/20 text-[#FF7722] border border-[#FF7722]/30',
    ODI: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    TEST: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    T10: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  };
  return map[type] ?? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30';
}

function eventIcon(type: CricketEventType): string {
  const map: Record<CricketEventType, string> = {
    WICKET:          '🔴',
    BOUNDARY_FOUR:   '4️⃣',
    BOUNDARY_SIX:    '6️⃣',
    FIFTY:           '🌟',
    CENTURY:         '💯',
    MAIDEN_OVER:     '🧊',
    REVIEW_SUCCESS:  '✅',
    REVIEW_FAILED:   '❌',
    NO_BALL:         '🟡',
    WIDE:            '🟡',
    MATCH_START:     '🏏',
    INNINGS_END:     '📋',
  };
  return map[type] ?? '📌';
}

// ── Team Avatar ───────────────────────────────────────────────────────────────

function TeamAvatar({
  team,
  score,
  isBatting,
  size = 'md',
}: {
  team: CricketMatch['homeTeam'];
  score?: CricketScore;
  isBatting?: boolean;
  size?: 'sm' | 'md';
}) {
  const sz = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-base';
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div
        className={`${sz} rounded-full flex items-center justify-center font-black text-white relative shrink-0`}
        style={{ backgroundColor: team.primaryColor }}
      >
        {team.shortName.slice(0, 2)}
        {isBatting && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px]">
            🏏
          </span>
        )}
      </div>
      <span className="text-xs font-bold text-white/90 text-center truncate max-w-[64px]">
        {team.shortName}
      </span>
      {score && (
        <span className="text-[11px] font-mono text-white/70 text-center whitespace-nowrap">
          {scoreText(score)}
        </span>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CricketMatchCardProps {
  match: CricketMatch;
  onReact: (matchId: string, eventId: string | undefined, type: ReactionType) => void;
  userReactions: Set<string>;
}

export function CricketMatchCard({ match, onReact, userReactions }: CricketMatchCardProps) {
  const [showEvents, setShowEvents] = useState(false);

  const reactionTypes: ReactionType[] = ['🔥', '💪', '😭', '🙌', '😱', '👀'];
  const badge = getStatusBadge(match.status);
  const isLive = match.status === 'LIVE' || match.status === 'INNINGS_BREAK';

  const hasScore = match.homeScore || match.awayScore;

  return (
    <div
      className={`
        rounded-2xl overflow-hidden border transition-all duration-200
        bg-[#0e1628] border-[#1e2d45]
        hover:border-[#003791]/60 hover:shadow-lg hover:shadow-[#003791]/10
        ${isLive ? 'border-red-600/40 shadow-sm shadow-red-600/10' : ''}
      `}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-white/[0.03] border-b border-[#1e2d45]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getMatchTypeBadge(match.matchType)}`}>
            {match.matchType}
          </span>
          <span className="text-[11px] text-zinc-400 truncate">{match.series ?? match.name}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* ── Teams + Score ────────────────────────────────────────────────────── */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <TeamAvatar
            team={match.homeTeam}
            score={match.homeScore}
            isBatting={match.currentBatting === 'home'}
          />

          {/* Centre: VS or scores summary */}
          <div className="flex-1 flex flex-col items-center gap-1 px-2">
            {match.status === 'UPCOMING' ? (
              <>
                <span className="text-2xl font-black text-zinc-500">VS</span>
                <span className="text-xs text-[#00D4B4] font-medium">
                  {formatMatchTime(match.startTime, match.status)}
                </span>
              </>
            ) : hasScore ? (
              <div className="text-center space-y-0.5">
                {match.result && (
                  <p className="text-[11px] font-semibold text-[#00D4B4] text-center leading-tight">
                    {match.result}
                  </p>
                )}
                {match.statusNote && match.status === 'LIVE' && (
                  <p className="text-[10px] text-zinc-400 text-center leading-tight max-w-[120px]">
                    {match.statusNote}
                  </p>
                )}
                {!match.result && !match.statusNote && (
                  <span className="text-zinc-500 text-sm font-semibold">🏏</span>
                )}
              </div>
            ) : (
              <span className="text-2xl font-black text-zinc-500">VS</span>
            )}
          </div>

          <TeamAvatar
            team={match.awayTeam}
            score={match.awayScore}
            isBatting={match.currentBatting === 'away'}
          />
        </div>

        {/* Status note for innings break */}
        {match.status === 'INNINGS_BREAK' && match.statusNote && (
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
            <p className="text-[11px] text-orange-300">{match.statusNote}</p>
          </div>
        )}

        {/* Toss info */}
        {match.toss && match.status !== 'UPCOMING' && (
          <p className="mt-2 text-center text-[10px] text-zinc-500">
            🪙 {match.toss.winner} won toss & chose to {match.toss.decision}
          </p>
        )}
      </div>

      {/* ── Venue + Time ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-2 flex items-center justify-between text-[10px] text-zinc-500 border-t border-[#1e2d45]">
        <span className="truncate flex-1">{match.venue}</span>
        <span className="shrink-0 ml-2">
          {match.startTime.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            timeZone: 'Asia/Kolkata',
          })}
          {match.status === 'UPCOMING' && (
            <> · {match.startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST</>
          )}
        </span>
      </div>

      {/* ── Match Events ────────────────────────────────────────────────────── */}
      {match.events.length > 0 && (
        <div className="border-t border-[#1e2d45]">
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="w-full px-4 py-2 text-[11px] font-medium text-zinc-400 hover:bg-white/[0.03] flex items-center justify-between"
          >
            <span>Key Moments ({match.events.length})</span>
            <span className={`transition-transform duration-200 ${showEvents ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {showEvents && (
            <div className="px-3 pb-3 space-y-1.5 max-h-56 overflow-y-auto">
              {match.events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] cursor-default"
                >
                  <span className="text-base shrink-0 mt-0.5">{eventIcon(ev.type)}</span>
                  <div className="flex-1 min-w-0">
                    {ev.over !== undefined && (
                      <span className="text-[10px] font-bold text-zinc-500 mr-1">{ev.over}.{ev.ball ?? 0}</span>
                    )}
                    <span className="text-[11px] text-zinc-300">{ev.description}</span>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {reactionTypes.slice(0, 3).map((r) => (
                      <button
                        key={r}
                        onClick={() => onReact(match.id, ev.id, r)}
                        className={`w-6 h-6 rounded-full text-xs flex items-center justify-center hover:scale-110 transition-transform ${
                          userReactions.has(r) ? 'bg-white/10' : ''
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reactions Row ────────────────────────────────────────────────────── */}
      <div className="border-t border-[#1e2d45] px-4 py-2.5 flex items-center justify-between">
        <div className="flex gap-1">
          {reactionTypes.map((r) => (
            <button
              key={r}
              onClick={() => onReact(match.id, undefined, r)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-base hover:scale-110 transition-transform ${
                userReactions.has(r) ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {isLive && (
          <span className="text-[10px] font-semibold text-red-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}
