// Server-side API route — proxies cricket data from the configured provider.
// API keys stay on the server; clients call /api/matches instead of external APIs directly.
//
// GET /api/matches           — all matches
// GET /api/matches?filter=live
// GET /api/matches?filter=upcoming
// GET /api/matches?filter=recent
// GET /api/matches?id=MATCH_ID

import type { NextRequest } from 'next/server';
import { getProvider } from '@/lib/providers';
import type { CricketMatch } from '@/types';

// Dates are serialised as ISO strings over JSON; revive them on the client.
function serializeMatches(matches: CricketMatch[]) {
  return matches.map((m) => ({
    ...m,
    startTime: m.startTime.toISOString(),
  }));
}

// Prevent Next.js from caching the route response — live scores must always be fresh.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const id = searchParams.get('id');

    const provider = getProvider();

    if (id) {
      const match = await provider.getMatchById(id);
      if (!match) {
        return Response.json({ error: 'Match not found' }, { status: 404 });
      }
      return Response.json({ match: serializeMatches([match])[0], provider: provider.name });
    }

    let matches: CricketMatch[];
    switch (filter) {
      case 'live':
        matches = await provider.getLiveMatches();
        break;
      case 'upcoming':
        matches = await provider.getUpcomingMatches();
        break;
      case 'recent':
        matches = await provider.getRecentMatches();
        break;
      default:
        matches = await provider.getMatches();
    }

    return Response.json(
      { matches: serializeMatches(matches), provider: provider.name, total: matches.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[/api/matches] Error:', err);
    return Response.json(
      { error: 'Failed to fetch matches', detail: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
