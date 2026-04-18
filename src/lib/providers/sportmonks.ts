// Sportmonks Cricket provider — https://cricket.sportmonks.com/api/v2.0
// Free trial available. Get your token at https://sportmonks.com/cricket
//
// Relevant endpoints:
//   GET /livescores?api_token=TOKEN&include=runs,localteam,visitorteam   — live matches
//   GET /fixtures?api_token=TOKEN&include=runs,localteam,visitorteam     — all fixtures
//   GET /fixtures/{id}?api_token=TOKEN&include=runs,localteam,visitorteam
//
// Response envelope: { data: [...], links: {...}, meta: {...} }
// Match shape:
// {
//   id, localteam_id, visitorteam_id, note,
//   status: "NS" | "1st Innings" | "2nd Innings" | "Inning Break" | "Finished" | "Abandoned",
//   type: "T20" | "ODI" | "Test",
//   starting_at, live: bool,
//   localteam: { id, name, code, image_path },
//   visitorteam: { id, name, code, image_path },
//   runs: [{ id, fixture_id, team_id, inning, score, wickets, overs }]
// }

import type { CricketProvider } from './base';
import type { CricketMatch, CricketTeam, CricketScore, MatchType, MatchStatus } from '@/types';
import { TEAM_COLORS } from './teamColors';

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface SMTeam {
  id: number;
  name: string;
  code?: string;
  image_path?: string;
}

interface SMRun {
  id?: number;
  fixture_id?: number;
  team_id?: number;
  inning: number;     // 1 or 2
  score?: number;
  wickets?: number;
  overs?: string;     // "20" or "19.3"
}

interface SMFixture {
  id: number;
  localteam_id?: number;
  visitorteam_id?: number;
  note?: string;
  status?: string;    // "NS", "1st Innings", "2nd Innings", "Inning Break", "Finished", "Abandoned"
  type?: string;      // "T20", "ODI", "Test", "T10"
  starting_at?: string;
  live?: boolean;
  localteam?: SMTeam;
  visitorteam?: SMTeam;
  runs?: SMRun[];
}

interface SMResponse {
  data?: SMFixture | SMFixture[];
  links?: { first?: string; last?: string };
  meta?: { pagination?: { total?: number } };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class SportmonksProvider implements CricketProvider {
  readonly name = 'Sportmonks (cricket.sportmonks.com)';
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(token: string, baseUrl: string) {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  async getMatches(): Promise<CricketMatch[]> {
    const [live, all] = await Promise.allSettled([
      this.fetchLivescores(),
      this.fetchFixtures(),
    ]);

    const result: CricketMatch[] = [];
    if (live.status === 'fulfilled') result.push(...live.value);

    if (all.status === 'fulfilled') {
      const liveIds = new Set(result.map((m) => m.id));
      for (const m of all.value) {
        if (!liveIds.has(m.id)) result.push(m);
      }
    }
    return result;
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    return this.fetchLivescores();
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchFixtures();
    return all.filter((m) => m.status === 'UPCOMING');
  }

  async getRecentMatches(): Promise<CricketMatch[]> {
    const all = await this.fetchFixtures();
    return all.filter((m) => m.status === 'COMPLETED');
  }

  async getMatchById(id: string): Promise<CricketMatch | null> {
    try {
      const url = this.url(`/fixtures/${encodeURIComponent(id)}`, { include: 'runs,localteam,visitorteam' });
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const json: SMResponse = await res.json();
      if (!json.data || Array.isArray(json.data)) return null;
      return this.normalizeMatch(json.data);
    } catch {
      return null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private url(path: string, params: Record<string, string> = {}): string {
    const qs = new URLSearchParams({ api_token: this.token, ...params });
    return `${this.baseUrl}${path}?${qs}`;
  }

  private async fetchLivescores(): Promise<CricketMatch[]> {
    const url = this.url('/livescores', { include: 'runs,localteam,visitorteam' });
    return this.fetchAndNormalize(url, true);
  }

  private async fetchFixtures(): Promise<CricketMatch[]> {
    const url = this.url('/fixtures', { include: 'runs,localteam,visitorteam', per_page: '50' });
    return this.fetchAndNormalize(url, false);
  }

  private async fetchAndNormalize(url: string, live: boolean): Promise<CricketMatch[]> {
    const cacheOpts = live ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } };
    const res = await fetch(url, cacheOpts);
    if (!res.ok) throw new Error(`Sportmonks API error: ${res.status} ${res.statusText}`);
    const json: SMResponse = await res.json();
    const data = json.data;
    if (!data) return [];
    const items = Array.isArray(data) ? data : [data];
    return items.map((f) => this.normalizeMatch(f));
  }

  private normalizeMatch(raw: SMFixture): CricketMatch {
    const homeTeam = this.buildTeam(raw.localteam);
    const awayTeam = this.buildTeam(raw.visitorteam);
    const status = this.normalizeStatus(raw.status ?? '', raw.live ?? false);
    const matchType = this.normalizeMatchType(raw.type ?? '');

    const homeRun1 = raw.runs?.find((r) => r.team_id === raw.localteam_id && r.inning === 1);
    const homeRun2 = raw.runs?.find((r) => r.team_id === raw.localteam_id && r.inning === 2);
    const awayRun1 = raw.runs?.find((r) => r.team_id === raw.visitorteam_id && r.inning === 1);
    const awayRun2 = raw.runs?.find((r) => r.team_id === raw.visitorteam_id && r.inning === 2);

    return {
      id: String(raw.id),
      name: `${homeTeam.shortName} vs ${awayTeam.shortName}`,
      matchType,
      status,
      statusNote: raw.status && status === 'LIVE' ? raw.status : undefined,
      result: status === 'COMPLETED' ? (raw.note ?? undefined) : undefined,
      venue: 'TBD',
      startTime: raw.starting_at ? new Date(raw.starting_at) : new Date(),
      homeTeam,
      awayTeam,
      homeScore: this.buildScore(homeRun2 ?? homeRun1, homeRun2 ? 2 : 1),
      awayScore: this.buildScore(awayRun2 ?? awayRun1, awayRun2 ? 2 : 1),
      currentBatting: this.inferBatting(raw),
      events: [],
    };
  }

  private buildTeam(info: SMTeam | undefined): CricketTeam {
    const name = info?.name ?? 'Unknown';
    const colors = TEAM_COLORS[name] ?? TEAM_COLORS['default'];
    return {
      id: String(info?.id ?? name.toLowerCase().replace(/\s+/g, '-')),
      name,
      shortName: info?.code ?? name.slice(0, 3).toUpperCase(),
      logo: info?.image_path,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    };
  }

  private buildScore(run: SMRun | undefined, inningNumber: 1 | 2): CricketScore | undefined {
    if (!run) return undefined;
    const overs = parseFloat(run.overs ?? '0') || 0;
    const runs = run.score ?? 0;
    return {
      runs,
      wickets: run.wickets ?? 0,
      overs,
      runRate: overs > 0 ? Math.round((runs / overs) * 100) / 100 : 0,
      inningNumber,
      isComplete: (run.wickets ?? 0) === 10 || (overs > 0 && String(run.overs) === String(Math.floor(overs))),
    };
  }

  private normalizeStatus(raw: string, live: boolean): MatchStatus {
    if (live) {
      const r = raw.toLowerCase();
      if (r.includes('inning break')) return 'INNINGS_BREAK';
      if (r.includes('rain') || r.includes('delay')) return 'RAIN_DELAY';
      if (r.includes('stumps')) return 'STUMPS';
      if (r.includes('lunch')) return 'LUNCH';
      if (r.includes('tea')) return 'TEA';
      return 'LIVE';
    }
    switch (raw) {
      case 'NS': return 'UPCOMING';
      case 'Finished': return 'COMPLETED';
      case 'Abandoned': return 'ABANDONED';
      case 'Inning Break': return 'INNINGS_BREAK';
      default:
        if (raw.includes('Innings')) return 'LIVE';
        return 'UPCOMING';
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

  private inferBatting(raw: SMFixture): 'home' | 'away' | undefined {
    if (!raw.live) return undefined;
    // The last innings entry is the current one
    const runs = raw.runs ?? [];
    if (runs.length === 0) return undefined;
    const lastRun = runs[runs.length - 1];
    return lastRun.team_id === raw.localteam_id ? 'home' : 'away';
  }
}
