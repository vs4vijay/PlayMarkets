'use client';

import { useState, useEffect, use } from 'react';
import { getMatches } from '@/lib/api';
import { MatchCard } from '@/components/MatchCard';
import { PredictionsPanel } from '@/components/Predictions';
import { addReaction, getUserReactionTypes } from '@/store/reactions';
import type { Match, MatchStatus, ReactionType } from '@/types';

type FilterTab = 'ALL' | 'LIVE' | 'FINISHED' | 'SCHEDULED';

function filterMatches(matches: Match[], filter: FilterTab): Match[] {
  if (filter === 'ALL') return matches;
  return matches.filter(m => m.status === filter);
}

function categorizeMatches(matches: Match[]) {
  const now = new Date();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const live = matches.filter(m => m.status === 'LIVE' || m.status === 'HALFTIME');
  const recent = matches.filter(m => 
    m.status === 'FINISHED' && 
    now.getTime() - m.startTime.getTime() < DAY
  );
  const upcoming = matches.filter(m => 
    m.status === 'SCHEDULED' && 
    m.startTime.getTime() > now.getTime()
  );

  return { live, recent, upcoming };
}

const CURRENT_USER = { id: 'user-1', name: 'Fan' };

export default function Home({ matches: initialMatches }: { matches?: Match[] }) {
  const [matches, setMatches] = useState<Match[]>(initialMatches || []);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [userReactions, setUserReactions] = useState<Map<string, Set<string>>>(new Map());
  const [activeSection, setActiveSection] = useState<'LIVE' | 'RECENT' | 'UPCOMING'>('LIVE');

  useEffect(() => {
    getMatches().then(setMatches);
  }, []);

  const { live, recent, upcoming } = categorizeMatches(matches);
  const filteredMatches = filterMatches(matches, filter);

  const handleReaction = (matchId: string, eventId: string | undefined, type: ReactionType) => {
    addReaction(matchId, eventId, type, CURRENT_USER.id, CURRENT_USER.name);
    const key = eventId ? `${matchId}:${eventId}` : matchId;
    const reactionTypes = getUserReactionTypes(matchId, eventId, CURRENT_USER.id);
    setUserReactions(prev => {
      const newMap = new Map(prev);
      newMap.set(key, new Set(reactionTypes));
      return newMap;
    });
  };

  const tabs: { label: string; value: FilterTab; count: number }[] = [
    { label: 'All', value: 'ALL', count: matches.length },
    { label: 'Live', value: 'LIVE', count: live.length },
    { label: 'Finished', value: 'FINISHED', count: recent.length },
    { label: 'Scheduled', value: 'SCHEDULED', count: upcoming.length },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#38003c] via-[#1a001e] to-[#0c0c0c] px-4 py-16 md:py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#00ff85] rounded-full blur-[128px]" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#ff0058] rounded-full blur-[128px]" />
        </div>
        <div className="relative max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4">
            <span className="text-[#00ff85]">APL</span>
            <span className="text-white"> Fan Zone</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
            Connect with fans around shared team loyalties
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="sticky top-0 z-40 bg-[#0c0c0c]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                  filter === tab.value
                    ? 'bg-[#00ff85] text-[#38003c]'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section Toggles (for All view) */}
      {filter === 'ALL' && (
        <section className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex gap-2">
            {[
              { label: 'LIVE NOW', value: 'LIVE', color: 'text-red-500', activeColor: 'bg-red-500 text-white' },
              { label: 'Recent Results', value: 'RECENT', color: 'text-zinc-400', activeColor: 'bg-zinc-400 text-black' },
              { label: 'Upcoming', value: 'UPCOMING', color: 'text-[#00ff85]', activeColor: 'bg-[#00ff85] text-black' },
            ].map(section => (
              <button
                key={section.value}
                onClick={() => setActiveSection(section.value as 'LIVE' | 'RECENT' | 'UPCOMING')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  activeSection === section.value
                    ? section.activeColor
                    : `bg-zinc-900 ${section.color}`
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Match Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        {filter === 'ALL' ? (
          // Show filtered section
          (() => {
            const sectionMatches = activeSection === 'LIVE' ? live : activeSection === 'RECENT' ? recent : upcoming;
            if (sectionMatches.length === 0) {
              return (
                <div className="text-center py-16">
                  <p className="text-zinc-500 text-lg">
                    {activeSection === 'LIVE' && 'No live matches right now'}
                    {activeSection === 'RECENT' && 'No recent results'}
                    {activeSection === 'UPCOMING' && 'No upcoming matches'}
                  </p>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onReact={handleReaction}
                    userReactions={userReactions.get(match.id) || new Set()}
                  />
                ))}
              </div>
            );
          })()
        ) : (
          // Show filtered matches (All, Live, Finished, Scheduled)
          filteredMatches.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500 text-lg">No matches found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onReact={handleReaction}
                  userReactions={userReactions.get(match.id) || new Set()}
                />
              ))}
            </div>
          )
        )}
      </main>

      {/* Predictions Panel */}
      <PredictionsPanel matches={matches} userId={CURRENT_USER.id} userName={CURRENT_USER.name} />

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-[#0c0c0c] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-zinc-500 text-sm">
            ⚽ Agentic Premier League Fan Platform
          </p>
        </div>
      </footer>
    </div>
  );
}