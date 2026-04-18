// Mock provider — returns rich, realistic Indian cricket data.
// Used as the default provider and as a fallback when real APIs are unavailable.
// All match times are relative to "now" so the data is always fresh.

import type { CricketProvider } from './base';
import type { CricketMatch, CricketTeam, CricketEvent } from '@/types';
import { TEAM_COLORS } from './teamColors';

// ── Helper to build a team object ─────────────────────────────────────────────

function team(
  id: string,
  name: string,
  shortName: string
): CricketTeam {
  const colors = TEAM_COLORS[name] ?? TEAM_COLORS['default'];
  return { id, name, shortName, primaryColor: colors.primary, secondaryColor: colors.secondary };
}

// ── All teams we'll use ────────────────────────────────────────────────────────

const TEAMS = {
  MI:   team('mi',   'Mumbai Indians',              'MI'),
  CSK:  team('csk',  'Chennai Super Kings',         'CSK'),
  RCB:  team('rcb',  'Royal Challengers Bengaluru', 'RCB'),
  KKR:  team('kkr',  'Kolkata Knight Riders',       'KKR'),
  RR:   team('rr',   'Rajasthan Royals',            'RR'),
  DC:   team('dc',   'Delhi Capitals',              'DC'),
  PBKS: team('pbks', 'Punjab Kings',                'PBKS'),
  SRH:  team('srh',  'Sunrisers Hyderabad',         'SRH'),
  LSG:  team('lsg',  'Lucknow Super Giants',        'LSG'),
  GT:   team('gt',   'Gujarat Titans',              'GT'),
  IND:  team('ind',  'India',                       'IND'),
  AUS:  team('aus',  'Australia',                   'AUS'),
  ENG:  team('eng',  'England',                     'ENG'),
  PAK:  team('pak',  'Pakistan',                    'PAK'),
  NZ:   team('nz',   'New Zealand',                 'NZ'),
};

// ── Mock events ───────────────────────────────────────────────────────────────

const MI_CSK_EVENTS: CricketEvent[] = [
  { id: 'e1', type: 'MATCH_START', team: 'home', description: 'MI innings started — Rohit Sharma and Ishan Kishan open' },
  { id: 'e2', type: 'BOUNDARY_SIX', over: 2, ball: 3, batsman: 'Rohit Sharma', bowler: 'Deepak Chahar', team: 'home', runs: 6, description: 'HUGE SIX! Rohit pulls Chahar over square leg' },
  { id: 'e3', type: 'BOUNDARY_FOUR', over: 4, ball: 1, batsman: 'Ishan Kishan', bowler: 'Jadeja', team: 'home', runs: 4, description: 'Swept to the boundary' },
  { id: 'e4', type: 'WICKET', over: 5, ball: 4, batsman: 'Rohit Sharma', bowler: 'Jadeja', fielder: 'Dhoni', team: 'home', description: 'Rohit c Dhoni b Jadeja 34(22) — stumped down the leg!' },
  { id: 'e5', type: 'FIFTY', over: 9, ball: 2, batsman: 'Ishan Kishan', team: 'home', description: '50 off 32 balls! Ishan Kishan raises his fifty' },
  { id: 'e6', type: 'BOUNDARY_SIX', over: 12, ball: 6, batsman: 'Hardik Pandya', bowler: 'Matheesha Pathirana', team: 'home', runs: 6, description: 'Pandya launches Pathirana into the stands!' },
  { id: 'e7', type: 'WICKET', over: 15, ball: 2, batsman: 'Ishan Kishan', bowler: 'Matheesha Pathirana', team: 'home', description: 'Kishan c Gaikwad b Pathirana 72(48) — superb yorker' },
  { id: 'e8', type: 'BOUNDARY_SIX', over: 19, ball: 4, batsman: 'Tim David', bowler: 'Deepak Chahar', team: 'home', runs: 6, description: 'Maximum! Tim David finishes with a six' },
  { id: 'e9', type: 'INNINGS_END', team: 'home', description: 'MI innings ends at 185/5 (20 ov) — Target: 186' },
  { id: 'e10', type: 'MATCH_START', team: 'away', description: 'CSK chase begins — Ruturaj Gaikwad and Devon Conway open' },
  { id: 'e11', type: 'BOUNDARY_FOUR', over: 1, ball: 3, batsman: 'Ruturaj Gaikwad', bowler: 'Jasprit Bumrah', team: 'away', runs: 4, description: 'Driven elegantly through covers' },
  { id: 'e12', type: 'WICKET', over: 4, ball: 1, batsman: 'Devon Conway', bowler: 'Jasprit Bumrah', team: 'away', description: 'Conway b Bumrah 18(14) — nipped back off the seam!' },
  { id: 'e13', type: 'BOUNDARY_SIX', over: 8, ball: 5, batsman: 'Ruturaj Gaikwad', bowler: 'Hardik Pandya', team: 'away', runs: 6, description: 'Gaikwad goes downtown!' },
  { id: 'e14', type: 'FIFTY', over: 10, ball: 3, batsman: 'Ruturaj Gaikwad', team: 'away', description: 'Gaikwad brings up a brilliant fifty!' },
  { id: 'e15', type: 'WICKET', over: 12, ball: 4, batsman: 'Ruturaj Gaikwad', bowler: 'Bumrah', team: 'away', description: 'Gaikwad c Rohit b Bumrah 64(42) — Bumrah strikes again!' },
];

const RCB_KKR_EVENTS: CricketEvent[] = [
  { id: 'f1', type: 'BOUNDARY_SIX', over: 1, ball: 6, batsman: 'Virat Kohli', bowler: 'Varun Chakravarthy', team: 'home', runs: 6, description: 'Kohli hits the first ball of the over for six!' },
  { id: 'f2', type: 'CENTURY', over: 16, ball: 2, batsman: 'Virat Kohli', team: 'home', description: '100 off 58 balls! Kohli brings up a T20 century — the crowd goes wild!' },
  { id: 'f3', type: 'WICKET', over: 18, ball: 3, batsman: 'Virat Kohli', bowler: 'Sunil Narine', team: 'home', description: 'Kohli b Narine 112(63) — what a knock!' },
  { id: 'f4', type: 'INNINGS_END', team: 'home', description: 'RCB post 214/4 (20 ov) — Target: 215' },
  { id: 'f5', type: 'WICKET', over: 3, ball: 2, batsman: 'Sunil Narine', bowler: 'Mohammed Siraj', team: 'away', description: 'Narine c du Plessis b Siraj 22(10)' },
  { id: 'f6', type: 'WICKET', over: 11, ball: 4, batsman: 'Shreyas Iyer', bowler: 'Alzarri Joseph', team: 'away', description: 'Iyer lbw b Joseph 45(30) — big wicket!' },
  { id: 'f7', type: 'WICKET', over: 19, ball: 1, batsman: 'Phil Salt', bowler: 'Mohammed Siraj', team: 'away', description: 'Salt c Virat b Siraj 58(38) — Siraj seals it' },
];

// ── Mock matches builder ──────────────────────────────────────────────────────

function makeMockMatches(): CricketMatch[] {
  const now = new Date();
  const H = 60 * 60 * 1000;
  const D = 24 * H;

  return [
    // ── LIVE: MI vs CSK (IPL Match 28) ─────────────────────────────────────
    {
      id: 'mock-ipl-28',
      name: 'MI vs CSK, IPL 2026 — Match 28',
      matchType: 'T20',
      status: 'LIVE',
      statusNote: 'CSK need 87 runs in 48 balls | RRR: 10.88',
      venue: 'Wankhede Stadium, Mumbai',
      startTime: new Date(now.getTime() - 80 * 60 * 1000),
      homeTeam: TEAMS.MI,
      awayTeam: TEAMS.CSK,
      homeScore: { runs: 185, wickets: 5, overs: 20, runRate: 9.25, inningNumber: 1, isComplete: true },
      awayScore: { runs: 99, wickets: 4, overs: 12, runRate: 8.25, inningNumber: 1, isComplete: false },
      currentBatting: 'away',
      series: 'IPL 2026',
      matchNumber: 28,
      toss: { winner: 'Mumbai Indians', decision: 'bat' },
      events: MI_CSK_EVENTS,
    },

    // ── LIVE: IND vs AUS (T20I) ─────────────────────────────────────────────
    {
      id: 'mock-ind-aus-t20i-3',
      name: 'IND vs AUS, 3rd T20I',
      matchType: 'T20',
      status: 'LIVE',
      statusNote: 'India need 18 runs off last 2 overs | RRR: 9.00',
      venue: 'Rajiv Gandhi International Stadium, Hyderabad',
      startTime: new Date(now.getTime() - 100 * 60 * 1000),
      homeTeam: TEAMS.IND,
      awayTeam: TEAMS.AUS,
      homeScore: { runs: 168, wickets: 4, overs: 18, runRate: 9.33, inningNumber: 1, isComplete: false },
      awayScore: { runs: 172, wickets: 7, overs: 20, runRate: 8.60, inningNumber: 1, isComplete: true },
      currentBatting: 'home',
      series: 'India vs Australia T20I Series 2026',
      matchNumber: 3,
      toss: { winner: 'Australia', decision: 'field' },
      events: [
        { id: 'g1', type: 'BOUNDARY_SIX', over: 2, ball: 4, batsman: 'Rohit Sharma', bowler: 'Pat Cummins', team: 'away', runs: 6, description: 'Rohit pulls Cummins over midwicket for six!' },
        { id: 'g2', type: 'FIFTY', over: 7, ball: 2, batsman: 'Rohit Sharma', team: 'away', description: 'Rohit Sharma brings up 50 off 28 balls!' },
        { id: 'g3', type: 'WICKET', over: 9, ball: 3, batsman: 'Rohit Sharma', bowler: 'Adam Zampa', team: 'away', description: 'Rohit c Maxwell b Zampa 58(34)' },
        { id: 'g4', type: 'CENTURY', over: 18, ball: 1, batsman: 'Travis Head', team: 'away', description: 'Travis Head smashes a T20I century — 100 off 55!' },
        { id: 'g5', type: 'WICKET', over: 17, ball: 4, batsman: 'Rohit Sharma', bowler: 'Pat Cummins', team: 'home', description: 'Suryakumar c Head b Cummins 43(28)' },
      ],
    },

    // ── INNINGS BREAK: RCB vs KKR ────────────────────────────────────────────
    {
      id: 'mock-ipl-29',
      name: 'RCB vs KKR, IPL 2026 — Match 29',
      matchType: 'T20',
      status: 'INNINGS_BREAK',
      statusNote: 'KKR chase target of 215 | Innings break',
      venue: 'M. Chinnaswamy Stadium, Bengaluru',
      startTime: new Date(now.getTime() - 130 * 60 * 1000),
      homeTeam: TEAMS.RCB,
      awayTeam: TEAMS.KKR,
      homeScore: { runs: 214, wickets: 4, overs: 20, runRate: 10.70, inningNumber: 1, isComplete: true },
      awayScore: undefined,
      currentBatting: 'away',
      series: 'IPL 2026',
      matchNumber: 29,
      toss: { winner: 'RCB', decision: 'bat' },
      events: RCB_KKR_EVENTS,
    },

    // ── COMPLETED: SRH vs DC ─────────────────────────────────────────────────
    {
      id: 'mock-ipl-27',
      name: 'SRH vs DC, IPL 2026 — Match 27',
      matchType: 'T20',
      status: 'COMPLETED',
      result: 'SRH won by 7 wickets',
      venue: 'Rajiv Gandhi International Stadium, Hyderabad',
      startTime: new Date(now.getTime() - 25 * H),
      homeTeam: TEAMS.SRH,
      awayTeam: TEAMS.DC,
      homeScore: { runs: 172, wickets: 3, overs: 18.2, runRate: 9.40, inningNumber: 1, isComplete: true },
      awayScore: { runs: 171, wickets: 8, overs: 20, runRate: 8.55, inningNumber: 1, isComplete: true },
      currentBatting: undefined,
      series: 'IPL 2026',
      matchNumber: 27,
      toss: { winner: 'DC', decision: 'bat' },
      events: [
        { id: 'h1', type: 'WICKET', over: 6, ball: 2, batsman: 'David Warner', bowler: 'Bhuvneshwar Kumar', team: 'away', description: 'Warner b Bhuvneshwar 33(22)' },
        { id: 'h2', type: 'FIFTY', over: 11, ball: 4, batsman: 'Axar Patel', team: 'away', description: 'Axar Patel slaps his fifty!' },
        { id: 'h3', type: 'BOUNDARY_SIX', over: 15, ball: 3, batsman: 'Heinrich Klaasen', bowler: 'Axar Patel', team: 'home', runs: 6, description: 'Klaasen clears the rope effortlessly' },
        { id: 'h4', type: 'WICKET', over: 19, ball: 5, batsman: 'Tristan Stubbs', bowler: 'Kuldeep Yadav', team: 'away', description: 'Stubbs c Klaasen b Kuldeep 29(19)' },
      ],
    },

    // ── COMPLETED: IND vs AUS (T20I 1st) ─────────────────────────────────────
    {
      id: 'mock-ind-aus-t20i-1',
      name: 'IND vs AUS, 1st T20I',
      matchType: 'T20',
      status: 'COMPLETED',
      result: 'India won by 2 wickets',
      venue: 'Eden Gardens, Kolkata',
      startTime: new Date(now.getTime() - 3 * D),
      homeTeam: TEAMS.IND,
      awayTeam: TEAMS.AUS,
      homeScore: { runs: 188, wickets: 8, overs: 20, runRate: 9.40, inningNumber: 1, isComplete: true },
      awayScore: { runs: 185, wickets: 6, overs: 20, runRate: 9.25, inningNumber: 1, isComplete: true },
      currentBatting: undefined,
      series: 'India vs Australia T20I Series 2026',
      matchNumber: 1,
      events: [],
    },

    // ── COMPLETED: IND vs AUS (T20I 2nd) ─────────────────────────────────────
    {
      id: 'mock-ind-aus-t20i-2',
      name: 'IND vs AUS, 2nd T20I',
      matchType: 'T20',
      status: 'COMPLETED',
      result: 'Australia won by 6 wickets',
      venue: 'M. A. Chidambaram Stadium, Chennai',
      startTime: new Date(now.getTime() - 2 * D),
      homeTeam: TEAMS.IND,
      awayTeam: TEAMS.AUS,
      homeScore: { runs: 157, wickets: 9, overs: 20, runRate: 7.85, inningNumber: 1, isComplete: true },
      awayScore: { runs: 158, wickets: 4, overs: 17.4, runRate: 8.94, inningNumber: 1, isComplete: true },
      currentBatting: undefined,
      series: 'India vs Australia T20I Series 2026',
      matchNumber: 2,
      events: [],
    },

    // ── UPCOMING: LSG vs GT ──────────────────────────────────────────────────
    {
      id: 'mock-ipl-30',
      name: 'LSG vs GT, IPL 2026 — Match 30',
      matchType: 'T20',
      status: 'UPCOMING',
      venue: 'BRSABV Ekana Cricket Stadium, Lucknow',
      startTime: new Date(now.getTime() + 5 * H),
      homeTeam: TEAMS.LSG,
      awayTeam: TEAMS.GT,
      series: 'IPL 2026',
      matchNumber: 30,
      events: [],
    },

    // ── UPCOMING: RR vs PBKS ─────────────────────────────────────────────────
    {
      id: 'mock-ipl-31',
      name: 'RR vs PBKS, IPL 2026 — Match 31',
      matchType: 'T20',
      status: 'UPCOMING',
      venue: 'Sawai Mansingh Stadium, Jaipur',
      startTime: new Date(now.getTime() + D + 2 * H),
      homeTeam: TEAMS.RR,
      awayTeam: TEAMS.PBKS,
      series: 'IPL 2026',
      matchNumber: 31,
      events: [],
    },

    // ── UPCOMING: IND vs AUS (T20I 4th) ─────────────────────────────────────
    {
      id: 'mock-ind-aus-t20i-4',
      name: 'IND vs AUS, 4th T20I',
      matchType: 'T20',
      status: 'UPCOMING',
      venue: 'Narendra Modi Stadium, Ahmedabad',
      startTime: new Date(now.getTime() + 2 * D),
      homeTeam: TEAMS.IND,
      awayTeam: TEAMS.AUS,
      series: 'India vs Australia T20I Series 2026',
      matchNumber: 4,
      events: [],
    },

    // ── UPCOMING: IND vs ENG (ODI series) ────────────────────────────────────
    {
      id: 'mock-ind-eng-odi-1',
      name: 'IND vs ENG, 1st ODI',
      matchType: 'ODI',
      status: 'UPCOMING',
      venue: 'Wankhede Stadium, Mumbai',
      startTime: new Date(now.getTime() + 5 * D),
      homeTeam: TEAMS.IND,
      awayTeam: TEAMS.ENG,
      series: 'India vs England ODI Series 2026',
      matchNumber: 1,
      events: [],
    },
  ];
}

// ── Provider implementation ───────────────────────────────────────────────────

export class MockProvider implements CricketProvider {
  readonly name = 'Mock (demo data)';

  private readonly matches: CricketMatch[];

  constructor() {
    this.matches = makeMockMatches();
  }

  async getMatches(): Promise<CricketMatch[]> {
    return this.matches;
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    return this.matches.filter(
      (m) => m.status === 'LIVE' || m.status === 'INNINGS_BREAK' || m.status === 'TOSS'
    );
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    return this.matches.filter((m) => m.status === 'UPCOMING');
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    return this.matches.filter((m) => m.status === 'COMPLETED');
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    return this.matches.find((m) => m.id === id) ?? null;
  }
}
