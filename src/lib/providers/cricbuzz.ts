// Cricbuzz Unofficial provider — uses cricbuzz-cricket.p.rapidapi.com via RapidAPI
// Sign up for a free key at https://rapidapi.com/
// Subscribe to "cricbuzz-cricket" API (free tier available)
//
// Relevant endpoints:
//   GET /matches/v1/live      — live matches
//   GET /matches/v1/recent    — recently completed matches
//   GET /matches/v1/upcoming  — upcoming matches
//
// Response shape (all three endpoints share the same envelope):
// {
//   "typeMatches": [{
//     "matchType": "International",
//     "seriesMatches": [{
//       "seriesAdWrapper": {
//         "seriesId": 123,
//         "seriesName": "IPL 2026",
//         "matches": [{
//           "matchInfo": {
//             "matchId": 456, "seriesId": 123, "seriesName": "IPL 2026",
//             "matchDesc": "1st Match", "matchFormat": "T20",
//             "startDate": "1715000000000",   // epoch ms as string
//             "state": "In Progress",          // "In Progress" | "Complete" | "Preview"
//             "status": "MI need 25 runs from 15 balls",
//             "team1": { "teamId": 5, "teamName": "Mumbai Indians", "teamSName": "MI" },
//             "team2": { "teamId": 4, "teamName": "Chennai Super Kings", "teamSName": "CSK" },
//             "venueName": "Wankhede Stadium, Mumbai"
//           },
//           "matchScore": {
//             "team1Score": {
//               "inngs1": { "inningsId": 1, "runs": 220, "wickets": 3, "overs": 20 }
//             },
//             "team2Score": {
//               "inngs1": { "inningsId": 1, "runs": 196, "wickets": 6, "overs": 17.3 }
//             }
//           }
//         }]
//       }
//     }]
//   }]
// }

import type { CricketProvider } from './base';
import type { CricketMatch, CricketTeam, CricketScore, MatchType, MatchStatus } from '@/types';
import { TEAM_COLORS } from './teamColors';

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface CBTeam {
  teamId?: number;
  teamName?: string;
  teamSName?: string;
  imageId?: number;
}

interface CBInnings {
  inningsId?: number;
  runs?: number;
  wickets?: number;
  overs?: number;
  isDeclared?: boolean;
  isForfeited?: boolean;
  ballNbr?: number;
}

interface CBMatchScore {
  team1Score?: { inngs1?: CBInnings; inngs2?: CBInnings };
  team2Score?: { inngs1?: CBInnings; inngs2?: CBInnings };
}

interface CBMatchInfo {
  matchId?: number;
  seriesId?: number;
  seriesName?: string;
  matchDesc?: string;
  matchFormat?: string;   // "T20", "ODI", "TEST"
  startDate?: string;     // epoch ms as string
  endDate?: string;
  state?: string;         // "In Progress" | "Complete" | "Preview" | "Toss"
  status?: string;        // e.g. "India won by 25 runs"
  team1?: CBTeam;
  team2?: CBTeam;
  venueName?: string;
  venueId?: number;
}

interface CBMatch {
  matchInfo?: CBMatchInfo;
  matchScore?: CBMatchScore;
}

interface CBSeriesAdWrapper {
  seriesId?: number;
  seriesName?: string;
  matches?: CBMatch[];
}

interface CBTypeMatch {
  matchType?: string;
  seriesMatches?: Array<{ seriesAdWrapper?: CBSeriesAdWrapper }>;
}

interface CBResponse {
  typeMatches?: CBTypeMatch[];
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class CricbuzzProvider implements CricketProvider {
  readonly name = 'Cricbuzz Unofficial (cricbuzz-cricket.p.rapidapi.com)';
  private readonly rapidApiKey: string;
  private readonly baseUrl: string;

  constructor(rapidApiKey: string, baseUrl: string) {
    this.rapidApiKey = rapidApiKey;
    this.baseUrl = baseUrl;
  }

  async getMatches(): Promise<CricketMatch[]> {
    const [live, recent, upcoming] = await Promise.allSettled([
      this.fetchByType('live'),
      this.fetchByType('recent'),
      this.fetchByType('upcoming'),
    ]);

    const result: CricketMatch[] = [];
    if (live.status === 'fulfilled') result.push(...live.value);
    if (recent.status === 'fulfilled') result.push(...recent.value);
    if (upcoming.status === 'fulfilled') result.push(...upcoming.value);

    // De-duplicate by matchId
    const seen = new Set<string>();
    return result.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    return this.fetchByType('live');
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    return this.fetchByType('upcoming');
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    return this.fetchByType('recent');
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    // Cricbuzz unofficial doesn't have a single-match endpoint in most tiers;
    // we scan all matches and return the one that matches.
    try {
      const all = await this.getMatches();
      return all.find((m) => m.id === id) ?? null;
    } catch {
      return null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'X-RapidAPI-Key': this.rapidApiKey,
      'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
    };
  }

  private async fetchByType(type: 'live' | 'recent' | 'upcoming'): Promise<CricketMatch[]> {
    const res = await fetch(`${this.baseUrl}/matches/v1/${type}`, {
      headers: this.headers(),
      ...(type === 'live' ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }),
    });
    if (!res.ok) throw new Error(`Cricbuzz error: ${res.status} ${res.statusText}`);
    const json: CBResponse = await res.json();
    return this.flattenMatches(json);
  }

  private flattenMatches(json: CBResponse): CricketMatch[] {
    const result: CricketMatch[] = [];
    for (const typeMatch of json.typeMatches ?? []) {
      for (const series of typeMatch.seriesMatches ?? []) {
        for (const m of series.seriesAdWrapper?.matches ?? []) {
          if (m.matchInfo) result.push(this.normalizeMatch(m));
        }
      }
    }
    return result;
  }

  private normalizeMatch(raw: CBMatch): CricketMatch {
    const info = raw.matchInfo!;
    const score = raw.matchScore;

    const homeTeam = this.buildTeam(info.team1);
    const awayTeam = this.buildTeam(info.team2);
    const status = this.normalizeStatus(info.state ?? '');
    const matchType = this.normalizeMatchType(info.matchFormat ?? '');

    const homeScore = this.pickBestScore(score?.team1Score, status);
    const awayScore = this.pickBestScore(score?.team2Score, status);

    const startMs = info.startDate ? parseInt(info.startDate, 10) : Date.now();

    return {
      id: String(info.matchId ?? ''),
      name: `${homeTeam.name} vs ${awayTeam.name}${info.matchDesc ? ' — ' + info.matchDesc : ''}`,
      matchType,
      status,
      statusNote: ['LIVE', 'INNINGS_BREAK', 'TOSS'].includes(status) ? info.status : undefined,
      result: status === 'COMPLETED' ? info.status : undefined,
      venue: info.venueName ?? 'TBD',
      startTime: new Date(startMs),
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      series: info.seriesName,
      currentBatting: this.inferBatting(score, status),
      events: [],
    };
  }

  private buildTeam(info: CBTeam | undefined): CricketTeam {
    const name = info?.teamName ?? 'Unknown';
    const colors = TEAM_COLORS[name] ?? TEAM_COLORS['default'];
    return {
      id: String(info?.teamId ?? name.toLowerCase().replace(/\s+/g, '-')),
      name,
      shortName: info?.teamSName ?? name.slice(0, 3).toUpperCase(),
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    };
  }

  private pickBestScore(
    teamScore: { inngs1?: CBInnings; inngs2?: CBInnings } | undefined,
    status: MatchStatus,
  ): CricketScore | undefined {
    if (!teamScore) return undefined;
    const inn = teamScore.inngs2 ?? teamScore.inngs1;
    if (!inn) return undefined;
    const inningNumber: 1 | 2 = teamScore.inngs2 ? 2 : 1;
    return this.buildScore(inn, inningNumber, status);
  }

  private buildScore(inn: CBInnings, inningNumber: 1 | 2, status: MatchStatus): CricketScore | undefined {
    if (inn.runs === undefined) return undefined;
    const overs = inn.overs ?? 0;
    const runs = inn.runs ?? 0;
    return {
      runs,
      wickets: inn.wickets ?? 0,
      overs,
      runRate: overs > 0 ? Math.round((runs / overs) * 100) / 100 : 0,
      inningNumber,
      isComplete: (inn.wickets ?? 0) === 10 || inn.isDeclared === true || status === 'COMPLETED',
    };
  }

  private normalizeStatus(state: string): MatchStatus {
    switch (state) {
      case 'In Progress': return 'LIVE';
      case 'Complete':
      case 'Finished': return 'COMPLETED';
      case 'Preview':
      case 'upcoming': return 'UPCOMING';
      case 'Toss': return 'TOSS';
      case 'Innings Break': return 'INNINGS_BREAK';
      case 'Rain Delay': return 'RAIN_DELAY';
      case 'Stumps': return 'STUMPS';
      case 'Lunch': return 'LUNCH';
      case 'Tea': return 'TEA';
      case 'Abandoned': return 'ABANDONED';
      default: return 'UPCOMING';
    }
  }

  private normalizeMatchType(raw: string): MatchType {
    switch (raw.toUpperCase()) {
      case 'T20':
      case 'T20I': return 'T20';
      case 'ODI': return 'ODI';
      case 'TEST': return 'TEST';
      case 'T10': return 'T10';
      default: return 'OTHER';
    }
  }

  private inferBatting(
    score: CBMatchScore | undefined,
    status: MatchStatus,
  ): 'home' | 'away' | undefined {
    if (status !== 'LIVE' || !score) return undefined;
    // Active 2nd innings takes priority
    if (score.team1Score?.inngs2?.runs !== undefined) return 'home';
    if (score.team2Score?.inngs2?.runs !== undefined) return 'away';
    // Otherwise check 1st innings
    if (score.team2Score?.inngs1?.runs !== undefined) return 'away';
    if (score.team1Score?.inngs1?.runs !== undefined) return 'home';
    return undefined;
  }
}
