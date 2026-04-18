// Mock provider — rich, realistic Indian cricket data with live score simulation.
// Used as the default provider and as a fallback when real APIs are unavailable.
//
// Live match scores advance in real time:
//   Every 30 real-world seconds = 1 ball delivered (~10× speed, ideal for demos).
//   Outcomes are seeded and deterministic — every caller at the same moment sees
//   the same score, regardless of how often they poll.

import type { CricketProvider } from './base';
import type { CricketMatch, CricketTeam, CricketScore, CricketEvent } from '@/types';
import { TEAM_COLORS } from './teamColors';

// ── Simulation engine ─────────────────────────────────────────────────────────

/** 30 real seconds = 1 ball delivered in the demo. ~10× faster than a real T20. */
const BALL_MS = 30_000;

/** Deterministic float in [0, 1). Identical for the same seed every time. */
function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface InningsState {
  runs: number;
  wickets: number;
  balls: number;       // total deliveries bowled
  isComplete: boolean;
  wonChase: boolean;   // target was set and reached
}

/**
 * Simulate an innings from `startMs` up to `atMs`.
 *
 * Ball probability mix (expected ~1.37 runs/ball, ~8.2 RPO — realistic T20 rate):
 *   dot 38% · single 19% · double 10% · four 10% · six 8% · wicket 5% · extra 10%
 */
function simulateInnings(
  seed: number,
  startMs: number,
  maxOvers: number,
  target: number | undefined,
  atMs: number,
): InningsState {
  const maxBalls = maxOvers * 6;
  const deliveriesToSim = Math.max(0, Math.floor((atMs - startMs) / BALL_MS));

  let runs = 0, wickets = 0, wonChase = false;
  let i = 0;

  for (; i < deliveriesToSim && i < maxBalls && wickets < 10; i++) {
    const r = seededRand(seed + i * 7.3137); // prime offset spreads seeds well

    if      (r < 0.38) { /* dot ball 38% */ }
    else if (r < 0.57) { runs += 1; }   // single 19%
    else if (r < 0.67) { runs += 2; }   // double 10%
    else if (r < 0.77) { runs += 4; }   // four   10%
    else if (r < 0.85) { runs += 6; }   // six     8%
    else if (r < 0.90) { wickets++;  }  // wicket  5%
    else               { runs += 1; }   // extra  10%

    if (target !== undefined && runs >= target) {
      wonChase = true;
      i++;
      break;
    }
  }

  return {
    runs,
    wickets,
    balls: i,
    isComplete: wonChase || wickets >= 10 || i >= maxBalls,
    wonChase,
  };
}

// ── Score helpers ─────────────────────────────────────────────────────────────

/** 73 balls → 12.1 (12 overs 1 ball — cricket notation) */
function toOvers(balls: number): number {
  return Math.floor(balls / 6) + (balls % 6) * 0.1;
}

/** Run rate in decimal overs (not cricket notation). */
function calcRunRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  const decimalOvers = Math.floor(balls / 6) + (balls % 6) / 6;
  return Math.round((runs / decimalOvers) * 100) / 100;
}

function toScore(state: InningsState, inningNumber: 1 | 2): CricketScore {
  return {
    runs: state.runs,
    wickets: state.wickets,
    overs: toOvers(state.balls),
    runRate: calcRunRate(state.runs, state.balls),
    inningNumber,
    isComplete: state.isComplete,
  };
}

function chaseNote(chaseName: string, target: number, state: InningsState, maxOvers: number): string {
  const runsNeeded = target - state.runs;
  const ballsLeft = maxOvers * 6 - state.balls;
  const decOversLeft = Math.floor(ballsLeft / 6) + (ballsLeft % 6) / 6;
  const rrr = decOversLeft > 0 ? (runsNeeded / decOversLeft).toFixed(2) : '∞';
  return `${chaseName} need ${runsNeeded} runs in ${ballsLeft} balls | RRR: ${rrr}`;
}

// ── Teams ─────────────────────────────────────────────────────────────────────

function team(id: string, name: string, shortName: string): CricketTeam {
  const colors = TEAM_COLORS[name] ?? TEAM_COLORS['default'];
  return { id, name, shortName, primaryColor: colors.primary, secondaryColor: colors.secondary };
}

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

// ── Static event lists (completed innings) ────────────────────────────────────

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
];

const RCB_KKR_EVENTS: CricketEvent[] = [
  { id: 'f1', type: 'BOUNDARY_SIX', over: 1, ball: 6, batsman: 'Virat Kohli', bowler: 'Varun Chakravarthy', team: 'home', runs: 6, description: 'Kohli hits the first ball of the over for six!' },
  { id: 'f2', type: 'CENTURY', over: 16, ball: 2, batsman: 'Virat Kohli', team: 'home', description: '100 off 58 balls! Kohli brings up a T20 century — the crowd goes wild!' },
  { id: 'f3', type: 'WICKET', over: 18, ball: 3, batsman: 'Virat Kohli', bowler: 'Sunil Narine', team: 'home', description: 'Kohli b Narine 112(63) — what a knock!' },
  { id: 'f4', type: 'INNINGS_END', team: 'home', description: 'RCB post 214/4 (20 ov) — Target: 215' },
];

const IND_AUS_T20I_3_EVENTS: CricketEvent[] = [
  { id: 'g1', type: 'BOUNDARY_SIX', over: 2, ball: 4, batsman: 'Travis Head', bowler: 'Jasprit Bumrah', team: 'away', runs: 6, description: 'Travis Head smashes Bumrah for six!' },
  { id: 'g2', type: 'FIFTY', over: 8, ball: 2, batsman: 'Travis Head', team: 'away', description: 'Travis Head brings up 50 off 30 balls!' },
  { id: 'g3', type: 'CENTURY', over: 18, ball: 1, batsman: 'Travis Head', team: 'away', description: 'Travis Head smashes a T20I century — 100 off 55!' },
  { id: 'g4', type: 'INNINGS_END', team: 'away', description: 'Australia post 172/7 (20 ov) — Target: 173' },
  { id: 'g5', type: 'MATCH_START', team: 'home', description: 'India chase begins — Rohit Sharma and Shubman Gill open' },
];

// ── Provider ──────────────────────────────────────────────────────────────────

export class MockProvider implements CricketProvider {
  readonly name = 'Mock (demo data)';

  // Simulation anchor times — set once at construction so scores evolve
  // consistently across repeated getMatches() calls within a server process.
  private readonly cskChaseStartMs: number;  // CSK chasing MI's 185
  private readonly indChaseStartMs: number;  // India chasing AUS's 172
  private readonly kkrChaseStartMs: number;  // KKR chasing RCB's 214 (after break)

  // Unique integer seeds — keeps each innings' randomness independent.
  private static readonly SEED_CSK = 28_002;
  private static readonly SEED_IND =  3_002;
  private static readonly SEED_KKR = 29_002;

  constructor() {
    const now = Date.now();
    // Anchor each live innings so the demo starts mid-match:
    //   CSK: 54 balls (~9 overs) into their chase when the provider initialises
    //   IND: 60 balls (~10 overs) into their chase
    //   KKR: innings break — chase starts 3 real minutes from now
    this.cskChaseStartMs = now - 54 * BALL_MS;
    this.indChaseStartMs = now - 60 * BALL_MS;
    this.kkrChaseStartMs = now + 3 * 60 * 1000;
  }

  async getMatches(): Promise<CricketMatch[]> {
    return this.buildMatches(Date.now());
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    const live: Array<import('@/types').MatchStatus> = [
      'LIVE', 'INNINGS_BREAK', 'TOSS', 'DRINKS', 'LUNCH', 'TEA', 'STUMPS', 'RAIN_DELAY',
    ];
    return (await this.getMatches()).filter((m) => live.includes(m.status));
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    return (await this.getMatches()).filter((m) => m.status === 'UPCOMING');
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    return (await this.getMatches()).filter((m) => m.status === 'COMPLETED');
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    return (await this.getMatches()).find((m) => m.id === id) ?? null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private buildMatches(now: number): CricketMatch[] {
    const H = 60 * 60 * 1000;
    const D = 24 * H;

    // ── MI vs CSK: CSK chasing 186 ──────────────────────────────────────────
    const csk = simulateInnings(MockProvider.SEED_CSK, this.cskChaseStartMs, 20, 186, now);
    const miCskStatus = csk.isComplete ? 'COMPLETED' : 'LIVE';
    const miCskResult = csk.isComplete
      ? (csk.wonChase
          ? `CSK won by ${10 - csk.wickets} wickets`
          : `MI won by ${185 - csk.runs} runs`)
      : undefined;

    // ── IND vs AUS T20I 3: India chasing 173 ────────────────────────────────
    const ind = simulateInnings(MockProvider.SEED_IND, this.indChaseStartMs, 20, 173, now);
    const indAusStatus = ind.isComplete ? 'COMPLETED' : 'LIVE';
    const indAusResult = ind.isComplete
      ? (ind.wonChase
          ? `India won by ${10 - ind.wickets} wickets`
          : `Australia won by ${172 - ind.runs} runs`)
      : undefined;

    // ── RCB vs KKR: KKR chasing 215 (innings break → live) ──────────────────
    const kkrNotStarted = now < this.kkrChaseStartMs;
    const kkr = simulateInnings(MockProvider.SEED_KKR, this.kkrChaseStartMs, 20, 215, now);
    const rcbKkrStatus = kkrNotStarted ? 'INNINGS_BREAK' : kkr.isComplete ? 'COMPLETED' : 'LIVE';
    const rcbKkrResult = !kkrNotStarted && kkr.isComplete
      ? (kkr.wonChase
          ? `KKR won by ${10 - kkr.wickets} wickets`
          : `RCB won by ${214 - kkr.runs} runs`)
      : undefined;

    return [
      // ── LIVE → COMPLETED: MI vs CSK ───────────────────────────────────────
      {
        id: 'mock-ipl-28',
        name: 'MI vs CSK, IPL 2026 — Match 28',
        matchType: 'T20',
        status: miCskStatus,
        statusNote: !csk.isComplete ? chaseNote('CSK', 186, csk, 20) : undefined,
        result: miCskResult,
        venue: 'Wankhede Stadium, Mumbai',
        startTime: new Date(now - 80 * 60 * 1000),
        homeTeam: TEAMS.MI,
        awayTeam: TEAMS.CSK,
        homeScore: { runs: 185, wickets: 5, overs: 20, runRate: 9.25, inningNumber: 1, isComplete: true },
        awayScore: toScore(csk, 1),
        currentBatting: csk.isComplete ? undefined : 'away',
        series: 'IPL 2026',
        matchNumber: 28,
        toss: { winner: 'Mumbai Indians', decision: 'bat' },
        events: MI_CSK_EVENTS,
      },

      // ── LIVE → COMPLETED: IND vs AUS ──────────────────────────────────────
      {
        id: 'mock-ind-aus-t20i-3',
        name: 'IND vs AUS, 3rd T20I',
        matchType: 'T20',
        status: indAusStatus,
        statusNote: !ind.isComplete ? chaseNote('India', 173, ind, 20) : undefined,
        result: indAusResult,
        venue: 'Rajiv Gandhi International Stadium, Hyderabad',
        startTime: new Date(now - 100 * 60 * 1000),
        homeTeam: TEAMS.IND,
        awayTeam: TEAMS.AUS,
        homeScore: toScore(ind, 1),
        awayScore: { runs: 172, wickets: 7, overs: 20, runRate: 8.60, inningNumber: 1, isComplete: true },
        currentBatting: ind.isComplete ? undefined : 'home',
        series: 'India vs Australia T20I Series 2026',
        matchNumber: 3,
        toss: { winner: 'Australia', decision: 'bat' },
        events: IND_AUS_T20I_3_EVENTS,
      },

      // ── INNINGS_BREAK → LIVE → COMPLETED: RCB vs KKR ─────────────────────
      {
        id: 'mock-ipl-29',
        name: 'RCB vs KKR, IPL 2026 — Match 29',
        matchType: 'T20',
        status: rcbKkrStatus,
        statusNote: kkrNotStarted
          ? 'KKR chase target of 215 | Innings break'
          : !kkr.isComplete
            ? chaseNote('KKR', 215, kkr, 20)
            : undefined,
        result: rcbKkrResult,
        venue: 'M. Chinnaswamy Stadium, Bengaluru',
        startTime: new Date(now - 130 * 60 * 1000),
        homeTeam: TEAMS.RCB,
        awayTeam: TEAMS.KKR,
        homeScore: { runs: 214, wickets: 4, overs: 20, runRate: 10.70, inningNumber: 1, isComplete: true },
        awayScore: kkrNotStarted ? undefined : toScore(kkr, 1),
        currentBatting: (kkrNotStarted || kkr.isComplete) ? undefined : 'away',
        series: 'IPL 2026',
        matchNumber: 29,
        toss: { winner: 'Royal Challengers Bengaluru', decision: 'bat' },
        events: RCB_KKR_EVENTS,
      },

      // ── COMPLETED: SRH vs DC ──────────────────────────────────────────────
      {
        id: 'mock-ipl-27',
        name: 'SRH vs DC, IPL 2026 — Match 27',
        matchType: 'T20',
        status: 'COMPLETED',
        result: 'SRH won by 7 wickets',
        venue: 'Rajiv Gandhi International Stadium, Hyderabad',
        startTime: new Date(now - 25 * H),
        homeTeam: TEAMS.SRH,
        awayTeam: TEAMS.DC,
        homeScore: { runs: 172, wickets: 3, overs: 18.2, runRate: 9.40, inningNumber: 1, isComplete: true },
        awayScore: { runs: 171, wickets: 8, overs: 20, runRate: 8.55, inningNumber: 1, isComplete: true },
        currentBatting: undefined,
        series: 'IPL 2026',
        matchNumber: 27,
        toss: { winner: 'Delhi Capitals', decision: 'bat' },
        events: [
          { id: 'h1', type: 'WICKET', over: 6, ball: 2, batsman: 'David Warner', bowler: 'Bhuvneshwar Kumar', team: 'away', description: 'Warner b Bhuvneshwar 33(22)' },
          { id: 'h2', type: 'FIFTY', over: 11, ball: 4, batsman: 'Axar Patel', team: 'away', description: 'Axar Patel slaps his fifty!' },
          { id: 'h3', type: 'BOUNDARY_SIX', over: 15, ball: 3, batsman: 'Heinrich Klaasen', bowler: 'Axar Patel', team: 'home', runs: 6, description: 'Klaasen clears the rope effortlessly' },
          { id: 'h4', type: 'WICKET', over: 19, ball: 5, batsman: 'Tristan Stubbs', bowler: 'Kuldeep Yadav', team: 'away', description: 'Stubbs c Klaasen b Kuldeep 29(19)' },
        ],
      },

      // ── COMPLETED: IND vs AUS 1st T20I ───────────────────────────────────
      {
        id: 'mock-ind-aus-t20i-1',
        name: 'IND vs AUS, 1st T20I',
        matchType: 'T20',
        status: 'COMPLETED',
        result: 'India won by 2 wickets',
        venue: 'Eden Gardens, Kolkata',
        startTime: new Date(now - 3 * D),
        homeTeam: TEAMS.IND,
        awayTeam: TEAMS.AUS,
        homeScore: { runs: 188, wickets: 8, overs: 20, runRate: 9.40, inningNumber: 1, isComplete: true },
        awayScore: { runs: 185, wickets: 6, overs: 20, runRate: 9.25, inningNumber: 1, isComplete: true },
        currentBatting: undefined,
        series: 'India vs Australia T20I Series 2026',
        matchNumber: 1,
        events: [],
      },

      // ── COMPLETED: IND vs AUS 2nd T20I ───────────────────────────────────
      {
        id: 'mock-ind-aus-t20i-2',
        name: 'IND vs AUS, 2nd T20I',
        matchType: 'T20',
        status: 'COMPLETED',
        result: 'Australia won by 6 wickets',
        venue: 'M. A. Chidambaram Stadium, Chennai',
        startTime: new Date(now - 2 * D),
        homeTeam: TEAMS.IND,
        awayTeam: TEAMS.AUS,
        homeScore: { runs: 157, wickets: 9, overs: 20, runRate: 7.85, inningNumber: 1, isComplete: true },
        awayScore: { runs: 158, wickets: 4, overs: 17.4, runRate: 8.94, inningNumber: 1, isComplete: true },
        currentBatting: undefined,
        series: 'India vs Australia T20I Series 2026',
        matchNumber: 2,
        events: [],
      },

      // ── UPCOMING ──────────────────────────────────────────────────────────
      {
        id: 'mock-ipl-30',
        name: 'LSG vs GT, IPL 2026 — Match 30',
        matchType: 'T20',
        status: 'UPCOMING',
        venue: 'BRSABV Ekana Cricket Stadium, Lucknow',
        startTime: new Date(now + 5 * H),
        homeTeam: TEAMS.LSG,
        awayTeam: TEAMS.GT,
        series: 'IPL 2026',
        matchNumber: 30,
        events: [],
      },
      {
        id: 'mock-ipl-31',
        name: 'RR vs PBKS, IPL 2026 — Match 31',
        matchType: 'T20',
        status: 'UPCOMING',
        venue: 'Sawai Mansingh Stadium, Jaipur',
        startTime: new Date(now + D + 2 * H),
        homeTeam: TEAMS.RR,
        awayTeam: TEAMS.PBKS,
        series: 'IPL 2026',
        matchNumber: 31,
        events: [],
      },
      {
        id: 'mock-ind-aus-t20i-4',
        name: 'IND vs AUS, 4th T20I',
        matchType: 'T20',
        status: 'UPCOMING',
        venue: 'Narendra Modi Stadium, Ahmedabad',
        startTime: new Date(now + 2 * D),
        homeTeam: TEAMS.IND,
        awayTeam: TEAMS.AUS,
        series: 'India vs Australia T20I Series 2026',
        matchNumber: 4,
        events: [],
      },
      {
        id: 'mock-ind-eng-odi-1',
        name: 'IND vs ENG, 1st ODI',
        matchType: 'ODI',
        status: 'UPCOMING',
        venue: 'Wankhede Stadium, Mumbai',
        startTime: new Date(now + 5 * D),
        homeTeam: TEAMS.IND,
        awayTeam: TEAMS.ENG,
        series: 'India vs England ODI Series 2026',
        matchNumber: 1,
        events: [],
      },
    ];
  }
}
