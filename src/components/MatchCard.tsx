'use client';

import { useState } from 'react';
import type { Match } from '@/types';

interface MatchCardProps {
  match: Match;
  onReact: (matchId: string, eventId: string | undefined, type: '🔥' | '💪' | '😭' | '🙌' | '😱' | '👀') => void;
  userReactions: Set<string>;
}

function formatMatchTime(date: Date, match: Match): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (match.status === 'LIVE') return `${match.events.length > 0 ? Math.max(...match.events.map(e => e.minute)) : 45}'`;
  if (diff < 0) return 'Full Time';
  if (diff < 60 * 60 * 1000) return `In ${Math.ceil(diff / 60 / 1000)}m`;
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    LIVE: 'bg-red-600 text-white',
    HALFTIME: 'bg-yellow-500 text-black',
    FINISHED: 'bg-gray-600 text-white',
    SCHEDULED: 'bg-emerald-600 text-white',
    POSTPONED: 'bg-orange-500 text-white',
    CANCELLED: 'bg-red-800 text-white',
  };
  return badges[status] || 'bg-gray-500 text-white';
}

export function MatchCard({ match, onReact, userReactions }: MatchCardProps) {
  const [showEvents, setShowEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  
  const reactionTypes = ['🔥', '💪', '😭', '🙌', '😱', '👀'] as const;
  
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
      {/* Match Header */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {match.competition} · Matchday {match.matchday}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(match.status)}`}>
          {match.status}
        </span>
      </div>
      
      {/* Teams */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center flex-1">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: match.homeTeam.primaryColor }}
            >
              {match.homeTeam.shortName.slice(0, 2)}
            </div>
            <span className="mt-2 text-sm font-semibold text-center text-zinc-900 dark:text-zinc-100">
              {match.homeTeam.shortName}
            </span>
          </div>
          
          <div className="flex flex-col items-center px-4">
            {match.status === 'SCHEDULED' ? (
              <span className="text-2xl font-bold text-zinc-400">
                VS
              </span>
            ) : (
              <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                {match.homeScore} - {match.awayScore}
              </div>
            )}
            {match.status !== 'SCHEDULED' && (
              <span className="text-xs text-zinc-500 mt-1">
                {formatMatchTime(match.startTime, match)}
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-center flex-1">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: match.awayTeam.primaryColor }}
            >
              {match.awayTeam.shortName.slice(0, 2)}
            </div>
            <span className="mt-2 text-sm font-semibold text-center text-zinc-900 dark:text-zinc-100">
              {match.awayTeam.shortName}
            </span>
          </div>
        </div>
      </div>
      
      {/* Venue & Time */}
      <div className="px-4 pb-3 flex items-center justify-between text-xs text-zinc-500">
        <span>{match.venue}</span>
        <span>{match.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </div>
      
      {/* Match Events (for LIVE/FINISHED) */}
      {match.events.length > 0 && match.status !== 'SCHEDULED' && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="w-full px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-between"
          >
            <span>Match Events ({match.events.length})</span>
            <span className="transform transition-transform {showEvents ? 'rotate-180' : ''}">▼</span>
          </button>
          
          {showEvents && (
            <div className="px-4 pb-3 space-y-2">
              {match.events.map(event => (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                  className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <span className="text-sm font-bold text-zinc-500 w-8">{event.minute}'</span>
                  <span className={`text-lg ${event.team === 'home' ? 'text-green-600' : 'text-red-600'}`}>
                    {event.type === 'GOAL' ? '⚽' : event.type === 'YELLOW_CARD' ? '🟨' : event.type === 'RED_CARD' ? '🟥' : '📋'}
                  </span>
                  <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{event.player}</span>
                  
                  {/* Event Reactions */}
                  <div className="flex gap-1">
                    {reactionTypes.slice(0, 3).map(type => (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReact(match.id, event.id, type);
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform ${
                          userReactions.has(type) ? 'bg-zinc-200 dark:bg-zinc-700' : ''
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Match Reactions */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between">
        <div className="flex gap-1">
          {reactionTypes.map(type => (
            <button
              key={type}
              onClick={() => onReact(match.id, undefined, type)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-110 transition-transform ${
                userReactions.has(type) ? 'bg-zinc-200 dark:bg-zinc-700 ring-2 ring-zinc-400' : ''
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-400">
          {match.status === 'LIVE' ? '🔴 LIVE' : ''}
        </span>
      </div>
    </div>
  );
}

export function MatchDetail({ match }: { match: Match }) {
  // Detailed match view with comments
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
        {match.homeTeam.name} vs {match.awayTeam.name}
      </h2>
      <div className="text-center mb-6">
        <div className="text-5xl font-black text-zinc-900 dark:text-zinc-100">
          {match.homeScore} - {match.awayScore}
        </div>
        <div className="text-sm text-zinc-500 mt-2">{match.venue}</div>
      </div>
    </div>
  );
}