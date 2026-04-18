import { getReactionStore } from '@/lib/storage';
import type { ReactionType } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? '';

  const store = getReactionStore();
  const [counts, userReactions] = await Promise.all([
    store.getCounts(matchId),
    userId ? store.getUserReactions(matchId, userId) : Promise.resolve([] as ReactionType[]),
  ]);

  return Response.json({ counts, userReactions });
}
