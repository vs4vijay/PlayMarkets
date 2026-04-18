// Roanuz Cricket provider — https://api.sports.roanuz.com/v5/
// Sign up at https://developer.roanuz.com/
//
// Auth flow (two-step):
//   1. POST /core/{project_key}/auth/   body: { api_key: KEY }
//      → { status: true, data: { token: "TOKEN", expiry: "...", expires_in: 3600 } }
//   2. Use header  rs-token: TOKEN  for all subsequent requests
//
// Featured matches endpoint:
//   GET /cricket/{project_key}/featured-matches/
//
// Response shape:
// {
//   "status": true,
//   "data": {
//     "matches": [{
//       "key": "match_key",
//       "name": "India vs Australia, 1st T20I",
//       "format": "t20",           // "t20" | "odi" | "test" | "t10"
//       "status": "live",          // "live" | "completed" | "scheduled" | "abandoned"
//       "status_str": "India need 25 runs from 15 balls",
//       "started_at": "2024-01-15T14:00:00Z",
//       "team_a": { "key": "india", "name": "India", "code": "IND", "logo_url": "..." },
//       "team_b": { "key": "australia", "name": "Australia", "code": "AUS", "logo_url": "..." },
//       "innings": [{
//         "key": "a1",
//         "batting_team_key": "india",
//         "bowling_team_key": "australia",
//         "runs": 185,
//         "wickets": 5,
//         "overs": "20.0",
//         "batting_first": true,
//         "is_completed": true
//       }],
//       "result": "India won by 25 runs",
//       "tournament": { "key": "t20wc_2024", "name": "T20 World Cup 2024" }
//     }]
//   }
// }
//
// Note: Free dev key uses project_key "dev_season_2014" — returns 2013/2014 sample data.

import type { CricketProvider } from './base';
import type { CricketMatch, CricketTeam, CricketScore, MatchType, MatchStatus } from '@/types';
import { TEAM_COLORS } from './teamColors';

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface RZTeam {
  key?: string;
  name?: string;
  code?: string;
  logo_url?: string;
}

interface RZInnings {
  key?: string;
  batting_team_key?: string;
  bowling_team_key?: string;
  runs?: number;
  wickets?: number;
  overs?: string;   // "19.3" or "20.0"
  batting_first?: boolean;
  is_completed?: boolean;
}

interface RZTournament {
  key?: string;
  name?: string;
}

interface RZMatch {
  key?: string;
  name?: string;
  format?: string;      // "t20" | "odi" | "test" | "t10"
  status?: string;      // "live" | "completed" | "scheduled" | "abandoned"
  status_str?: string;  // human-readable
  started_at?: string;  // ISO 8601
  team_a?: RZTeam;
  team_b?: RZTeam;
  innings?: RZInnings[];
  result?: string;
  tournament?: RZTournament;
}

interface RZAuthResponse {
  status?: boolean;
  data?: { token?: string; expiry?: string; expires_in?: number };
}

interface RZMatchesResponse {
  status?: boolean;
  data?: { matches?: RZMatch[] };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class RoanuzProvider implements CricketProvider {
  readonly name = 'Roanuz Cricket (api.sports.roanuz.com)';
  private readonly apiKey: string;
  private readonly projectKey: string;
  private readonly baseUrl: string;

  /** Cached auth token and its expiry */
  private _token: string | null = null;
  private _tokenExpiry: number = 0;

  constructor(apiKey: string, projectKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.projectKey = projectKey;
    this.baseUrl = baseUrl;
  }

  async getMatches(): Promise<CricketMatch[]> {
    return this.fetchFeaturedMatches();
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchFeaturedMatches();
    return all.filter((m) => ['LIVE', 'TOSS', 'INNINGS_BREAK', 'DRINKS', 'LUNCH', 'TEA', 'STUMPS', 'RAIN_DELAY'].includes(m.status));
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchFeaturedMatches();
    return all.filter((m) => m.status === 'UPCOMING');
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchFeaturedMatches();
    return all.filter((m) => m.status === 'COMPLETED');
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    const all = await this.fetchFeaturedMatches();
    return all.find((m) => m.id === id) ?? null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** Obtain a bearer token, refreshing if expired. */
  private async getToken(): Promise<string> {
    if (this._token && Date.now() < this._tokenExpiry) return this._token;

    const res = await fetch(`${this.baseUrl}/core/${encodeURIComponent(this.projectKey)}/auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey }),
    });
    if (!res.ok) throw new Error(`Roanuz auth error: ${res.status} ${res.statusText}`);
    const json: RZAuthResponse = await res.json();
    const token = json.data?.token;
    if (!token) throw new Error('Roanuz auth: no token in response');

    this._token = token;
    // Expire 60s before the actual expiry to be safe
    const expiresIn = (json.data?.expires_in ?? 3600) - 60;
    this._tokenExpiry = Date.now() + expiresIn * 1000;
    return token;
  }

  private async fetchFeaturedMatches(): Promise<CricketMatch[]> {
    const token = await this.getToken();
    const res = await fetch(
      `${this.baseUrl}/cricket/${encodeURIComponent(this.projectKey)}/featured-matches/`,
      {
        headers: { 'rs-token': token },
        cache: 'no-store',
      }
    );
    if (!res.ok) throw new Error(`Roanuz error: ${res.status} ${res.statusText}`);
    const json: RZMatchesResponse = await res.json();
    return (json.data?.matches ?? []).map((m) => this.normalizeMatch(m));
  }

  private normalizeMatch(raw: RZMatch): CricketMatch {
    const homeTeam = this.buildTeam(raw.team_a);
    const awayTeam = this.buildTeam(raw.team_b);
    const status = this.normalizeStatus(raw.status ?? '');
    const matchType = this.normalizeMatchType(raw.format ?? '');

    // Map innings to home/away scores
    const innings = raw.innings ?? [];
    const homeInn1 = innings.find((i) => i.batting_team_key === raw.team_a?.key && i.batting_first);
    const homeInn2 = innings.find((i) => i.batting_team_key === raw.team_a?.key && !i.batting_first);
    const awayInn1 = innings.find((i) => i.batting_team_key === raw.team_b?.key && i.batting_first);
    const awayInn2 = innings.find((i) => i.batting_team_key === raw.team_b?.key && !i.batting_first);

    const homeScore = this.buildScore(homeInn2 ?? homeInn1, homeInn2 ? 2 : 1);
    const awayScore = this.buildScore(awayInn2 ?? awayInn1, awayInn2 ? 2 : 1);

    return {
      id: raw.key ?? '',
      name: raw.name ?? `${homeTeam.name} vs ${awayTeam.name}`,
      matchType,
      status,
      statusNote: ['LIVE', 'INNINGS_BREAK', 'TOSS'].includes(status) ? raw.status_str : undefined,
      result: status === 'COMPLETED' ? (raw.result ?? raw.status_str) : undefined,
      venue: 'TBD',
      startTime: raw.started_at ? new Date(raw.started_at) : new Date(),
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      series: raw.tournament?.name,
      currentBatting: this.inferBatting(raw),
      events: [],
    };
  }

  private buildTeam(info: RZTeam | undefined): CricketTeam {
    const name = info?.name ?? 'Unknown';
    const colors = TEAM_COLORS[name] ?? TEAM_COLORS['default'];
    return {
      id: info?.key ?? name.toLowerCase().replace(/\s+/g, '-'),
      name,
      shortName: info?.code ?? name.slice(0, 3).toUpperCase(),
      logo: info?.logo_url,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    };
  }

  private buildScore(inn: RZInnings | undefined, inningNumber: 1 | 2): CricketScore | undefined {
    if (!inn || inn.runs === undefined) return undefined;
    const overs = parseFloat(inn.overs ?? '0') || 0;
    const runs = inn.runs ?? 0;
    return {
      runs,
      wickets: inn.wickets ?? 0,
      overs,
      runRate: overs > 0 ? Math.round((runs / overs) * 100) / 100 : 0,
      inningNumber,
      isComplete: inn.is_completed === true || (inn.wickets ?? 0) === 10,
    };
  }

  private normalizeStatus(raw: string): MatchStatus {
    switch (raw.toLowerCase()) {
      case 'live':
      case 'in_progress': return 'LIVE';
      case 'completed':
      case 'finished': return 'COMPLETED';
      case 'scheduled':
      case 'preview': return 'UPCOMING';
      case 'toss': return 'TOSS';
      case 'innings_break':
      case 'innings break': return 'INNINGS_BREAK';
      case 'rain_delay':
      case 'rain delay': return 'RAIN_DELAY';
      case 'stumps': return 'STUMPS';
      case 'lunch': return 'LUNCH';
      case 'tea': return 'TEA';
      case 'abandoned': return 'ABANDONED';
      default: return 'UPCOMING';
    }
  }

  private normalizeMatchType(raw: string): MatchType {
    switch (raw.toLowerCase()) {
      case 't20':
      case 't20i': return 'T20';
      case 'odi': return 'ODI';
      case 'test': return 'TEST';
      case 't10': return 'T10';
      default: return 'OTHER';
    }
  }

  private inferBatting(raw: RZMatch): 'home' | 'away' | undefined {
    if (!raw.innings?.length) return undefined;
    const last = raw.innings[raw.innings.length - 1];
    if (!last.batting_team_key) return undefined;
    return last.batting_team_key === raw.team_a?.key ? 'home' : 'away';
  }
}
