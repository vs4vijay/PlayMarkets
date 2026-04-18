// CricketData provider — uses https://api.cricapi.com/v1/
// Free tier: 100 requests/day. Get your key at https://cricketdata.org/
//
// Relevant endpoints used:
//   GET /v1/currentMatches?apikey=KEY&offset=0   — all live + recent matches
//   GET /v1/matches?apikey=KEY&offset=0          — broader match list (scheduled)
//
// Response shape (currentMatches):
// {
//   status: "success",
//   data: [{
//     id, name, matchType, status, venue, date, dateTimeGMT,
//     teams: [string, string],
//     teamInfo: [{ name, shortname, img }],
//     score: [{ r, w, o, inning }],   // one entry per completed/ongoing innings
//     matchStarted, matchEnded
//   }]
// }

import type { CricketProvider } from './base';
import type { CricketMatch, CricketTeam, CricketScore, MatchType, MatchStatus } from '@/types';
import { TEAM_COLORS } from './teamColors';

interface CricketDataScore {
  r: number;
  w: number;
  o: number;
  inning: string;
}

interface CricketDataTeamInfo {
  name: string;
  shortname: string;
  img?: string;
}

interface CricketDataMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue?: string;
  date?: string;
  dateTimeGMT?: string;
  teams?: string[];
  teamInfo?: CricketDataTeamInfo[];
  score?: CricketDataScore[];
  matchStarted?: boolean;
  matchEnded?: boolean;
  series_id?: string;
}

interface CricketDataResponse {
  status: string;
  data?: CricketDataMatch[];
  info?: {
    hitsToday: number;
    hitsUsed: number;
    hitsLimit: number;
  };
}

export class CricketDataProvider implements CricketProvider {
  readonly name = 'CricketData (api.cricapi.com)';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async getMatches(): Promise<CricketMatch[]> {
    const [current, scheduled] = await Promise.allSettled([
      this.fetchCurrentMatches(),
      this.fetchScheduledMatches(),
    ]);

    const all: CricketMatch[] = [];
    if (current.status === 'fulfilled') all.push(...current.value);
    if (scheduled.status === 'fulfilled') {
      // Avoid duplicates by ID
      const existingIds = new Set(all.map((m) => m.id));
      for (const m of scheduled.value) {
        if (!existingIds.has(m.id)) all.push(m);
      }
    }
    return all;
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchCurrentMatches();
    return all.filter((m) => m.status === 'LIVE' || m.status === 'INNINGS_BREAK' || m.status === 'TOSS');
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchScheduledMatches();
    return all.filter((m) => m.status === 'UPCOMING');
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchCurrentMatches();
    return all.filter((m) => m.status === 'COMPLETED');
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    try {
      const url = `${this.baseUrl}/match_info?apikey=${this.apiKey}&id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { next: { revalidate: 30 } });
      if (!res.ok) return null;
      const json: { status: string; data?: CricketDataMatch } = await res.json();
      if (json.status !== 'success' || !json.data) return null;
      return this.normalizeMatch(json.data);
    } catch {
      return null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async fetchCurrentMatches(): Promise<CricketMatch[]> {
    const url = `${this.baseUrl}/currentMatches?apikey=${this.apiKey}&offset=0`;
    return this.fetchAndNormalize(url);
  }

  private async fetchScheduledMatches(): Promise<CricketMatch[]> {
    const url = `${this.baseUrl}/matches?apikey=${this.apiKey}&offset=0`;
    return this.fetchAndNormalize(url);
  }

  private async fetchAndNormalize(url: string): Promise<CricketMatch[]> {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      throw new Error(`CricketData API error: ${res.status} ${res.statusText}`);
    }
    const json: CricketDataResponse = await res.json();
    if (json.status !== 'success' || !json.data) return [];
    return json.data.map((m) => this.normalizeMatch(m));
  }

  private normalizeMatch(raw: CricketDataMatch): CricketMatch {
    const teams = raw.teamInfo ?? [];
    const homeTeamInfo = teams[0];
    const awayTeamInfo = teams[1];

    const homeTeam = this.buildTeam(homeTeamInfo, raw.teams?.[0]);
    const awayTeam = this.buildTeam(awayTeamInfo, raw.teams?.[1]);

    const status = this.normalizeStatus(raw);
    const matchType = this.normalizeMatchType(raw.matchType);

    // Map scores — inning string contains the team name
    const homeScore = this.extractScore(raw.score, homeTeam.name, 1);
    const awayScore = this.extractScore(raw.score, awayTeam.name, 1);

    // Second innings
    const homeScore2 = this.extractScore(raw.score, homeTeam.name, 2);
    const awayScore2 = this.extractScore(raw.score, awayTeam.name, 2);

    // For display use the latest / most recent innings
    const displayHomeScore = homeScore2 ?? homeScore;
    const displayAwayScore = awayScore2 ?? awayScore;

    return {
      id: raw.id,
      name: raw.name,
      matchType,
      status,
      result: status === 'COMPLETED' ? raw.status : undefined,
      statusNote: status === 'LIVE' ? raw.status : undefined,
      venue: raw.venue ?? 'TBD',
      startTime: raw.dateTimeGMT ? new Date(raw.dateTimeGMT + 'Z') : new Date(raw.date ?? Date.now()),
      homeTeam,
      awayTeam,
      homeScore: displayHomeScore,
      awayScore: displayAwayScore,
      currentBatting: this.inferBatting(raw, homeTeam.name),
      series: raw.series_id,
      events: [],
    };
  }

  private buildTeam(info: CricketDataTeamInfo | undefined, fallbackName?: string): CricketTeam {
    const name = info?.name ?? fallbackName ?? 'Unknown';
    const colors = TEAM_COLORS[name] ?? TEAM_COLORS['default'];
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      shortName: info?.shortname ?? name.slice(0, 3).toUpperCase(),
      logo: info?.img,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    };
  }

  private extractScore(
    scores: CricketDataScore[] | undefined,
    teamName: string,
    inningNumber: 1 | 2
  ): CricketScore | undefined {
    if (!scores) return undefined;
    // inning string: "India Inning 1", "Mumbai Indians Inning 2", etc.
    const inningStr = `Inning ${inningNumber}`;
    const match = scores.find(
      (s) => s.inning.includes(inningStr) && s.inning.toLowerCase().includes(teamName.toLowerCase().split(' ')[0].toLowerCase())
    );
    if (!match) return undefined;
    return {
      runs: match.r,
      wickets: match.w,
      overs: match.o,
      runRate: match.o > 0 ? Math.round((match.r / match.o) * 100) / 100 : 0,
      inningNumber,
      isComplete: match.w === 10 || (match.o % 1 === 0 && match.o > 0),
    };
  }

  private normalizeStatus(raw: CricketDataMatch): MatchStatus {
    if (!raw.matchStarted) return 'UPCOMING';
    if (raw.matchEnded) return 'COMPLETED';
    const s = raw.status?.toLowerCase() ?? '';
    if (s.includes('innings break') || s.includes('innings break')) return 'INNINGS_BREAK';
    if (s.includes('rain') || s.includes('delay')) return 'RAIN_DELAY';
    if (s.includes('toss')) return 'TOSS';
    return 'LIVE';
  }

  private normalizeMatchType(raw: string): MatchType {
    switch (raw?.toLowerCase()) {
      case 't20': return 'T20';
      case 'odi': return 'ODI';
      case 'test': return 'TEST';
      case 't10': return 'T10';
      default: return 'OTHER';
    }
  }

  private inferBatting(
    raw: CricketDataMatch,
    homeTeamName: string
  ): 'home' | 'away' | undefined {
    if (!raw.matchStarted || raw.matchEnded) return undefined;
    // The last score entry is the current innings
    const lastScore = raw.score?.[raw.score.length - 1];
    if (!lastScore) return undefined;
    return lastScore.inning.toLowerCase().includes(homeTeamName.toLowerCase().split(' ')[0].toLowerCase())
      ? 'home'
      : 'away';
  }
}
