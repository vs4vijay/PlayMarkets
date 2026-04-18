// APL - Agentic Premier League
// Core data types for the fan engagement platform

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  startTime: Date;
  competition: string;
  venue: string;
  matchday?: number;
  events: MatchEvent[];
}

export type MatchStatus = 
  | 'SCHEDULED' 
  | 'LIVE' 
  | 'HALFTIME' 
  | 'FINISHED' 
  | 'POSTPONED' 
  | 'CANCELLED';

export interface MatchEvent {
  id: string;
  type: EventType;
  minute: number;
  player: string;
  team: 'home' | 'away';
  description?: string;
}

export type EventType = 
  | 'GOAL' 
  | 'OWN_GOAL' 
  | 'PENALTY' 
  | 'MISSED_PENALTY'
  | 'YELLOW_CARD' 
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'VAR_DECISION';

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

export interface User {
  id: string;
  name: string;
  avatar?: string;
  favoredTeams: Team[];
  predictions: Prediction[];
  createdAt: Date;
}

export interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  isPublic: boolean;
  createdAt: Date;
  points?: number;
}