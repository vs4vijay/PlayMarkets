import { getReactionStore } from '@/lib/storage';
import type { ReactionType } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json() as {
    matchId: string;
    type: ReactionType;
    userId: string;
    userName: string;
  };

  const { matchId, type, userId, userName } = body;
  if (!matchId || !type || !userId) {
    return Response.json({ error: 'matchId, type, userId required' }, { status: 400 });
  }

  const store = getReactionStore();
  const { added } = await store.toggle(matchId, userId, userName, type);
  const [counts, userReactions] = await Promise.all([
    store.getCounts(matchId),
    store.getUserReactions(matchId, userId),
  ]);

  return Response.json({ added, counts, userReactions });
}
