// EntitySport provider — uses https://restapi.entitysport.com/v2/
// Free development token: ec471071441bb2ac538a0ff901abd249 (sample data only)
// Get a production token at https://entitysport.com/
//
// Relevant endpoints:
//   GET /v2/matches/?token=TOKEN&status=1   — upcoming  (status 1)
//   GET /v2/matches/?token=TOKEN&status=2   — live      (status 2)
//   GET /v2/matches/?token=TOKEN&status=3   — completed (status 3)
//   GET /v2/matches/{mid}/scorecard?token=TOKEN
//
// Response envelope:
// {
//   response: "OK",
//   status: 200,
//   data: {
//     items: [{
//       match_id, competition, teama, teamb, venue,
//       date_start, format, status, status_str, status_note,
//       teama_score: { run, wicket, over, score, runrate },
//       teamb_score: { ... }
//     }]
//   }
// }

import type { CricketProvider } from './base';
import type { CricketMatch, CricketTeam, CricketScore, MatchType, MatchStatus } from '@/types';
import { TEAM_COLORS } from './teamColors';

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface ESTeam {
  team_id: number;
  name: string;
  short_name: string;
  logo_url?: string;
}

interface ESScore {
  run?: number;
  wicket?: number;
  over?: string;   // "15.2"
  score?: string;  // "150/3 (15.2 ov)"
  runrate?: string;
}

interface ESVenue {
  name?: string;
  location?: string;
  country?: string;
}

interface ESCompetition {
  cid?: number;
  title?: string;
  type?: string;
  season?: string;
}

interface ESMatch {
  match_id: number;
  competition?: ESCompetition;
  teama?: ESTeam;
  teamb?: ESTeam;
  venue?: ESVenue;
  date_start?: string;       // ISO 8601 with offset
  date_start_ist?: string;
  format?: string;           // "T20", "ODI", "TEST"
  format_str?: string;
  status?: string;           // "Live", "Completed", "Scheduled"
  status_str?: string;
  status_note?: string;
  winning_team?: string;
  winning_team_id?: number;
  result?: string;
  teama_score?: ESScore;
  teamb_score?: ESScore;
}

interface ESResponse {
  response?: string;
  status?: number;
  data?: {
    items?: ESMatch[];
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class EntitySportProvider implements CricketProvider {
  readonly name = 'EntitySport (restapi.entitysport.com)';
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(token: string, baseUrl: string) {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  async getMatches(): Promise<CricketMatch[]> {
    const [live, upcoming, completed] = await Promise.allSettled([
      this.fetchByStatus(2),
      this.fetchByStatus(1),
      this.fetchByStatus(3),
    ]);

    const all: CricketMatch[] = [];
    if (live.status === 'fulfilled') all.push(...live.value);
    if (upcoming.status === 'fulfilled') all.push(...upcoming.value);
    if (completed.status === 'fulfilled') all.push(...completed.value);
    return all;
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    return this.fetchByStatus(2);
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    return this.fetchByStatus(1);
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    return this.fetchByStatus(3);
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    try {
      const url = `${this.baseUrl}/matches/${encodeURIComponent(id)}/scorecard?token=${this.token}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const json: ESResponse = await res.json();
      const item = json.data?.items?.[0];
      if (!item) return null;
      return this.normalizeMatch(item);
    } catch {
      return null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * status: 1 = upcoming, 2 = live, 3 = completed
   */
  private async fetchByStatus(status: 1 | 2 | 3): Promise<CricketMatch[]> {
    const url = `${this.baseUrl}/matches/?token=${this.token}&status=${status}&per_page=20&paged=1`;
    const cacheOpts = status === 2 ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } };
    const res = await fetch(url, cacheOpts);
    if (!res.ok) {
      throw new Error(`EntitySport API error: ${res.status} ${res.statusText}`);
    }
    const json: ESResponse = await res.json();
    if (json.response !== 'OK' || !json.data?.items) return [];
    return json.data.items.map((m) => this.normalizeMatch(m));
  }

  private normalizeMatch(raw: ESMatch): CricketMatch {
    const homeTeam = this.buildTeam(raw.teama);
    const awayTeam = this.buildTeam(raw.teamb);
    const status = this.normalizeStatus(raw.status_str ?? raw.status ?? '');
    const matchType = this.normalizeMatchType(raw.format_str ?? raw.format ?? '');

    return {
      id: String(raw.match_id),
      name: `${homeTeam.shortName} vs ${awayTeam.shortName}${raw.competition?.title ? ', ' + raw.competition.title : ''}`,
      matchType,
      status,
      statusNote: raw.status_note ?? undefined,
      result: raw.result ?? (status === 'COMPLETED' && raw.status_note ? raw.status_note : undefined),
      venue: [raw.venue?.name, raw.venue?.location].filter(Boolean).join(', ') || 'TBD',
      startTime: raw.date_start ? new Date(raw.date_start) : new Date(),
      homeTeam,
      awayTeam,
      homeScore: this.buildScore(raw.teama_score, 1),
      awayScore: this.buildScore(raw.teamb_score, 1),
      currentBatting: this.inferBatting(raw, status),
      series: raw.competition?.title,
      events: [],
    };
  }

  private buildTeam(info: ESTeam | undefined): CricketTeam {
    const name = info?.name ?? 'Unknown';
    const colors = TEAM_COLORS[name] ?? TEAM_COLORS['default'];
    return {
      id: String(info?.team_id ?? name.toLowerCase().replace(/\s+/g, '-')),
      name,
      shortName: info?.short_name ?? name.slice(0, 3).toUpperCase(),
      logo: info?.logo_url,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    };
  }

  private buildScore(raw: ESScore | undefined, inningNumber: 1 | 2): CricketScore | undefined {
    if (!raw || (raw.run === undefined && raw.wicket === undefined)) return undefined;
    const overs = parseFloat(raw.over ?? '0') || 0;
    const runs = raw.run ?? 0;
    return {
      runs,
      wickets: raw.wicket ?? 0,
      overs,
      runRate: raw.runrate ? parseFloat(raw.runrate) : (overs > 0 ? Math.round((runs / overs) * 100) / 100 : 0),
      inningNumber,
      isComplete: (raw.wicket ?? 0) === 10,
    };
  }

  private normalizeStatus(raw: string): MatchStatus {
    switch (raw.toLowerCase()) {
      case 'live': return 'LIVE';
      case 'completed':
      case 'result': return 'COMPLETED';
      case 'scheduled':
      case 'not started': return 'UPCOMING';
      case 'innings break': return 'INNINGS_BREAK';
      case 'rain delay': return 'RAIN_DELAY';
      case 'stumps': return 'STUMPS';
      case 'lunch': return 'LUNCH';
      case 'tea': return 'TEA';
      case 'toss': return 'TOSS';
      case 'abandoned': return 'ABANDONED';
      case 'cancelled': return 'CANCELLED';
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

  private inferBatting(raw: ESMatch, status: MatchStatus): 'home' | 'away' | undefined {
    if (status !== 'LIVE') return undefined;
    // If teama has a score but no runs yet for teamb, home is batting first
    const teamaRuns = raw.teama_score?.run;
    const teambRuns = raw.teamb_score?.run;
    if (teamaRuns !== undefined && teambRuns === undefined) return 'home';
    if (teambRuns !== undefined) return 'away';
    return undefined;
  }
}
