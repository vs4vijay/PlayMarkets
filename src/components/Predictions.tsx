'use client';

import { useState, useEffect } from 'react';
import type { Match, Prediction } from '@/types';

// In-memory predictions store
const predictions: Map<string, Prediction[]> = new Map();

interface PredictionsProps {
  matches: Match[];
  userId?: string;
  userName?: string;
}

export function PredictionCard({ match, prediction, onPredict, onUpdate }: {
  match: Match;
  prediction?: Prediction;
  onPredict: (home: number, away: number) => void;
  onUpdate?: (home: number, away: number) => void;
}) {
  const [homeScore, setHomeScore] = useState(prediction?.predictedHomeScore ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.predictedAwayScore ?? 0);
  const [isEditing, setIsEditing] = useState(!prediction);
  
  const canPredict = match.status === 'SCHEDULED';
  
  const handleSubmit = () => {
    if (prediction) {
      onUpdate?.(homeScore, awayScore);
    } else {
      onPredict(homeScore, awayScore);
    }
    setIsEditing(false);
  };
  
  return (
    <div className="bg-zinc-900 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: match.homeTeam.primaryColor }}
          >
            {match.homeTeam.shortName.slice(0, 2)}
          </div>
          <span className="text-sm font-medium">{match.homeTeam.shortName}</span>
        </div>
        <span className="text-zinc-500">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{match.awayTeam.shortName}</span>
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: match.awayTeam.primaryColor }}
          >
            {match.awayTeam.shortName.slice(0, 2)}
          </div>
        </div>
      </div>
      
      {canPredict && (
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center">
            <button
              onClick={() => setHomeScore(s => Math.max(0, s - 1))}
              className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xl font-bold"
            >
              -
            </button>
            <span className="text-3xl font-black mt-2 text-[#00ff85]">{homeScore}</span>
            <button
              onClick={() => setHomeScore(s => s + 1)}
              className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xl font-bold"
            >
              +
            </button>
          </div>
          
          <span className="text-2xl text-zinc-600 font-bold">-</span>
          
          <div className="flex flex-col items-center">
            <button
              onClick={() => setAwayScore(s => Math.max(0, s - 1))}
              className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xl font-bold"
            >
              -
            </button>
            <span className="text-3xl font-black mt-2 text-[#00ff85]">{awayScore}</span>
            <button
              onClick={() => setAwayScore(s => s + 1)}
              className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xl font-bold"
            >
              +
            </button>
          </div>
        </div>
      )}
      
      {canPredict && isEditing && (
        <button
          onClick={handleSubmit}
          className="w-full mt-4 py-2 bg-[#00ff85] text-[#38003c] rounded-lg font-bold hover:opacity-90 transition-opacity"
        >
          {prediction ? 'Update Prediction' : 'Submit Prediction'}
        </button>
      )}
      
      {canPredict && !isEditing && prediction && (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full mt-4 py-2 border border-zinc-700 text-zinc-400 rounded-lg font-medium hover:text-white hover:border-zinc-500 transition-colors"
        >
          Update Prediction
        </button>
      )}
      
      {/* Show result if match finished */}
      {!canPredict && prediction && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Your prediction</span>
            <span className="font-bold">{prediction.predictedHomeScore} - {prediction.predictedAwayScore}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-zinc-500">Actual</span>
            <span className="font-bold text-[#00ff85]">{match.homeScore} - {match.awayScore}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PredictionsPanel({ matches, userId = 'anonymous', userName = 'Anonymous Fan' }: PredictionsProps) {
  const [userPredictions, setUserPredictions] = useState<Map<string, Prediction>>(new Map());
  const [showPanel, setShowPanel] = useState(false);
  
  // Filter to upcoming matches only
  const upcomingMatches = matches.filter(m => m.status === 'SCHEDULED');
  
  const handlePredict = (matchId: string) => (homeScore: number, awayScore: number) => {
    const prediction: Prediction = {
      id: `pred-${matchId}-${Date.now()}`,
      matchId,
      userId,
      predictedHomeScore: homeScore,
      predictedAwayScore: awayScore,
      isPublic: true,
      createdAt: new Date(),
    };
    
    setUserPredictions(prev => new Map(prev).set(matchId, prediction));
  };
  
  const handleUpdate = (matchId: string) => (homeScore: number, awayScore: number) => {
    const existing = userPredictions.get(matchId);
    if (existing) {
      const updated: Prediction = {
        ...existing,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
      };
      setUserPredictions(prev => new Map(prev).set(matchId, updated));
    }
  };
  
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#ff0058] rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform z-50"
      >
        🔮
      </button>
      
      {/* Panel */}
      {showPanel && (
        <div className="fixed bottom-24 right-6 w-80 max-h-[70vh] bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 overflow-hidden z-50">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-bold text-white">Make Predictions</h3>
            <p className="text-xs text-zinc-500 mt-1">Vote on upcoming matches</p>
          </div>
          
          <div className="overflow-y-auto max-h-[50vh] p-4 space-y-4">
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No upcoming matches</p>
            ) : (
              upcomingMatches.slice(0, 5).map(match => (
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