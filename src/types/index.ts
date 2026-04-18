// CricPulse - India's Cricket Fan Zone
// Core data types for the fan engagement platform

// ─── Teams ────────────────────────────────────────────────────────────────────

export interface CricketTeam {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  country?: string;
}

// ─── Score / Innings ──────────────────────────────────────────────────────────

export interface CricketScore {
  runs: number;
  wickets: number;
  overs: number;        // e.g. 19.3
  runRate?: number;     // current run rate
  extras?: number;
  inningNumber: 1 | 2;
  isComplete: boolean;
}

// ─── Match ────────────────────────────────────────────────────────────────────

export interface CricketMatch {
  id: string;
  name: string;                    // "MI vs CSK, IPL 2026 – Match 28"
  matchType: MatchType;
  status: MatchStatus;
  statusNote?: string;             // "CSK need 45 runs in 30 balls"
  result?: string;                 // "MI won by 4 runs"
  venue: string;
  startTime: Date;
  homeTeam: CricketTeam;
  awayTeam: CricketTeam;
  homeScore?: CricketScore;        // first/latest innings for home team
  awayScore?: CricketScore;        // first/latest innings for away team
  currentBatting?: 'home' | 'away';
  series?: string;                 // competition/series name
  matchNumber?: number;
  toss?: TossInfo;
  events: CricketEvent[];
}

export type MatchType = 'T20' | 'ODI' | 'TEST' | 'T10' | 'OTHER';

export type MatchStatus =
  | 'UPCOMING'
  | 'TOSS'
  | 'LIVE'
  | 'INNINGS_BREAK'
  | 'DRINKS'
  | 'LUNCH'
  | 'TEA'
  | 'STUMPS'
  | 'RAIN_DELAY'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'CANCELLED'
  | 'POSTPONED';

export interface TossInfo {
  winner: string;              // team name
  decision: 'bat' | 'field';
}

// ─── Match Events ─────────────────────────────────────────────────────────────

export interface CricketEvent {
  id: string;
  type: CricketEventType;
  over?: number;
  ball?: number;
  batsman?: string;
  bowler?: string;
  fielder?: string;
  team: 'home' | 'away';
  description: string;
  runs?: number;               // runs scored on this ball
}

export type CricketEventType =
  | 'WICKET'
  | 'BOUNDARY_FOUR'
  | 'BOUNDARY_SIX'
  | 'FIFTY'
  | 'CENTURY'
  | 'MAIDEN_OVER'
  | 'REVIEW_SUCCESS'
  | 'REVIEW_FAILED'
  | 'NO_BALL'
  | 'WIDE'
  | 'MATCH_START'
  | 'INNINGS_END';

// ─── Reactions ────────────────────────────────────────────────────────────────

export interface Reaction {
  id: string;
  type: ReactionType;
  matchId: string;
  eventId?: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

export type ReactionType = '🔥' | '💪' | '😭' | '🙌' | '😱' | '👀';

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  matchId: string;
  eventId?: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  reactions: Reaction[];
  replies: Comment[];
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  avatar?: string;
  favoriteTeams: CricketTeam[];
  predictions: Prediction[];
  createdAt: Date;
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  predictedWinner: string;           // team name
  predictedHomeRuns?: number;        // predicted runs for home team
  predictedAwayRuns?: number;        // predicted runs for away team
  isPublic: boolean;
  createdAt: Date;
  points?: number;
}
