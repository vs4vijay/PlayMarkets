// FreeWebAPI Cricket provider — uses unofficial-cricbuzz.p.rapidapi.com via RapidAPI
// Sign up for a free key at https://rapidapi.com/
// Subscribe to "Unofficial Cricbuzz" API (free tier available)
//
// Relevant endpoints:
//   GET /matches/list        — all current matches (live + recent + upcoming)
//   GET /matches/get-info?id=MATCH_ID
//   GET /matches/get-scorecard?id=MATCH_ID
//
// Response shape for /matches/list:
// {
//   "typeMatches": [{
//     "matchType": "International",
//     "seriesMatches": [{
//       "seriesAdWrapper": {
//         "seriesId": 123,
//         "seriesName": "India vs Australia",
//         "matches": [{
//           "matchInfo": {
//             "matchId": 456,
//             "seriesId": 123,
//             "seriesName": "India vs Australia T20I",
//             "matchDesc": "1st T20I",
//             "matchFormat": "T20",
//             "startDate": "1715000000000",   // epoch ms
//             "state": "In Progress",          // "In Progress" | "Complete" | "Preview" | "Toss"
//             "status": "India need 25 runs",
//             "team1": { "teamId": 6, "teamName": "India", "teamSName": "IND", "imageId": 38 },
//             "team2": { "teamId": 2, "teamName": "Australia", "teamSName": "AUS", "imageId": 40 },
//             "venueName": "Wankhede Stadium, Mumbai"
//           },
//           "matchScore": {
//             "team1Score": { "inngs1": { "inningsId": 1, "runs": 185, "wickets": 5, "overs": 20 } },
//             "team2Score": { "inngs1": { "inningsId": 1, "runs": 30,  "wickets": 1, "overs": 3.3 } }
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

interface FWATeam {
  teamId?: number;
  teamName?: string;
  teamSName?: string;
  imageId?: number;
}

interface FWAInnings {
  inningsId?: number;
  runs?: number;
  wickets?: number;
  overs?: number;
  isDeclared?: boolean;
}

interface FWAMatchScore {
  team1Score?: { inngs1?: FWAInnings; inngs2?: FWAInnings };
  team2Score?: { inngs1?: FWAInnings; inngs2?: FWAInnings };
}

interface FWAMatchInfo {
  matchId?: number;
  seriesId?: number;
  seriesName?: string;
  matchDesc?: string;
  matchFormat?: string;     // "T20", "ODI", "TEST"
  startDate?: string;       // epoch ms as string
  endDate?: string;
  state?: string;           // "In Progress" | "Complete" | "Preview" | "Toss"
  status?: string;          // human-readable status note
  team1?: FWATeam;
  team2?: FWATeam;
  venueName?: string;
}

interface FWAMatch {
  matchInfo?: FWAMatchInfo;
  matchScore?: FWAMatchScore;
}

interface FWASeriesAdWrapper {
  seriesId?: number;
  seriesName?: string;
  matches?: FWAMatch[];
}

interface FWATypeMatch {
  matchType?: string;
  seriesMatches?: Array<{ seriesAdWrapper?: FWASeriesAdWrapper }>;
}

interface FWAListResponse {
  typeMatches?: FWATypeMatch[];
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class FreeWebAPIProvider implements CricketProvider {
  readonly name = 'FreeWebAPI / Cricbuzz (unofficial-cricbuzz.p.rapidapi.com)';
  private readonly rapidApiKey: string;
  private readonly baseUrl: string;

  constructor(rapidApiKey: string, baseUrl: string) {
    this.rapidApiKey = rapidApiKey;
    this.baseUrl = baseUrl;
  }

  async getMatches(): Promise<CricketMatch[]> {
    return this.fetchAll();
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchAll();
    return all.filter((m) => ['LIVE', 'TOSS', 'INNINGS_BREAK', 'DRINKS', 'LUNCH', 'TEA', 'STUMPS', 'RAIN_DELAY'].includes(m.status));
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchAll();
    return all.filter((m) => m.status === 'UPCOMING');
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchAll();
    return all.filter((m) => m.status === 'COMPLETED');
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    try {
      const res = await fetch(`${this.baseUrl}/matches/get-info?id=${encodeURIComponent(id)}`, {
        headers: this.headers(),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const json: { matchInfo?: FWAMatchInfo; matchScore?: FWAMatchScore } = await res.json();
      if (!json.matchInfo) return null;
      return this.normalizeMatch({ matchInfo: json.matchInfo, matchScore: json.matchScore });
    } catch {
      return null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'X-RapidAPI-Key': this.rapidApiKey,
      'X-RapidAPI-Host': 'unofficial-cricbuzz.p.rapidapi.com',
    };
  }

  private async fetchAll(): Promise<CricketMatch[]> {
    const res = await fetch(`${this.baseUrl}/matches/list`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`FreeWebAPI error: ${res.status} ${res.statusText}`);
    const json: FWAListResponse = await res.json();
    return this.flattenMatches(json);
  }

  private flattenMatches(json: FWAListResponse): CricketMatch[] {
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

  private normalizeMatch(raw: FWAMatch): CricketMatch {
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
      statusNote: status === 'LIVE' ? info.status : undefined,
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

  private buildTeam(info: FWATeam | undefined): CricketTeam {
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
    teamScore: { inngs1?: FWAInnings; inngs2?: FWAInnings } | undefined,
    status: MatchStatus,
  ): CricketScore | undefined {
    if (!teamScore) return undefined;
    // Prefer 2nd innings for display if available and ongoing
    const inn = teamScore.inngs2 ?? teamScore.inngs1;
    if (!inn) return undefined;
    const inningNumber = teamScore.inngs2 ? 2 : 1;
    return this.buildScore(inn, inningNumber as 1 | 2, status);
  }

  private buildScore(inn: FWAInnings, inningNumber: 1 | 2, status: MatchStatus): CricketScore | undefined {
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
    score: FWAMatchScore | undefined,
    status: MatchStatus,
  ): 'home' | 'away' | undefined {
    if (status !== 'LIVE' || !score) return undefined;
    // Whichever team has an active (non-zero) 2nd innings is batting
    const t1inn2 = score.team1Score?.inngs2;
    const t2inn2 = score.team2Score?.inngs2;
    if (t1inn2 && t1inn2.runs !== undefined) return 'home';
    if (t2inn2 && t2inn2.runs !== undefined) return 'away';
    // Otherwise whichever team has 1st innings active
    if (score.team2Score?.inngs1?.runs !== undefined) return 'away';
    if (score.team1Score?.inngs1?.runs !== undefined) return 'home';
    return undefined;
  }
}
