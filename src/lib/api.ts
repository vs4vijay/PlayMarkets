// Football API service - fetches match data from API-Football
// For MVP, we'll use mock data but structure it for easy API integration

import type { Match, Team, MatchEvent } from '@/types';

const PREMIER_LEAGUE_ID = 39;

// Map team IDs to our team definitions
const TEAMS: Record<string, Team> = {
  '33': { id: '33', name: 'Manchester United', shortName: 'MUN', logo: '/teams/mun.svg', primaryColor: '#DA291C', secondaryColor: '#FBE122' },
  '34': { id: '34', name: 'Newcastle United', shortName: 'NEW', logo: '/teams/new.svg', primaryColor: '#241F20', secondaryColor: '#FFFFFF' },
  '46': { id: '46', name: 'Leicester City', shortName: 'LEI', logo: '/teams/lei.svg', primaryColor: '#00509F', secondaryColor: '#FBE122' },
  '47': { id: '47', name: 'Liverpool', shortName: 'LIV', logo: '/teams/liv.svg', primaryColor: '#C8102E', secondaryColor: '#00B2A9' },
  '48': { id: '48', name: 'Manchester City', shortName: 'MCI', logo: '/teams/mci.svg', primaryColor: '#6CABDD', secondaryColor: '#1C2C5B' },
  '49': { id: '49', name: 'Arsenal', shortName: 'ARS', logo: '/teams/ars.svg', primaryColor: '#EF0107', secondaryColor: '#9C824A' },
  '50': { id: '50', name: 'Chelsea', shortName: 'CHE', logo: '/teams/che.svg', primaryColor: '#034694', secondaryColor: '#DBA111' },
  '51': { id: '51', name: 'Tottenham Hotspur', shortName: 'TOT', logo: '/teams/tot.svg', primaryColor: '#132257', secondaryColor: '#FFFFFF' },
  '52': { id: '52', name: 'Crystal Palace', shortName: 'CRY', logo: '/teams/cry.svg', primaryColor: '#0047A1', secondaryColor: '#C8102E' },
  '53': { id: '53', name: 'Aston Villa', shortName: 'AVL', logo: '/teams/avl.svg', primaryColor: '#670E36', secondaryColor: '#95BFE5' },
  '54': { id: '54', name: 'West Ham United', shortName: 'WHU', logo: '/teams/whu.svg', primaryColor: '#7A263A', secondaryColor: '#F2D400' },
  '55': { id: '55', name: 'Everton', shortName: 'EVE', logo: '/teams/eve.svg', primaryColor: '#003399', secondaryColor: '#FFFFFF' },
  '56': { id: '56', name: 'Brentford', shortName: 'BRE', logo: '/teams/bre.svg', primaryColor: '#E30613', secondaryColor: '#FFFFFF' },
  '57': { id: '57', name: 'Nottingham Forest', shortName: 'NFO', logo: '/teams/nfo.svg', primaryColor: '#DD0000', secondaryColor: '#FFFFFF' },
  '58': { id: '58', name: 'Brighton & Hove Albion', shortName: 'BHA', logo: '/teams/bha.svg', primaryColor: '#0057D8', secondaryColor: '#FFCD00' },
  '59': { id: '59', name: 'Bournemouth', shortName: 'BOU', logo: '/teams/bou.svg', primaryColor: '#DA291C', secondaryColor: '#000000' },
  '60': { id: '60', name: 'Southampton', shortName: 'SOU', logo: '/teams/sou.svg', primaryColor: '#DA291C', secondaryColor: '#FFFFFF' },
  '61': { id: '61', name: 'Fulham', shortName: 'FUL', logo: '/teams/ful.svg', primaryColor: '#FFFFFF', secondaryColor: '#000000' },
  '62': { id: '62', name: 'Wolverhampton', shortName: 'WOL', logo: '/teams/wol.svg', primaryColor: '#FBE122', secondaryColor: '#000000' },
  '65': { id: '65', name: 'Ipswich Town', shortName: 'IPS', logo: '/teams/ips.svg', primaryColor: '#104EBB', secondaryColor: '#FFFFFF' },
};

// Generate mock matches for demo
export async function getMatches(): Promise<Match[]> {
  // In production, this would call football-api.com
  // For now, return realistic mock data
  return getMockMatches();
}

export async function getMatch(id: string): Promise<Match | null> {
  const matches = await getMatches();
  return matches.find(m => m.id === id) || null;
}

function getMockMatches(): Match[] {
  const now = new Date();
  
  const matches: Match[] = [
    {
      id: 'match-1',
      homeTeam: TEAMS['49'],
      awayTeam: TEAMS['47'],
      homeScore: 2,
      awayScore: 1,
      status: 'FINISHED',
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      competition: 'Premier League',
      venue: 'Emirates Stadium',
      matchday: 33,
      events: [
        { id: 'e1', type: 'GOAL', minute: 23, player: 'Saka', team: 'home', description: 'Great finish from close range' },
        { id: 'e2', type: 'GOAL', minute: 45, player: 'Nunez', team: 'away', description: 'Header from corner' },
        { id: 'e3', type: 'GOAL', minute: 67, player: 'Rice', team: 'home', description: 'Long range screamer' },
      ],
    },
    {
      id: 'match-2',
      homeTeam: TEAMS['50'],
      awayTeam: TEAMS['51'],
      homeScore: 1,
      awayScore: 1,
      status: 'LIVE',
      startTime: new Date(now.getTime() - 45 * 60 * 1000),
      competition: 'Premier League',
      venue: 'Stamford Bridge',
      matchday: 33,
      events: [
        { id: 'e4', type: 'GOAL', minute: 12, player: 'Palmer', team: 'home', description: 'Free kick into the corner' },
        { id: 'e5', type: 'GOAL', minute: 34, player: 'Son', team: 'away', description: 'Counter attack finish' },
      ],
    },
    {
      id: 'match-3',
      homeTeam: TEAMS['48'],
      awayTeam: TEAMS['33'],
      homeScore: 0,
      awayScore: 0,
      status: 'SCHEDULED',
      startTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      competition: 'Premier League',
      venue: 'Etihad Stadium',
      matchday: 33,
      events: [],
    },
    {
      id: 'match-4',
      homeTeam: TEAMS['53'],
      awayTeam: TEAMS['55'],
      homeScore: 0,
      awayScore: 0,
      status: 'SCHEDULED',
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      competition: 'Premier League',
      venue: 'Villa Park',
      matchday: 33,
      events: [],
    },
    {
      id: 'match-5',
      homeTeam: TEAMS['52'],
      awayTeam: TEAMS['56'],
      homeScore: 0,
      awayScore: 0,
      status: 'SCHEDULED',
      startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      competition: 'Premier League',
      venue: 'Selhurst Park',
      matchday: 33,
      events: [],
    },
  ];

  return matches;
}

export function getAllTeams(): Team[] {
  return Object.values(TEAMS);
}

export function getTeam(id: string): Team | undefined {
  return TEAMS[id];
}